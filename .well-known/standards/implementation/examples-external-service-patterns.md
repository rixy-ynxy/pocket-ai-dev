# 外部サービス統合パターン

@version[1.0.0]
@owner[implementation-team]
@category[infrastructure-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、インフラストラクチャ層の外部サービス統合パターンを定義します。
外部APIとの通信、認証、エラーハンドリング、リトライ処理などのパターンを提供します。

## 実装パターン

### 1. HTTP APIクライアントパターン
```python
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
import logging

class APIClient(ABC):
    @abstractmethod
    async def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def post(self, path: str, data: Dict[str, Any]) -> Dict[str, Any]:
        pass

class HTTPClient(APIClient):
    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: float = 10.0,
        max_retries: int = 3
    ):
        self._base_url = base_url.rstrip('/')
        self._api_key = api_key
        self._timeout = timeout
        self._max_retries = max_retries
        self._logger = logging.getLogger(__name__)

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def get(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        url = f"{self._base_url}/{path.lstrip('/')}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    params=params,
                    headers=self._get_headers(),
                    timeout=self._timeout
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                self._logger.error(f"HTTP error occurred: {str(e)}")
                raise
            except Exception as e:
                self._logger.error(f"Unexpected error: {str(e)}")
                raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def post(
        self,
        path: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        url = f"{self._base_url}/{path.lstrip('/')}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    json=data,
                    headers=self._get_headers(),
                    timeout=self._timeout
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                self._logger.error(f"HTTP error occurred: {str(e)}")
                raise
            except Exception as e:
                self._logger.error(f"Unexpected error: {str(e)}")
                raise
```

### 2. 外部サービスアダプターパターン
```python
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
from datetime import datetime

@dataclass
class PaymentRequest:
    amount: Decimal
    currency: str
    card_token: str
    customer_id: str
    description: Optional[str] = None

@dataclass
class PaymentResponse:
    payment_id: str
    status: str
    amount: Decimal
    currency: str
    created_at: datetime

class PaymentService(ABC):
    @abstractmethod
    async def process_payment(
        self,
        request: PaymentRequest
    ) -> PaymentResponse:
        pass

class StripePaymentService(PaymentService):
    def __init__(self, api_client: HTTPClient):
        self._api_client = api_client
        self._logger = logging.getLogger(__name__)

    async def process_payment(
        self,
        request: PaymentRequest
    ) -> PaymentResponse:
        try:
            response = await self._api_client.post(
                "payments/create",
                {
                    "amount": str(request.amount),
                    "currency": request.currency,
                    "source": request.card_token,
                    "customer": request.customer_id,
                    "description": request.description
                }
            )
            
            return PaymentResponse(
                payment_id=response["id"],
                status=response["status"],
                amount=Decimal(response["amount"]),
                currency=response["currency"],
                created_at=datetime.fromisoformat(response["created"])
            )
            
        except Exception as e:
            self._logger.error(f"Payment processing failed: {str(e)}")
            raise PaymentProcessingError(f"Failed to process payment: {str(e)}")
```

### 3. サーキットブレーカーパターン
```python
from enum import Enum
from datetime import datetime, timedelta
import asyncio
from typing import Callable, TypeVar, ParamSpec

class CircuitState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

T = TypeVar("T")
P = ParamSpec("P")

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        reset_timeout: float = 60.0,
        half_open_timeout: float = 30.0
    ):
        self._failure_threshold = failure_threshold
        self._reset_timeout = reset_timeout
        self._half_open_timeout = half_open_timeout
        self._failure_count = 0
        self._last_failure_time: Optional[datetime] = None
        self._state = CircuitState.CLOSED
        self._lock = asyncio.Lock()

    def __call__(
        self,
        func: Callable[P, T]
    ) -> Callable[P, T]:
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            await self._check_state()
            try:
                result = await func(*args, **kwargs)
                await self._on_success()
                return result
            except Exception as e:
                await self._on_failure()
                raise

        return wrapper

    async def _check_state(self) -> None:
        async with self._lock:
            if self._state == CircuitState.OPEN:
                if (datetime.now() - self._last_failure_time) > timedelta(seconds=self._reset_timeout):
                    self._state = CircuitState.HALF_OPEN
                else:
                    raise CircuitBreakerOpenError("Circuit breaker is OPEN")
                    
            elif self._state == CircuitState.HALF_OPEN:
                if (datetime.now() - self._last_failure_time) > timedelta(seconds=self._half_open_timeout):
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0

    async def _on_success(self) -> None:
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.CLOSED
                self._failure_count = 0

    async def _on_failure(self) -> None:
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = datetime.now()
            
            if self._failure_count >= self._failure_threshold:
                self._state = CircuitState.OPEN
```

## 設計原則

### 1. 外部サービス統合の信頼性
- エラーハンドリング
- リトライ処理
- タイムアウト設定

### 2. 依存性の分離
- インターフェース抽象化
- アダプターパターン
- モック化の容易さ

### 3. 運用性
- ログ記録
- モニタリング
- デバッグ容易性

## アンチパターン

### 1. 避けるべきプラクティス
- タイムアウト設定の不備
- エラーハンドリングの不足
- 依存性の直接的な結合

### 2. 改善パターン
- 適切なタイムアウト設定
- 包括的なエラーハンドリング
- 依存性の抽象化

## レビューチェックリスト
- [ ] エラーハンドリングが適切に実装されている
- [ ] リトライ処理が実装されている
- [ ] タイムアウトが適切に設定されている
- [ ] 依存性が適切に分離されている
- [ ] ログ記録が十分である

## 関連パターン
- データベースパターン（`database_patterns.md`）
- メッセージングパターン（`messaging_patterns.md`）
- キャッシュパターン（`caching_patterns.md`） 