# エラーハンドリング実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[interface-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、インターフェース層のエラーハンドリング実装パターンを定義します。
例外の捕捉、エラーレスポンスの生成、ログ記録などのパターンを提供します。

## 実装パターン

### 1. グローバルエラーハンドリングパターン
```python
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import logging
from uuid import uuid4
from datetime import datetime

class AppException(Exception):
    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

class ErrorResponse:
    def __init__(
        self,
        message: str,
        code: str,
        details: Optional[Dict[str, Any]] = None,
        trace_id: Optional[str] = None
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        self.trace_id = trace_id or str(uuid4())
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": {
                "message": self.message,
                "code": self.code,
                "details": self.details,
                "trace_id": self.trace_id,
                "timestamp": self.timestamp
            }
        }

app = FastAPI()
logger = logging.getLogger(__name__)

@app.exception_handler(AppException)
async def app_exception_handler(
    request: Request,
    exc: AppException
) -> JSONResponse:
    error_response = ErrorResponse(
        message=exc.message,
        code=exc.code,
        details=exc.details
    )
    logger.error(
        f"Application error: {exc.message}",
        extra={
            "trace_id": error_response.trace_id,
            "code": exc.code,
            "details": exc.details,
            "path": request.url.path
        }
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.to_dict()
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception
) -> JSONResponse:
    error_response = ErrorResponse(
        message="Internal server error",
        code="internal_error",
        details={"type": exc.__class__.__name__}
    )
    logger.exception(
        f"Unhandled error: {str(exc)}",
        extra={
            "trace_id": error_response.trace_id,
            "path": request.url.path
        }
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.to_dict()
    )
```

### 2. ドメインエラーハンドリングパターン
```python
from enum import Enum
from typing import Optional, Dict, Any
from dataclasses import dataclass

class ErrorCategory(Enum):
    VALIDATION = "validation"
    BUSINESS_RULE = "business_rule"
    NOT_FOUND = "not_found"
    CONFLICT = "conflict"
    SYSTEM = "system"

@dataclass
class DomainError:
    message: str
    code: str
    category: ErrorCategory
    details: Optional[Dict[str, Any]] = None

class OrderError:
    @staticmethod
    def order_not_found(order_id: UUID) -> DomainError:
        return DomainError(
            message=f"注文 {order_id} が見つかりません",
            code="order_not_found",
            category=ErrorCategory.NOT_FOUND
        )

    @staticmethod
    def insufficient_stock(
        product_id: UUID,
        requested: int,
        available: int
    ) -> DomainError:
        return DomainError(
            message=f"商品の在庫が不足しています",
            code="insufficient_stock",
            category=ErrorCategory.BUSINESS_RULE,
            details={
                "product_id": str(product_id),
                "requested": requested,
                "available": available
            }
        )

    @staticmethod
    def invalid_status_transition(
        current: str,
        requested: str
    ) -> DomainError:
        return DomainError(
            message=f"無効なステータス遷移です",
            code="invalid_status_transition",
            category=ErrorCategory.BUSINESS_RULE,
            details={
                "current": current,
                "requested": requested
            }
        )

class Result:
    def __init__(
        self,
        value: Optional[Any] = None,
        error: Optional[DomainError] = None
    ):
        self._value = value
        self._error = error

    @property
    def is_success(self) -> bool:
        return self._error is None

    @property
    def is_failure(self) -> bool:
        return not self.is_success

    @property
    def value(self) -> Any:
        if self.is_failure:
            raise ValueError("Cannot access value of failed result")
        return self._value

    @property
    def error(self) -> Optional[DomainError]:
        return self._error

    @staticmethod
    def success(value: Any = None) -> "Result":
        return Result(value=value)

    @staticmethod
    def failure(error: DomainError) -> "Result":
        return Result(error=error)
```

### 3. トランザクションエラーハンドリングパターン
```python
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging

class TransactionManager:
    def __init__(self, session_factory):
        self._session_factory = session_factory
        self._logger = logging.getLogger(__name__)

    @asynccontextmanager
    async def transaction(self) -> AsyncGenerator[None, None]:
        session = self._session_factory()
        try:
            async with session.begin():
                self._logger.debug("Transaction started")
                yield
                self._logger.debug("Transaction committed")
        except Exception as e:
            self._logger.error(
                f"Transaction rolled back: {str(e)}",
                exc_info=True
            )
            raise
        finally:
            await session.close()
            self._logger.debug("Session closed")

class OrderService:
    def __init__(
        self,
        transaction_manager: TransactionManager,
        order_repository: OrderRepository,
        product_repository: ProductRepository
    ):
        self._transaction_manager = transaction_manager
        self._order_repository = order_repository
        self._product_repository = product_repository
        self._logger = logging.getLogger(__name__)

    async def create_order(
        self,
        request: CreateOrderRequest
    ) -> Result[Order]:
        try:
            async with self._transaction_manager.transaction():
                # 在庫の確認
                for item in request.items:
                    product = await self._product_repository.find_by_id(
                        item.product_id
                    )
                    if not product:
                        return Result.failure(
                            OrderError.product_not_found(item.product_id)
                        )
                    if product.stock < item.quantity:
                        return Result.failure(
                            OrderError.insufficient_stock(
                                item.product_id,
                                item.quantity,
                                product.stock
                            )
                        )

                # 注文の作成
                order = Order.create(request)
                await self._order_repository.save(order)

                # 在庫の更新
                for item in request.items:
                    product = await self._product_repository.find_by_id(
                        item.product_id
                    )
                    product.reduce_stock(item.quantity)
                    await self._product_repository.save(product)

                return Result.success(order)

        except Exception as e:
            self._logger.exception(
                "Failed to create order",
                extra={"request": request.dict()}
            )
            return Result.failure(
                DomainError(
                    message="注文の作成に失敗しました",
                    code="order_creation_failed",
                    category=ErrorCategory.SYSTEM,
                    details={"error": str(e)}
                )
            )
```

## 設計原則

### 1. エラーの階層化
- システムエラー
- ドメインエラー
- アプリケーションエラー

### 2. エラー情報の充実
- エラーメッセージ
- エラーコード
- 詳細情報

### 3. トレーサビリティの確保
- ログ記録
- トレースID
- コンテキスト情報

## アンチパターン

### 1. 避けるべきプラクティス
- 例外の握りつぶし
- 不適切なエラー変換
- 過度な例外伝播

### 2. 改善パターン
- 適切な例外ハンドリング
- エラー情報の適切な変換
- トランザクション境界の明確化

## レビューチェックリスト
- [ ] エラーが適切に階層化されている
- [ ] エラー情報が十分である
- [ ] トレーサビリティが確保されている
- [ ] セキュリティが考慮されている
- [ ] パフォーマンスが考慮されている

## 関連パターン
- バリデーションパターン（`validation_patterns.md`）
- ログ記録パターン（`logging_patterns.md`）
- トランザクションパターン（`transaction_patterns.md`） 