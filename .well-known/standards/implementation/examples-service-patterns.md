# サービス実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[application-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、アプリケーション層のサービス実装パターンを定義します。
ドメインサービスとアプリケーションサービスの実装、外部サービスとの統合などのパターンを提供します。

## 実装パターン

### 1. アプリケーションサービスパターン
```python
from typing import Protocol, List
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

class OrderApplicationService:
    def __init__(
        self,
        create_order_use_case: CreateOrderUseCase,
        cancel_order_use_case: CancelOrderUseCase,
        order_query_service: OrderQueryService
    ):
        self._create_order_use_case = create_order_use_case
        self._cancel_order_use_case = cancel_order_use_case
        self._order_query_service = order_query_service

    async def create_order(
        self,
        request: CreateOrderRequest
    ) -> Result[CreateOrderResponse]:
        return await self._create_order_use_case.execute(request)

    async def cancel_order(
        self,
        order_id: UUID,
        reason: str
    ) -> Result[None]:
        return await self._cancel_order_use_case.execute(
            CancelOrderRequest(order_id=order_id, reason=reason)
        )

    async def get_order_details(
        self,
        order_id: UUID
    ) -> Result[OrderDetailsDTO]:
        return await self._order_query_service.get_order_details(order_id)

    async def search_orders(
        self,
        criteria: OrderSearchCriteria
    ) -> Result[List[OrderSummaryDTO]]:
        return await self._order_query_service.search(criteria)
```

### 2. ドメインサービスパターン
```python
from typing import Optional
from decimal import Decimal

class PricingService:
    def __init__(
        self,
        tax_rate: Decimal,
        discount_service: DiscountService
    ):
        self._tax_rate = tax_rate
        self._discount_service = discount_service

    def calculate_total_price(
        self,
        order: Order,
        customer: Customer
    ) -> Money:
        # 小計の計算
        subtotal = sum(
            item.price * item.quantity
            for item in order.items
        )

        # 割引の適用
        discount = self._discount_service.calculate_discount(
            customer,
            subtotal
        )

        # 税金の計算
        tax = (subtotal - discount) * self._tax_rate

        return Money(
            amount=subtotal - discount + tax,
            currency="JPY"
        )

class InventoryService:
    def __init__(
        self,
        product_repository: ProductRepository,
        inventory_policy: InventoryPolicy
    ):
        self._product_repository = product_repository
        self._inventory_policy = inventory_policy

    async def check_availability(
        self,
        order: Order
    ) -> Result[bool]:
        try:
            for item in order.items:
                product = await self._product_repository.find_by_id(
                    item.product_id
                )
                if not product:
                    return Result.fail(
                        f"商品が見つかりません: {item.product_id}"
                    )

                if not self._inventory_policy.is_available(
                    product,
                    item.quantity
                ):
                    return Result.fail(
                        f"在庫が不足しています: {product.name}"
                    )

            return Result.ok(True)

        except Exception as e:
            return Result.fail(f"在庫チェックに失敗しました: {str(e)}")

    async def reserve_inventory(
        self,
        order: Order
    ) -> Result[None]:
        try:
            for item in order.items:
                product = await self._product_repository.find_by_id(
                    item.product_id
                )
                if not product:
                    return Result.fail(
                        f"商品が見つかりません: {item.product_id}"
                    )

                product.decrease_stock(item.quantity)
                await self._product_repository.save(product)

            return Result.ok(None)

        except Exception as e:
            return Result.fail(f"在庫の予約に失敗しました: {str(e)}")
```

### 3. 外部サービス統合パターン
```python
from typing import Protocol, Optional
from datetime import datetime
import httpx
import json

class PaymentService(Protocol):
    async def process_payment(
        self,
        order: Order,
        payment_method: PaymentMethod
    ) -> Result[str]:
        pass

class StripePaymentService:
    def __init__(
        self,
        api_key: str,
        client: Optional[httpx.AsyncClient] = None
    ):
        self._api_key = api_key
        self._client = client or httpx.AsyncClient()

    async def process_payment(
        self,
        order: Order,
        payment_method: PaymentMethod
    ) -> Result[str]:
        try:
            response = await self._client.post(
                "https://api.stripe.com/v1/charges",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "amount": int(order.total_amount * 100),
                    "currency": "jpy",
                    "source": payment_method.token,
                    "description": f"Order {order.id}",
                    "metadata": {
                        "order_id": str(order.id),
                        "customer_id": str(order.customer_id)
                    }
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return Result.ok(data["id"])
            else:
                return Result.fail(
                    f"支払い処理に失敗しました: {response.text}"
                )

        except Exception as e:
            return Result.fail(f"支払い処理でエラーが発生しました: {str(e)}")

class ShippingService:
    def __init__(
        self,
        api_url: str,
        api_key: str,
        client: Optional[httpx.AsyncClient] = None
    ):
        self._api_url = api_url
        self._api_key = api_key
        self._client = client or httpx.AsyncClient()

    async def create_shipping_label(
        self,
        order: Order
    ) -> Result[str]:
        try:
            response = await self._client.post(
                f"{self._api_url}/shipping/labels",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "order_id": str(order.id),
                    "shipping_address": order.shipping_address.to_dict(),
                    "items": [
                        {
                            "product_id": str(item.product_id),
                            "quantity": item.quantity
                        }
                        for item in order.items
                    ]
                }
            )

            if response.status_code == 200:
                data = response.json()
                return Result.ok(data["tracking_number"])
            else:
                return Result.fail(
                    f"配送ラベルの作成に失敗しました: {response.text}"
                )

        except Exception as e:
            return Result.fail(
                f"配送ラベルの作成でエラーが発生しました: {str(e)}"
            )
```

## 設計原則

### 1. サービスの責務
- ドメインロジックの調整
- 外部サービスの抽象化
- トランザクション境界の管理

### 2. 依存関係の管理
- インターフェースベースの設計
- 依存性の注入
- テスト容易性の確保

### 3. エラー処理
- 一貫したエラー報告
- リトライ戦略
- 障害の分離

## アンチパターン

### 1. 避けるべきプラクティス
- ドメインロジックの漏洩
- 過度な責務の集中
- 不適切な例外処理

### 2. 改善パターン
- 適切な責務の分離
- インターフェースの活用
- 堅牢なエラー処理

## レビューチェックリスト
- [ ] サービスの責務が明確である
- [ ] 依存関係が適切に管理されている
- [ ] エラー処理が適切に実装されている
- [ ] 外部サービスが適切に抽象化されている
- [ ] テストが容易な設計になっている

## 関連パターン
- ユースケースパターン（`usecase_patterns.md`）
- DTOパターン（`dto_patterns.md`）
- インフラストラクチャパターン（`infrastructure_patterns.md`） 