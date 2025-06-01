# クリーンアーキテクチャ - アプリケーションパターン

@version[1.0.0]
@owner[architecture-team]
@category[clean-architecture]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、クリーンアーキテクチャにおけるアプリケーション層の実装パターンを定義します。
ユースケースの実装と、ドメイン層とインターフェース層の橋渡しを行うパターンを提供します。

## 実装パターン

### 1. ユースケースパターン
```python
from dataclasses import dataclass
from typing import Protocol, List
from domain.repositories import OrderRepository, CustomerRepository
from domain.models import Order, Customer
from domain.value_objects import UniqueEntityId, Result

@dataclass
class CreateOrderRequest:
    customer_id: str
    items: List['OrderItemDTO']

@dataclass
class CreateOrderResponse:
    order_id: str

class CreateOrderUseCase(Protocol):
    def execute(self, request: CreateOrderRequest) -> Result[CreateOrderResponse]:
        pass

class CreateOrderInteractor:
    def __init__(
        self,
        order_repository: OrderRepository,
        customer_repository: CustomerRepository,
        unit_of_work: UnitOfWork
    ):
        self._order_repository = order_repository
        self._customer_repository = customer_repository
        self._unit_of_work = unit_of_work

    async def execute(
        self, 
        request: CreateOrderRequest
    ) -> Result[CreateOrderResponse]:
        customer = await self._customer_repository.find_by_id(request.customer_id)
        if not customer:
            return Result.fail('顧客が見つかりません')

        order = Order(UniqueEntityId())
        for item in request.items:
            result = order.add_item(OrderItem(item))
            if result.is_failure:
                return Result.fail(result.error)

        async with self._unit_of_work.transaction():
            try:
                await self._order_repository.save(order)
                return Result.ok(CreateOrderResponse(str(order.id)))
            except Exception as e:
                return Result.fail(f'注文の作成に失敗しました: {str(e)}')
```

### 2. サービス層パターン
```python
from dataclasses import dataclass
from typing import Protocol

@dataclass
class OrderApplicationService:
    create_order_use_case: CreateOrderUseCase
    cancel_order_use_case: CancelOrderUseCase

    async def create_order(
        self, 
        request: CreateOrderRequest
    ) -> Result[CreateOrderResponse]:
        return await self.create_order_use_case.execute(request)

    async def cancel_order(
        self, 
        request: CancelOrderRequest
    ) -> Result[None]:
        return await self.cancel_order_use_case.execute(request)
```

### 3. DTOパターン
```python
from dataclasses import dataclass
from typing import List
from decimal import Decimal

@dataclass(frozen=True)
class OrderItemDTO:
    product_id: str
    quantity: int
    price: Decimal

@dataclass(frozen=True)
class CreateOrderDTO:
    customer_id: str
    items: List[OrderItemDTO]

@dataclass(frozen=True)
class OrderResponseDTO:
    order_id: str
    total_amount: Decimal
    status: str
```

### 4. トランザクション管理パターン
```python
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Protocol

class UnitOfWork(Protocol):
    @asynccontextmanager
    async def transaction(self) -> AsyncGenerator[None, None]:
        pass

class OrderTransactionDecorator:
    def __init__(
        self,
        use_case: CreateOrderUseCase,
        unit_of_work: UnitOfWork
    ):
        self._use_case = use_case
        self._unit_of_work = unit_of_work

    async def execute(
        self, 
        request: CreateOrderRequest
    ) -> Result[CreateOrderResponse]:
        async with self._unit_of_work.transaction():
            try:
                result = await self._use_case.execute(request)
                if result.is_failure:
                    raise ValueError(result.error)
                return result
            except Exception as e:
                return Result.fail(f'トランザクションエラー: {str(e)}')
```

## 設計原則

### 1. 責務の分離
- ユースケースごとに独立したクラス
- ドメインロジックとアプリケーションロジックの分離
- インフラストラクチャの詳細からの独立

### 2. 依存関係の管理
- 依存性注入の活用
- インターフェースベースの設計（Protocolの活用）
- 外部サービスの抽象化

### 3. トランザクション管理
- 一貫性の確保
- ロールバック戦略
- 並行処理の制御（async/awaitの活用）

## アンチパターン

### 1. 避けるべきプラクティス
- ドメインロジックのアプリケーション層への漏洩
- トランザクション境界の不適切な設定
- DTOとドメインモデルの混在

### 2. 改善パターン
- ユースケースの明確な境界設定
- トランザクション管理の一元化
- DTOとドメインモデルの明確な変換

## レビューチェックリスト
- [ ] ユースケースが単一の責務を持っている
- [ ] トランザクション境界が適切に設定されている
- [ ] DTOとドメインモデルが適切に分離されている
- [ ] エラーハンドリングが適切に実装されている
- [ ] 依存関係が適切に注入されている

## 関連パターン
- ドメインパターン（`domain_patterns.md`）
- インターフェースパターン（`interface_patterns.md`）
- インフラストラクチャパターン（`infrastructure_patterns.md`） 
