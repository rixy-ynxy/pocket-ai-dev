# ユースケース実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[application-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、アプリケーション層のユースケース実装パターンを定義します。
ユースケースの構造化、入出力の管理、トランザクション制御などのパターンを提供します。

## 実装パターン

### 1. 基本ユースケースパターン
```python
from dataclasses import dataclass
from typing import Protocol, Optional
from datetime import datetime
from uuid import UUID

@dataclass
class CreateOrderRequest:
    customer_id: UUID
    items: List[OrderItemDTO]
    shipping_address_id: UUID
    payment_method_id: UUID

@dataclass
class CreateOrderResponse:
    order_id: UUID
    total_amount: Decimal
    estimated_delivery_date: datetime

class CreateOrderUseCase(Protocol):
    async def execute(
        self,
        request: CreateOrderRequest
    ) -> Result[CreateOrderResponse]:
        pass

class CreateOrderInteractor:
    def __init__(
        self,
        order_repository: OrderRepository,
        customer_repository: CustomerRepository,
        product_repository: ProductRepository,
        unit_of_work: UnitOfWork
    ):
        self._order_repository = order_repository
        self._customer_repository = customer_repository
        self._product_repository = product_repository
        self._unit_of_work = unit_of_work

    async def execute(
        self,
        request: CreateOrderRequest
    ) -> Result[CreateOrderResponse]:
        try:
            # 顧客の検証
            customer = await self._customer_repository.find_by_id(
                request.customer_id
            )
            if not customer:
                return Result.fail("顧客が見つかりません")

            # 配送先住所の検証
            shipping_address = customer.get_address(request.shipping_address_id)
            if not shipping_address:
                return Result.fail("配送先住所が見つかりません")

            # 支払い方法の検証
            payment_method = customer.get_payment_method(
                request.payment_method_id
            )
            if not payment_method:
                return Result.fail("支払い方法が見つかりません")

            # 注文の作成
            order = Order(
                customer_id=customer.id,
                shipping_address=shipping_address,
                payment_method=payment_method
            )

            # 商品の検証と追加
            for item in request.items:
                product = await self._product_repository.find_by_id(
                    item.product_id
                )
                if not product:
                    return Result.fail(f"商品が見つかりません: {item.product_id}")
                
                result = order.add_item(
                    OrderItem(
                        product_id=product.id,
                        quantity=item.quantity,
                        price=product.price
                    )
                )
                if result.is_failure:
                    return result

            # トランザクション内での保存
            async with self._unit_of_work.transaction():
                await self._order_repository.save(order)

            return Result.ok(
                CreateOrderResponse(
                    order_id=order.id,
                    total_amount=order.total_amount,
                    estimated_delivery_date=order.estimate_delivery_date()
                )
            )

        except Exception as e:
            return Result.fail(f"注文の作成に失敗しました: {str(e)}")
```

### 2. CRUD操作パターン
```python
from typing import Optional, List
from dataclasses import dataclass

@dataclass
class ProductDTO:
    id: Optional[UUID]
    name: str
    description: str
    price: Decimal
    category: str
    stock: int

class ProductUseCases:
    def __init__(
        self,
        product_repository: ProductRepository,
        unit_of_work: UnitOfWork
    ):
        self._product_repository = product_repository
        self._unit_of_work = unit_of_work

    async def create(self, dto: ProductDTO) -> Result[UUID]:
        try:
            product = Product(
                name=dto.name,
                description=dto.description,
                price=dto.price,
                category=dto.category,
                stock=dto.stock
            )

            async with self._unit_of_work.transaction():
                await self._product_repository.save(product)
                return Result.ok(product.id)

        except Exception as e:
            return Result.fail(f"商品の作成に失敗しました: {str(e)}")

    async def update(
        self,
        id: UUID,
        dto: ProductDTO
    ) -> Result[None]:
        try:
            product = await self._product_repository.find_by_id(id)
            if not product:
                return Result.fail("商品が見つかりません")

            product.update(
                name=dto.name,
                description=dto.description,
                price=dto.price,
                category=dto.category,
                stock=dto.stock
            )

            async with self._unit_of_work.transaction():
                await self._product_repository.save(product)
                return Result.ok(None)

        except Exception as e:
            return Result.fail(f"商品の更新に失敗しました: {str(e)}")

    async def delete(self, id: UUID) -> Result[None]:
        try:
            product = await self._product_repository.find_by_id(id)
            if not product:
                return Result.fail("商品が見つかりません")

            async with self._unit_of_work.transaction():
                await self._product_repository.delete(id)
                return Result.ok(None)

        except Exception as e:
            return Result.fail(f"商品の削除に失敗しました: {str(e)}")
```

### 3. バッチ処理パターン
```python
from typing import List, Optional
from datetime import datetime, timedelta

class OrderBatchProcessing:
    def __init__(
        self,
        order_repository: OrderRepository,
        notification_service: NotificationService,
        unit_of_work: UnitOfWork
    ):
        self._order_repository = order_repository
        self._notification_service = notification_service
        self._unit_of_work = unit_of_work

    async def process_abandoned_carts(
        self,
        hours_threshold: int = 24
    ) -> Result[int]:
        try:
            cutoff_time = datetime.now() - timedelta(hours=hours_threshold)
            
            async with self._unit_of_work.transaction():
                # 放置されたカートの検索
                abandoned_orders = await self._order_repository.find_by_criteria(
                    status="pending",
                    created_before=cutoff_time
                )

                processed_count = 0
                for order in abandoned_orders:
                    # 通知の送信
                    await self._notification_service.send_cart_reminder(
                        customer_id=order.customer_id,
                        order_id=order.id
                    )
                    processed_count += 1

                return Result.ok(processed_count)

        except Exception as e:
            return Result.fail(f"バッチ処理に失敗しました: {str(e)}")

    async def update_order_statuses(self) -> Result[int]:
        try:
            async with self._unit_of_work.transaction():
                # 発送済み注文の検索
                shipped_orders = await self._order_repository.find_by_criteria(
                    status="shipped"
                )

                updated_count = 0
                for order in shipped_orders:
                    if order.should_be_delivered():
                        order.mark_as_delivered()
                        await self._order_repository.save(order)
                        
                        # 配達完了通知の送信
                        await self._notification_service.send_delivery_completion(
                            customer_id=order.customer_id,
                            order_id=order.id
                        )
                        updated_count += 1

                return Result.ok(updated_count)

        except Exception as e:
            return Result.fail(f"ステータス更新に失敗しました: {str(e)}")
```

## 設計原則

### 1. 単一責務の原則
- ユースケースごとの独立した実装
- 明確な入出力の定義
- ビジネスロジックの集中

### 2. トランザクション管理
- 一貫性の確保
- 例外処理
- ロールバック戦略

### 3. 依存関係の管理
- 依存性の注入
- インターフェースの活用
- 疎結合の維持

## アンチパターン

### 1. 避けるべきプラクティス
- ドメインロジックの重複
- トランザクション境界の不明確さ
- 過度な責務の集中

### 2. 改善パターン
- ドメインロジックの再利用
- 明確なトランザクション境界
- 適切な責務の分散

## レビューチェックリスト
- [ ] ユースケースが単一の責務を持っている
- [ ] トランザクションが適切に管理されている
- [ ] 依存関係が適切に注入されている
- [ ] エラーハンドリングが適切に実装されている
- [ ] ビジネスルールが適切に適用されている

## 関連パターン
- サービスパターン（`service_patterns.md`）
- DTOパターン（`dto_patterns.md`）
- リポジトリパターン（`repository_patterns.md`） 