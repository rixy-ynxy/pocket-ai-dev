# レジリエンスパターン

@version[1.0.0]
@owner[architecture-team]
@category[resilience]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、システムの回復力と耐障害性を高めるための主要なパターンを定義します。
サーキットブレーカー、リトライ、フォールバックなどのパターンを提供します。

## 実装パターン

### 1. サーキットブレーカーパターン
```python
from enum import Enum
from typing import Callable, Any, Optional
from datetime import datetime, timedelta
import asyncio
import logging

class CircuitState(Enum):
    CLOSED = "CLOSED"       # 正常状態
    OPEN = "OPEN"          # 遮断状態
    HALF_OPEN = "HALF_OPEN"  # 試行状態

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        reset_timeout: int = 60,
        half_open_timeout: int = 30
    ):
        self._failure_threshold = failure_threshold
        self._reset_timeout = reset_timeout
        self._half_open_timeout = half_open_timeout
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_failure_time: Optional[datetime] = None
        self._logger = logging.getLogger(__name__)

    async def execute(
        self,
        func: Callable,
        fallback: Optional[Callable] = None,
        *args,
        **kwargs
    ) -> Any:
        if not self._can_execute():
            if fallback:
                return await fallback(*args, **kwargs)
            raise RuntimeError("Circuit breaker is OPEN")

        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        except Exception as e:
            await self._on_failure(e)
            if fallback:
                return await fallback(*args, **kwargs)
            raise

    def _can_execute(self) -> bool:
        if self._state == CircuitState.CLOSED:
            return True

        if self._state == CircuitState.OPEN:
            if (datetime.now() - self._last_failure_time) > timedelta(seconds=self._reset_timeout):
                self._state = CircuitState.HALF_OPEN
                self._logger.info("Circuit breaker state changed to HALF_OPEN")
                return True
            return False

        return True  # HALF_OPEN state

    async def _on_success(self) -> None:
        if self._state == CircuitState.HALF_OPEN:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._last_failure_time = None
            self._logger.info("Circuit breaker state changed to CLOSED")

    async def _on_failure(self, exception: Exception) -> None:
        self._failure_count += 1
        self._last_failure_time = datetime.now()

        if self._state == CircuitState.HALF_OPEN or self._failure_count >= self._failure_threshold:
            self._state = CircuitState.OPEN
            self._logger.warning(
                f"Circuit breaker state changed to OPEN: {str(exception)}"
            )
```

### 2. リトライパターン
```python
from typing import Callable, Any, List, Optional
import asyncio
import random
import logging

class RetryStrategy:
    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 30.0,
        exponential: bool = True,
        jitter: bool = True
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential = exponential
        self.jitter = jitter
        self._logger = logging.getLogger(__name__)

    async def execute(
        self,
        func: Callable,
        *args,
        retry_on: Optional[List[type]] = None,
        **kwargs
    ) -> Any:
        last_exception = None
        attempt = 0

        while attempt < self.max_attempts:
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                if retry_on and not any(isinstance(e, exc) for exc in retry_on):
                    raise

                attempt += 1
                last_exception = e

                if attempt == self.max_attempts:
                    break

                delay = self._calculate_delay(attempt)
                self._logger.warning(
                    f"Attempt {attempt} failed: {str(e)}. "
                    f"Retrying in {delay:.2f} seconds..."
                )
                await asyncio.sleep(delay)

        raise last_exception

    def _calculate_delay(self, attempt: int) -> float:
        if self.exponential:
            delay = min(
                self.base_delay * (2 ** (attempt - 1)),
                self.max_delay
            )
        else:
            delay = self.base_delay

        if self.jitter:
            delay *= (0.5 + random.random())

        return delay
```

### 3. フォールバックパターン
```python
from typing import TypeVar, Generic, Callable, Optional, Any
from datetime import datetime, timedelta
import asyncio
import logging

T = TypeVar('T')

class CachedFallback(Generic[T]):
    def __init__(
        self,
        fallback_func: Callable[..., T],
        cache_ttl: int = 300
    ):
        self._fallback_func = fallback_func
        self._cache_ttl = cache_ttl
        self._cache: Optional[T] = None
        self._cache_time: Optional[datetime] = None
        self._lock = asyncio.Lock()
        self._logger = logging.getLogger(__name__)

    async def get_fallback(self, *args, **kwargs) -> T:
        async with self._lock:
            if self._is_cache_valid():
                self._logger.info("Using cached fallback value")
                return self._cache

            self._logger.info("Generating new fallback value")
            self._cache = await self._fallback_func(*args, **kwargs)
            self._cache_time = datetime.now()
            return self._cache

    def _is_cache_valid(self) -> bool:
        if self._cache is None or self._cache_time is None:
            return False
        return (datetime.now() - self._cache_time) < timedelta(seconds=self._cache_ttl)

class FallbackChain:
    def __init__(self, logger: Optional[logging.Logger] = None):
        self._strategies: List[Callable] = []
        self._logger = logger or logging.getLogger(__name__)

    def add_strategy(self, strategy: Callable) -> None:
        self._strategies.append(strategy)

    async def execute(self, *args, **kwargs) -> Any:
        last_error = None

        for strategy in self._strategies:
            try:
                return await strategy(*args, **kwargs)
            except Exception as e:
                self._logger.warning(
                    f"Strategy {strategy.__name__} failed: {str(e)}"
                )
                last_error = e

        if last_error:
            raise last_error
```

## 設計原則

### 1. 障害の分離
- コンポーネント間の依存関係の制御
- 障害の伝播防止
- 部分的な障害の許容

### 2. 回復メカニズム
- 自動リカバリー
- グレースフルデグラデーション
- ヘルスチェックと監視

### 3. フォールバック戦略
- 代替処理の提供
- キャッシュの活用
- 縮退運転モード

## アンチパターン

### 1. 避けるべきプラクティス
- タイムアウトの未設定
- 無制限のリトライ
- 不適切な障害伝播

### 2. 改善パターン
- 適切なタイムアウト設定
- スマートなリトライ戦略
- 効果的な障害分離

## レビューチェックリスト
- [ ] 障害分離が適切に実装されている
- [ ] リトライ戦略が適切に設定されている
- [ ] フォールバックメカニズムが実装されている
- [ ] タイムアウトが適切に設定されている
- [ ] 監視とアラートが設定されている

## 関連パターン
- 分散システムパターン（`distributed_patterns.md`）
- スケーラビリティパターン（`scalability_patterns.md`）
- セキュリティパターン（`security_patterns.md`） 