# スケーラビリティパターン

@version[1.0.0]
@owner[architecture-team]
@category[scalability]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、システムのスケーラビリティを実現するための主要なパターンを定義します。
負荷分散、キャッシュ戦略、非同期処理などのパターンを提供します。

## 実装パターン

### 1. 負荷分散パターン
```python
from dataclasses import dataclass
from typing import List, Dict, Any
import random
import asyncio
from datetime import datetime

@dataclass
class ServiceNode:
    id: str
    host: str
    port: int
    health_score: float = 1.0
    last_health_check: datetime = datetime.now()

class LoadBalancer:
    def __init__(self, strategy: str = "round_robin"):
        self._nodes: List[ServiceNode] = []
        self._current_index = 0
        self._strategy = strategy
        self._node_stats: Dict[str, Dict[str, Any]] = {}

    def add_node(self, node: ServiceNode) -> None:
        self._nodes.append(node)
        self._node_stats[node.id] = {
            "requests": 0,
            "errors": 0,
            "latency": []
        }

    def remove_node(self, node_id: str) -> None:
        self._nodes = [n for n in self._nodes if n.id != node_id]
        self._node_stats.pop(node_id, None)

    async def get_next_node(self) -> ServiceNode:
        if not self._nodes:
            raise RuntimeError("No available nodes")

        if self._strategy == "round_robin":
            node = self._nodes[self._current_index]
            self._current_index = (self._current_index + 1) % len(self._nodes)
            return node
        elif self._strategy == "least_connections":
            return min(
                self._nodes,
                key=lambda n: self._node_stats[n.id]["requests"]
            )
        elif self._strategy == "weighted_random":
            weights = [n.health_score for n in self._nodes]
            return random.choices(self._nodes, weights=weights)[0]

        raise ValueError(f"Unknown strategy: {self._strategy}")

    async def update_stats(
        self,
        node_id: str,
        latency: float,
        error: bool = False
    ) -> None:
        stats = self._node_stats[node_id]
        stats["requests"] += 1
        stats["latency"].append(latency)
        if error:
            stats["errors"] += 1

        # ヘルススコアの更新
        node = next(n for n in self._nodes if n.id == node_id)
        error_rate = stats["errors"] / stats["requests"]
        avg_latency = sum(stats["latency"]) / len(stats["latency"])
        node.health_score = 1.0 - (error_rate * 0.5 + min(avg_latency / 1000, 0.5))
```

### 2. キャッシュ戦略パターン
```python
from typing import Optional, Any, Dict
import asyncio
from datetime import datetime, timedelta
import json

class CacheEntry:
    def __init__(self, value: Any, ttl: int):
        self.value = value
        self.expires_at = datetime.now() + timedelta(seconds=ttl)

    def is_expired(self) -> bool:
        return datetime.now() > self.expires_at

class MultiLevelCache:
    def __init__(
        self,
        local_cache_size: int = 1000,
        redis_client: Optional['Redis'] = None
    ):
        self._local_cache: Dict[str, CacheEntry] = {}
        self._local_cache_size = local_cache_size
        self._redis = redis_client
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        # L1: ローカルキャッシュをチェック
        if key in self._local_cache:
            entry = self._local_cache[key]
            if not entry.is_expired():
                return entry.value
            del self._local_cache[key]

        # L2: Redisキャッシュをチェック
        if self._redis:
            value = await self._redis.get(key)
            if value:
                data = json.loads(value)
                await self._update_local_cache(key, data, 300)  # 5分のTTL
                return data

        return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = 3600
    ) -> None:
        # L1: ローカルキャッシュを更新
        await self._update_local_cache(key, value, ttl)

        # L2: Redisキャッシュを更新
        if self._redis:
            await self._redis.setex(
                key,
                ttl,
                json.dumps(value)
            )

    async def _update_local_cache(
        self,
        key: str,
        value: Any,
        ttl: int
    ) -> None:
        async with self._lock:
            if len(self._local_cache) >= self._local_cache_size:
                # LRU: 最も古いエントリを削除
                oldest_key = min(
                    self._local_cache.keys(),
                    key=lambda k: self._local_cache[k].expires_at
                )
                del self._local_cache[oldest_key]
            self._local_cache[key] = CacheEntry(value, ttl)
```

### 3. 非同期処理パターン
```python
from typing import List, Callable, Any
import asyncio
from datetime import datetime
import logging

class TaskQueue:
    def __init__(
        self,
        max_workers: int = 10,
        retry_limit: int = 3
    ):
        self._queue: asyncio.Queue = asyncio.Queue()
        self._max_workers = max_workers
        self._retry_limit = retry_limit
        self._workers: List[asyncio.Task] = []
        self._logger = logging.getLogger(__name__)

    async def enqueue(
        self,
        task: Callable,
        *args,
        **kwargs
    ) -> None:
        await self._queue.put((task, args, kwargs, 0))  # 0はリトライ回数

    async def start(self) -> None:
        self._workers = [
            asyncio.create_task(self._worker())
            for _ in range(self._max_workers)
        ]

    async def stop(self) -> None:
        # 残りのタスクを処理
        await self._queue.join()
        
        # ワーカーを停止
        for worker in self._workers:
            worker.cancel()
        
        await asyncio.gather(
            *self._workers,
            return_exceptions=True
        )

    async def _worker(self) -> None:
        while True:
            try:
                task, args, kwargs, retry_count = await self._queue.get()
                try:
                    start_time = datetime.now()
                    await task(*args, **kwargs)
                    elapsed = (datetime.now() - start_time).total_seconds()
                    self._logger.info(
                        f"Task completed in {elapsed:.2f} seconds"
                    )
                except Exception as e:
                    if retry_count < self._retry_limit:
                        self._logger.warning(
                            f"Task failed, retrying ({retry_count + 1}/{self._retry_limit})"
                        )
                        await self._queue.put(
                            (task, args, kwargs, retry_count + 1)
                        )
                    else:
                        self._logger.error(
                            f"Task failed after {self._retry_limit} retries: {str(e)}"
                        )
                finally:
                    self._queue.task_done()
            except asyncio.CancelledError:
                break
```

## 設計原則

### 1. 水平スケーリング
- ステートレスなサービス設計
- 負荷分散の適切な実装
- セッション管理の分散化

### 2. キャッシュ戦略
- 多層キャッシュの活用
- キャッシュの一貫性管理
- 適切なTTL設定

### 3. 非同期処理
- バックグラウンドタスクの活用
- バッチ処理の最適化
- キュー管理

## アンチパターン

### 1. 避けるべきプラクティス
- 共有状態への過度な依存
- 同期処理の過剰な使用
- 不適切なキャッシュ戦略

### 2. 改善パターン
- ステートレスアーキテクチャの採用
- 非同期処理の積極的な活用
- 適切なキャッシュ層の設計

## レビューチェックリスト
- [ ] 水平スケーリングが考慮されている
- [ ] キャッシュ戦略が適切に実装されている
- [ ] 非同期処理が効果的に活用されている
- [ ] パフォーマンスのボトルネックが特定されている
- [ ] 監視とアラートが設定されている

## 関連パターン
- 分散システムパターン（`distributed_patterns.md`）
- レジリエンスパターン（`resilience_patterns.md`）
- セキュリティパターン（`security_patterns.md`） 