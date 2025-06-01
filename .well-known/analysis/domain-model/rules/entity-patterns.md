# エンティティパターン

@version[1.0.0]
@owner[domain-team]
@category[domain-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、ドメイン駆動設計におけるエンティティパターンを定義します。
IDによる同一性、ライフサイクル管理、状態変更の追跡などのパターンを提供します。

## 実装パターン

### 1. 基本エンティティパターン
```python
from abc import ABC
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

class Entity(ABC):
    def __init__(self, id: Optional[UUID] = None):
        self._id = id or uuid4()
        self._created_at = datetime.utcnow()
        self._updated_at = self._created_at

    @property
    def id(self) -> UUID:
        return self._id

    @property
    def created_at(self) -> datetime:
        return self._created_at

    @property
    def updated_at(self) -> datetime:
        return self._updated_at

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Entity):
            return NotImplemented
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)
```

### 2. ライフサイクル管理パターン
```python
from enum import Enum
from typing import List
from dataclasses import dataclass

class OrderStatus(Enum):
    CREATED = "created"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

@dataclass
class OrderItem:
    product_id: UUID
    quantity: int
    price: Decimal

class Order(Entity):
    def __init__(
        self,
        customer_id: UUID,
        items: List[OrderItem],
        id: Optional[UUID] = None
    ):
        super().__init__(id)
        self._customer_id = customer_id
        self._items = items
        self._status = OrderStatus.CREATED
        self._status_history = [(datetime.utcnow(), OrderStatus.CREATED)]

    @property
    def status(self) -> OrderStatus:
        return self._status

    @property
    def status_history(self) -> List[tuple[datetime, OrderStatus]]:
        return self._status_history.copy()

    def confirm(self) -> None:
        if self._status != OrderStatus.CREATED:
            raise ValueError("Order can only be confirmed when in CREATED status")
        self._update_status(OrderStatus.CONFIRMED)

    def process(self) -> None:
        if self._status != OrderStatus.CONFIRMED:
            raise ValueError("Order can only be processed when in CONFIRMED status")
        self._update_status(OrderStatus.PROCESSING)

    def ship(self) -> None:
        if self._status != OrderStatus.PROCESSING:
            raise ValueError("Order can only be shipped when in PROCESSING status")
        self._update_status(OrderStatus.SHIPPED)

    def deliver(self) -> None:
        if self._status != OrderStatus.SHIPPED:
            raise ValueError("Order can only be delivered when in SHIPPED status")
        self._update_status(OrderStatus.DELIVERED)

    def cancel(self) -> None:
        if self._status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            raise ValueError("Cannot cancel shipped or delivered orders")
        self._update_status(OrderStatus.CANCELLED)

    def _update_status(self, new_status: OrderStatus) -> None:
        self._status = new_status
        self._status_history.append((datetime.utcnow(), new_status))
        self._updated_at = datetime.utcnow()
```

### 3. 状態変更追跡パターン
```python
from typing import Dict, Any, List
from copy import deepcopy

class AuditableEntity(Entity):
    def __init__(self, id: Optional[UUID] = None):
        super().__init__(id)
        self._changes: List[Dict[str, Any]] = []

    def track_change(
        self,
        field: str,
        old_value: Any,
        new_value: Any,
        reason: Optional[str] = None
    ) -> None:
        change = {
            'field': field,
            'old_value': deepcopy(old_value),
            'new_value': deepcopy(new_value),
            'timestamp': datetime.utcnow(),
            'reason': reason
        }
        self._changes.append(change)

    @property
    def changes(self) -> List[Dict[str, Any]]:
        return self._changes.copy()

class Product(AuditableEntity):
    def __init__(
        self,
        name: str,
        price: Decimal,
        stock: int,
        id: Optional[UUID] = None
    ):
        super().__init__(id)
        self._name = name
        self._price = price
        self._stock = stock

    @property
    def name(self) -> str:
        return self._name

    @property
    def price(self) -> Decimal:
        return self._price

    @property
    def stock(self) -> int:
        return self._stock

    def update_price(self, new_price: Decimal, reason: str) -> None:
        old_price = self._price
        self._price = new_price
        self.track_change('price', old_price, new_price, reason)
        self._updated_at = datetime.utcnow()

    def update_stock(self, new_stock: int, reason: str) -> None:
        old_stock = self._stock
        self._stock = new_stock
        self.track_change('stock', old_stock, new_stock, reason)
        self._updated_at = datetime.utcnow()
```

## 設計原則

### 1. 同一性の原則
- IDによる一意性の保証
- 不変な識別子
- ライフサイクルを通じた一貫性

### 2. 状態管理の原則
- 整合性のある状態遷移
- 履歴の追跡
- 監査可能性

### 3. 振る舞いの原則
- ドメインロジックのカプセル化
- 不変条件の保護
- 副作用の制御

## アンチパターン

### 1. 避けるべきプラクティス
- 可変なID
- 直接的な状態変更
- ドメインロジックの漏洩

### 2. 改善パターン
- 不変なID
- カプセル化された状態変更
- ドメインロジックの集約

## レビューチェックリスト
- [ ] IDの不変性が保証されている
- [ ] 状態変更が適切に管理されている
- [ ] ドメインロジックが適切にカプセル化されている
- [ ] 不変条件が保護されている
- [ ] 監査証跡が適切に記録されている

## 関連パターン
- 値オブジェクトパターン（`value_object_patterns.md`）
- 集約パターン（`aggregate_patterns.md`）
- リポジトリパターン（`repository_patterns.md`） 