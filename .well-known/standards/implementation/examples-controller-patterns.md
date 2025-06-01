# コントローラー実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[interface-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、インターフェース層のコントローラー実装パターンを定義します。
HTTPリクエストの処理、入力のバリデーション、エラーハンドリングなどのパターンを提供します。

## 実装パターン

### 1. RESTコントローラーパターン
```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
from dependency_injector.wiring import inject, Provider

router = APIRouter(prefix="/api/v1/orders")

class OrderController:
    @inject
    def __init__(
        self,
        order_service: Provider[OrderApplicationService]
    ):
        self._order_service = order_service

    @router.post("/")
    async def create_order(
        self,
        request: CreateOrderRequest
    ) -> CreateOrderResponse:
        result = await self._order_service().create_order(request)
        if result.is_failure:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error
            )
        return result.value

    @router.get("/{order_id}")
    async def get_order(
        self,
        order_id: UUID
    ) -> OrderDetailsDTO:
        result = await self._order_service().get_order_details(order_id)
        if result.is_failure:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.error
            )
        return result.value

    @router.delete("/{order_id}")
    async def cancel_order(
        self,
        order_id: UUID,
        reason: Optional[str] = None
    ) -> None:
        result = await self._order_service().cancel_order(
            order_id,
            reason or "顧客によるキャンセル"
        )
        if result.is_failure:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error
            )
```

### 2. GraphQLコントローラーパターン
```python
from typing import Optional, List
from uuid import UUID
import strawberry
from strawberry.fastapi import GraphQLRouter
from dependency_injector.wiring import inject, Provider

@strawberry.type
class Order:
    id: UUID
    customer_id: UUID
    status: str
    total_amount: float
    items: List["OrderItem"]

@strawberry.type
class OrderItem:
    product_id: UUID
    name: str
    quantity: int
    unit_price: float

@strawberry.input
class CreateOrderInput:
    customer_id: UUID
    items: List["OrderItemInput"]
    shipping_address_id: UUID
    payment_method_id: UUID
    notes: Optional[str] = None

@strawberry.type
class Query:
    @strawberry.field
    async def order(
        self,
        order_id: UUID,
        order_service: OrderApplicationService
    ) -> Optional[Order]:
        result = await order_service.get_order_details(order_id)
        if result.is_failure:
            return None
        return result.value

    @strawberry.field
    async def orders(
        self,
        customer_id: Optional[UUID] = None,
        status: Optional[str] = None,
        order_service: OrderApplicationService
    ) -> List[Order]:
        criteria = OrderSearchCriteria(
            customer_id=customer_id,
            status=status
        )
        result = await order_service.search_orders(criteria)
        return result.value if result.is_success else []

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_order(
        self,
        input: CreateOrderInput,
        order_service: OrderApplicationService
    ) -> Order:
        result = await order_service.create_order(
            CreateOrderRequest.from_input(input)
        )
        if result.is_failure:
            raise ValueError(result.error)
        return result.value

    @strawberry.mutation
    async def cancel_order(
        self,
        order_id: UUID,
        reason: Optional[str] = None,
        order_service: OrderApplicationService
    ) -> bool:
        result = await order_service.cancel_order(order_id, reason)
        if result.is_failure:
            raise ValueError(result.error)
        return True
```

### 3. WebSocketコントローラーパターン
```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import logging

class OrderNotificationController:
    def __init__(self):
        self._active_connections: Dict[UUID, Set[WebSocket]] = {}
        self._logger = logging.getLogger(__name__)

    async def connect(
        self,
        websocket: WebSocket,
        customer_id: UUID
    ) -> None:
        await websocket.accept()
        if customer_id not in self._active_connections:
            self._active_connections[customer_id] = set()
        self._active_connections[customer_id].add(websocket)
        self._logger.info(f"WebSocket connected: {customer_id}")

    def disconnect(
        self,
        websocket: WebSocket,
        customer_id: UUID
    ) -> None:
        if customer_id in self._active_connections:
            self._active_connections[customer_id].remove(websocket)
            if not self._active_connections[customer_id]:
                del self._active_connections[customer_id]
        self._logger.info(f"WebSocket disconnected: {customer_id}")

    async def broadcast_order_status(
        self,
        customer_id: UUID,
        order_id: UUID,
        status: str
    ) -> None:
        if customer_id not in self._active_connections:
            return

        message = {
            "type": "ORDER_STATUS_UPDATED",
            "order_id": str(order_id),
            "status": status
        }

        for connection in self._active_connections[customer_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                self._logger.error(
                    f"Failed to send message: {str(e)}"
                )
                await connection.close()
```

## 設計原則

### 1. リクエスト処理
- 入力のバリデーション
- エラーハンドリング
- レスポンスの標準化

### 2. 依存関係の管理
- 依存性の注入
- サービス層との連携
- インターフェースの分離

### 3. プロトコル対応
- REST/GraphQL/WebSocket
- コンテンツネゴシエーション
- セキュリティ対策

## アンチパターン

### 1. 避けるべきプラクティス
- ビジネスロジックの混入
- 過度な責務の集中
- 不適切なエラー処理

### 2. 改善パターン
- 適切な責務の分離
- 標準的なエラー処理
- セキュリティの考慮

## レビューチェックリスト
- [ ] 入力のバリデーションが適切である
- [ ] エラーハンドリングが統一されている
- [ ] 依存関係が適切に管理されている
- [ ] セキュリティ対策が考慮されている
- [ ] レスポンスが標準化されている

## 関連パターン
- プレゼンターパターン（`presenter_patterns.md`）
- バリデーションパターン（`validation_patterns.md`）
- エラーハンドリングパターン（`error_handling_patterns.md`） 