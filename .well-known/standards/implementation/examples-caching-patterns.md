# キャッシュ実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[infrastructure-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、インフラストラクチャ層のキャッシュ実装パターンを定義します。
メモリキャッシュ、分散キャッシュ、キャッシュ戦略などのパターンを提供します。

## 実装パターン

### 1. メモリキャッシュパターン
```python
from typing import Any, Dict, Optional, TypeVar, Generic
from datetime import datetime, timedelta
import threading
from dataclasses import dataclass
import logging

T = TypeVar('T')

@dataclass
class CacheEntry(Generic[T]):
    value: T
    expiry: datetime

class MemoryCache:
    def __init__(self, default_ttl: int = 300):
        self._cache: Dict[str, CacheEntry] = {}
        self._default_ttl = default_ttl
        self._lock = threading.Lock()
        self._logger = logging.getLogger(__name__)

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                return None

            entry = self._cache[key]
            if datetime.now() > entry.expiry:
                del self._cache[key]
                return None

            return entry.value

    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> None:
        with self._lock:
            expiry = datetime.now() + timedelta(
                seconds=ttl if ttl is not None else self._default_ttl
            )
            self._cache[key] = CacheEntry(value=value, expiry=expiry)

    def delete(self, key: str) -> None:
        with self._lock:
            self._cache.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def cleanup_expired(self) -> None:
        with self._lock:
            now = datetime.now()
            expired_keys = [
                key for key, entry in self._cache.items()
                if now > entry.expiry
            ]
            for key in expired_keys:
                del self._cache[key]
```

### 2. 分散キャッシュパターン
```python
from typing import Optional, Any
import aioredis
import pickle
import logging
from datetime import timedelta

class RedisCache:
    def __init__(
        self,
        redis_url: str,
        default_ttl: int = 300,
        namespace: str = "app"
    ):
        self._redis = aioredis.from_url(redis_url)
        self._default_ttl = default_ttl
        self._namespace = namespace
        self._logger = logging.getLogger(__name__)

    def _get_key(self, key: str) -> str:
        return f"{self._namespace}:{key}"

    async def get(self, key: str) -> Optional[Any]:
        try:
            value = await self._redis.get(self._get_key(key))
            if value is None:
                return None
            return pickle.loads(value)
        except Exception as e:
            self._logger.error(f"Error getting cache key {key}: {str(e)}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> None:
        try:
            serialized_value = pickle.dumps(value)
            await self._redis.set(
                self._get_key(key),
                serialized_value,
                ex=ttl if ttl is not None else self._default_ttl
            )
        except Exception as e:
            self._logger.error(f"Error setting cache key {key}: {str(e)}")

    async def delete(self, key: str) -> None:
        try:
            await self._redis.delete(self._get_key(key))
        except Exception as e:
            self._logger.error(f"Error deleting cache key {key}: {str(e)}")

    async def clear_namespace(self) -> None:
        try:
            pattern = f"{self._namespace}:*"
            cursor = 0
            while True:
                cursor, keys = await self._redis.scan(
                    cursor,
                    match=pattern
                )
                if keys:
                    await self._redis.delete(*keys)
                if cursor == 0:
                    break
        except Exception as e:
            self._logger.error(f"Error clearing namespace: {str(e)}")
```

### 3. キャッシュ戦略パターン
```python
from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Callable, Awaitable, Optional
from dataclasses import dataclass
import hashlib
import json
import logging

T = TypeVar('T')

@dataclass
class CacheConfig:
    ttl: int
    namespace: str
    key_prefix: str

class CacheStrategy(Generic[T], ABC):
    @abstractmethod
    async def get_or_set(
        self,
        key: str,
        getter: Callable[[], Awaitable[T]],
        ttl: Optional[int] = None
    ) -> T:
        pass

class ReadThroughCache(CacheStrategy[T]):
    def __init__(
        self,
        cache: RedisCache,
        config: CacheConfig
    ):
        self._cache = cache
        self._config = config
        self._logger = logging.getLogger(__name__)

    def _generate_key(self, key: str) -> str:
        return f"{self._config.key_prefix}:{key}"

    async def get_or_set(
        self,
        key: str,
        getter: Callable[[], Awaitable[T]],
        ttl: Optional[int] = None
    ) -> T:
        cache_key = self._generate_key(key)
        cached_value = await self._cache.get(cache_key)

        if cached_value is not None:
            self._logger.debug(f"Cache hit for key: {cache_key}")
            return cached_value

        self._logger.debug(f"Cache miss for key: {cache_key}")
        value = await getter()
        await self._cache.set(
            cache_key,
            value,
            ttl if ttl is not None else self._config.ttl
        )
        return value

class WriteAroundCache(CacheStrategy[T]):
    def __init__(
        self,
        cache: RedisCache,
        config: CacheConfig
    ):
        self._cache = cache
        self._config = config
        self._logger = logging.getLogger(__name__)

    def _generate_key(self, key: str) -> str:
        return f"{self._config.key_prefix}:{key}"

    async def get_or_set(
        self,
        key: str,
        getter: Callable[[], Awaitable[T]],
        ttl: Optional[int] = None
    ) -> T:
        value = await getter()
        cache_key = self._generate_key(key)
        
        # 非同期でキャッシュを更新
        asyncio.create_task(
            self._cache.set(
                cache_key,
                value,
                ttl if ttl is not None else self._config.ttl
            )
        )
        
        return value

class WriteThroughCache(CacheStrategy[T]):
    def __init__(
        self,
        cache: RedisCache,
        config: CacheConfig
    ):
        self._cache = cache
        self._config = config
        self._logger = logging.getLogger(__name__)

    def _generate_key(self, key: str) -> str:
        return f"{self._config.key_prefix}:{key}"

    async def get_or_set(
        self,
        key: str,
        getter: Callable[[], Awaitable[T]],
        ttl: Optional[int] = None
    ) -> T:
        value = await getter()
        cache_key = self._generate_key(key)
        
        # 同期的にキャッシュを更新
        await self._cache.set(
            cache_key,
            value,
            ttl if ttl is not None else self._config.ttl
        )
        
        return value
```

## 設計原則

### 1. キャッシュの一貫性
- データの整合性
- 更新戦略
- 有効期限管理

### 2. パフォーマンス
- アクセス速度
- メモリ使用量
- スケーラビリティ

### 3. 運用性
- モニタリング
- デバッグ容易性
- 障害復旧

## アンチパターン

### 1. 避けるべきプラクティス
- 無制限のキャッシュサイズ
- 適切でないTTL設定
- 更新戦略の不備

### 2. 改善パターン
- キャッシュサイズの制限
- 適切なTTL設定
- 明確な更新戦略

## レビューチェックリスト
- [ ] キャッシュの一貫性が保たれている
- [ ] パフォーマンスが考慮されている
- [ ] 運用性が確保されている
- [ ] エラーハンドリングが適切
- [ ] モニタリングが実装されている

## 関連パターン
- データベースパターン（`database_patterns.md`）
- 外部サービス統合パターン（`external_service_patterns.md`）
- パフォーマンス最適化パターン（`performance_patterns.md`） 