# クリーンアーキテクチャ - インターフェースパターン

@version[1.0.0]
@owner[architecture-team]
@category[clean-architecture]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、クリーンアーキテクチャにおけるインターフェース層の実装パターンを定義します。
外部とのインタラクションを管理し、アプリケーション層との適切な連携を実現するパターンを提供します。

## 実装パターン

### 1. コントローラーパターン
```python
from fastapi import APIRouter, Depends, HTTPException
from dependency_injector.wiring import inject, Provider
from application.services import OrderApplicationService
from domain.value_objects import Result

router = APIRouter(prefix="/orders")

class OrderController:
    @inject
    def __init__(self, order_service: Provider[OrderApplicationService]):
        self._order_service = order_service

    @router.post("/")
    async def create_order(
        self,
        request: CreateOrderRequestDTO
    ) -> CreateOrderResponseDTO:
        result = await self._order_service().create_order(
            CreateOrderRequest(
                customer_id=request.customer_id,
                items=request.items
            )
        )

        if result.is_failure:
            raise HTTPException(
                status_code=400,
                detail=result.error
            )

        return CreateOrderResponseDTO(
            order_id=result.value.order_id
        )

    @router.delete("/{order_id}")
    async def cancel_order(
        self,
        order_id: str
    ) -> None:
        result = await self._order_service().cancel_order(
            CancelOrderRequest(order_id=order_id)
        )

        if result.is_failure:
            raise HTTPException(
                status_code=400,
                detail=result.error
            )
```

### 2. プレゼンターパターン
```python
from typing import Protocol, Dict, Any, List
from dataclasses import dataclass
from domain.models import Order
from domain.value_objects import Money

class OrderPresenter(Protocol):
    def present(self, order: Order) -> Dict[str, Any]:
        pass

@dataclass
class OrderViewModel:
    id: str
    items: List[Dict[str, Any]]
    status: str
    total_amount: float

class OrderJsonPresenter:
    def present(self, order: Order) -> OrderViewModel:
        return OrderViewModel(
            id=str(order.id),
            items=[{
                'product_id': str(item.product_id),
                'quantity': item.quantity,
                'price': float(item.price.amount)
            } for item in order.items],
            status=order.status.value,
            total_amount=float(order.calculate_total().amount)
        )
```

### 3. バリデーションパターン
```python
from pydantic import BaseModel, Field, validator
from typing import List
from decimal import Decimal

class OrderItemDTO(BaseModel):
    product_id: str = Field(..., description="商品ID")
    quantity: int = Field(..., ge=1, description="数量")
    price: Decimal = Field(..., ge=0, description="価格")

    @validator('quantity')
    def validate_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError('数量は1以上である必要があります')
        return v

class CreateOrderRequestDTO(BaseModel):
    customer_id: str = Field(..., description="顧客ID")
    items: List[OrderItemDTO] = Field(..., min_items=1, description="注文商品リスト")

    @validator('items')
    def validate_items(cls, v: List[OrderItemDTO]) -> List[OrderItemDTO]:
        if not v:
            raise ValueError('商品は1つ以上指定する必要があります')
        return v
```

### 4. エラーハンドリングパターン
```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from typing import Union, Dict, Any

class DomainException(Exception):
    def __init__(self, message: str):
        self.message = message

class ApplicationException(Exception):
    def __init__(self, message: str):
        self.message = message

app = FastAPI()

@app.exception_handler(DomainException)
async def domain_exception_handler(
    request: Request,
    exc: DomainException
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            'status_code': 400,
            'message': exc.message,
            'error': 'Bad Request'
        }
    )

@app.exception_handler(ApplicationException)
async def application_exception_handler(
    request: Request,
    exc: ApplicationException
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            'status_code': 422,
            'message': exc.message,
            'error': 'Unprocessable Entity'
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(
    request: Request,
    exc: Exception
) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            'status_code': 500,
            'message': 'Internal server error',
            'error': 'Internal Server Error'
        }
    )
```

## 設計原則

### 1. 関心の分離
- プレゼンテーションロジックの分離
- バリデーションの一元管理（Pydanticの活用）
- エラーハンドリングの統一

### 2. 依存関係の制御
- アプリケーション層への依存のみ
- フレームワーク依存の局所化
- インフラストラクチャからの独立

### 3. データ変換
- DTOとドメインモデルの変換
- レスポンス形式の標準化
- バリデーションルールの一元管理

## アンチパターン

### 1. 避けるべきプラクティス
- ドメインロジックの漏洩
- 過度なプレゼンテーションロジック
- 不適切なエラーハンドリング

### 2. 改善パターン
- プレゼンテーションの責務の明確化
- 適切なバリデーション層の設置
- 統一的なエラーハンドリング

## レビューチェックリスト
- [ ] プレゼンテーションロジックが適切に分離されている
- [ ] バリデーションが一元管理されている
- [ ] エラーハンドリングが統一されている
- [ ] DTOの変換が適切に行われている
- [ ] フレームワーク依存が局所化されている

## 関連パターン
- ドメインパターン（`domain_patterns.md`）
- アプリケーションパターン（`application_patterns.md`）
- インフラストラクチャパターン（`infrastructure_patterns.md`） 
