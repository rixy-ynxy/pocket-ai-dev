# 集約パターン

@version[1.0.0]
@owner[domain-team]
@category[domain-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、ドメイン駆動設計における集約パターンを定義します。
整合性境界、ルートエンティティ、不変条件の保護などのパターンを提供します。

## 実装パターン

### 1. 基本集約パターン
```python
from abc import ABC, abstractmethod
from typing import List, Optional, Set
from uuid import UUID
from datetime import datetime

class AggregateRoot(Entity, ABC):
    def __init__(self, id: Optional[UUID] = None):
        super().__init__(id)
        self._domain_events: List[DomainEvent] = []

    def add_domain_event(self, event: DomainEvent) -> None:
        self._domain_events.append(event)

    def clear_domain_events(self) -> List[DomainEvent]:
        events = self._domain_events.copy()
        self._domain_events.clear()
        return events

    @abstractmethod
    def validate(self) -> None:
        """集約の不変条件を検証する"""
        pass
```

### 2. 注文集約パターン
```python
from decimal import Decimal
from typing import Dict

class OrderAggregate(AggregateRoot):
    def __init__(
        self,
        customer_id: UUID,
        shipping_address: Address,
        id: Optional[UUID] = None
    ):
        super().__init__(id)
        self._customer_id = customer_id
        self._shipping_address = shipping_address
        self._items: Dict[UUID, OrderItem] = {}
        self._status = OrderStatus.CREATED
        self._total_amount = Decimal('0')

    def add_item(
        self,
        product_id: UUID,
        quantity: int,
        unit_price: Money
    ) -> None:
        if self._status != OrderStatus.CREATED:
            raise ValueError("Cannot modify items after order is confirmed")
        
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        item = OrderItem(
            order_id=self.id,
            product_id=product_id,
            quantity=quantity,
            unit_price=unit_price
        )
        
        self._items[product_id] = item
        self._recalculate_total()
        
        self.add_domain_event(
            OrderItemAddedEvent(
                order_id=self.id,
                product_id=product_id,
                quantity=quantity
            )
        )

    def remove_item(self, product_id: UUID) -> None:
        if self._status != OrderStatus.CREATED:
            raise ValueError("Cannot modify items after order is confirmed")
            
        if product_id not in self._items:
            raise ValueError("Item not found in order")

        del self._items[product_id]
        self._recalculate_total()
        
        self.add_domain_event(
            OrderItemRemovedEvent(
                order_id=self.id,
                product_id=product_id
            )
        )

    def update_item_quantity(
        self,
        product_id: UUID,
        quantity: int
    ) -> None:
        if self._status != OrderStatus.CREATED:
            raise ValueError("Cannot modify items after order is confirmed")
            
        if product_id not in self._items:
            raise ValueError("Item not found in order")
            
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        item = self._items[product_id]
        old_quantity = item.quantity
        item.update_quantity(quantity)
        self._recalculate_total()
        
        self.add_domain_event(
            OrderItemQuantityUpdatedEvent(
                order_id=self.id,
                product_id=product_id,
                old_quantity=old_quantity,
                new_quantity=quantity
            )
        )

    def confirm(self) -> None:
        self.validate()
        if self._status != OrderStatus.CREATED:
            raise ValueError("Order can only be confirmed when in CREATED status")
            
        self._status = OrderStatus.CONFIRMED
        self.add_domain_event(
            OrderConfirmedEvent(
                order_id=self.id,
                total_amount=self._total_amount
            )
        )

    def _recalculate_total(self) -> None:
        self._total_amount = sum(
            item.total_price.amount
            for item in self._items.values()
        )

    def validate(self) -> None:
        if not self._items:
            raise ValueError("Order must have at least one item")
        if self._total_amount <= 0:
            raise ValueError("Total amount must be positive")
```

### 3. 在庫集約パターン
```python
class InventoryAggregate(AggregateRoot):
    def __init__(
        self,
        product_id: UUID,
        initial_quantity: int,
        id: Optional[UUID] = None
    ):
        super().__init__(id)
        self._product_id = product_id
        self._quantity = initial_quantity
        self._reserved: Dict[UUID, int] = {}
        self._version = 0

    @property
    def available_quantity(self) -> int:
        return self._quantity - sum(self._reserved.values())

    def reserve(self, order_id: UUID, quantity: int) -> None:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
            
        if quantity > self.available_quantity:
            raise ValueError("Insufficient stock")

        self._reserved[order_id] = quantity
        self.add_domain_event(
            StockReservedEvent(
                product_id=self._product_id,
                order_id=order_id,
                quantity=quantity
            )
        )

    def cancel_reservation(self, order_id: UUID) -> None:
        if order_id not in self._reserved:
            raise ValueError("Reservation not found")

        quantity = self._reserved.pop(order_id)
        self.add_domain_event(
            StockReservationCancelledEvent(
                product_id=self._product_id,
                order_id=order_id,
                quantity=quantity
            )
        )

    def confirm_reservation(self, order_id: UUID) -> None:
        if order_id not in self._reserved:
            raise ValueError("Reservation not found")

        quantity = self._reserved.pop(order_id)
        self._quantity -= quantity
        self._version += 1
        
        self.add_domain_event(
            StockDeductedEvent(
                product_id=self._product_id,
                order_id=order_id,
                quantity=quantity,
                remaining_quantity=self._quantity
            )
        )

    def restock(self, quantity: int) -> None:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        self._quantity += quantity
        self._version += 1
        
        self.add_domain_event(
            StockRestockedEvent(
                product_id=self._product_id,
                quantity=quantity,
                new_quantity=self._quantity
            )
        )

    def validate(self) -> None:
        if self._quantity < 0:
            raise ValueError("Quantity cannot be negative")
        if self.available_quantity < 0:
            raise ValueError("Available quantity cannot be negative")
```

## 設計原則

### 1. 整合性境界の原則
- トランザクション境界
- 不変条件の保護
- 集約間の参照

### 2. ルートエンティティの原則
- 集約の一貫性管理
- 外部からのアクセス制御
- ドメインイベントの発行

### 3. サイズと複雑性の原則
- 適切な粒度
- 明確な責務
- パフォーマンスの考慮

## アンチパターン

### 1. 避けるべきプラクティス
- 大きすぎる集約
- 集約間の直接参照
- 不適切な境界設定

### 2. 改善パターン
- 適切なサイズの集約
- IDによる参照
- 明確な境界設定

## レビューチェックリスト
- [ ] 整合性境界が適切に定義されている
- [ ] ルートエンティティが明確である
- [ ] 不変条件が保護されている
- [ ] ドメインイベントが適切に発行されている
- [ ] パフォーマンスが考慮されている

## 関連パターン
- エンティティパターン（`entity_patterns.md`）
- 値オブジェクトパターン（`value_object_patterns.md`）
- リポジトリパターン（`repository_patterns.md`） 