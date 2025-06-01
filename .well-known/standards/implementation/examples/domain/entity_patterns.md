# エンティティ実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[domain-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、ドメインエンティティの実装パターンを定義します。
エンティティの基本構造、振る舞い、整合性の保証方法などを提供します。

## 実装パターン

### 1. 基本エンティティパターン
```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from uuid import UUID, uuid4

@dataclass
class Entity:
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Entity):
            return NotImplemented
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)

@dataclass
class Order(Entity):
    customer_id: UUID
    status: str = "pending"
    items: List["OrderItem"] = field(default_factory=list)
    total_amount: float = 0.0
    
    def add_item(self, item: "OrderItem") -> None:
        self.items.append(item)
        self.total_amount += item.price * item.quantity
        self.updated_at = datetime.now()

    def remove_item(self, item_id: UUID) -> None:
        item = next((i for i in self.items if i.id == item_id), None)
        if item:
            self.items.remove(item)
            self.total_amount -= item.price * item.quantity
            self.updated_at = datetime.now()

    def confirm(self) -> None:
        if not self.items:
            raise ValueError("注文には少なくとも1つの商品が必要です")
        self.status = "confirmed"
        self.updated_at = datetime.now()

@dataclass
class OrderItem(Entity):
    product_id: UUID
    quantity: int
    price: float
    
    def __post_init__(self) -> None:
        if self.quantity <= 0:
            raise ValueError("数量は1以上である必要があります")
        if self.price < 0:
            raise ValueError("価格は0以上である必要があります")
```

### 2. 集約ルートパターン
```python
from typing import Dict, Set
from abc import ABC, abstractmethod

class AggregateRoot(Entity, ABC):
    def __init__(self) -> None:
        super().__init__()
        self._domain_events: List["DomainEvent"] = []

    def add_domain_event(self, event: "DomainEvent") -> None:
        self._domain_events.append(event)

    def clear_domain_events(self) -> List["DomainEvent"]:
        events = self._domain_events.copy()
        self._domain_events.clear()
        return events

    @abstractmethod
    def validate(self) -> None:
        pass

class Customer(AggregateRoot):
    def __init__(
        self,
        id: UUID,
        name: str,
        email: str,
        addresses: List["Address"]
    ):
        super().__init__()
        self.id = id
        self.name = name
        self.email = email
        self.addresses = addresses
        self._active_address_id: Optional[UUID] = None
        
    def add_address(self, address: "Address") -> None:
        if len(self.addresses) >= 5:
            raise ValueError("住所は最大5つまでです")
        self.addresses.append(address)
        self.add_domain_event(AddressAddedEvent(self.id, address))
        
    def set_active_address(self, address_id: UUID) -> None:
        if not any(a.id == address_id for a in self.addresses):
            raise ValueError("指定された住所が見つかりません")
        self._active_address_id = address_id
        
    def validate(self) -> None:
        if not self.name:
            raise ValueError("名前は必須です")
        if not self.email:
            raise ValueError("メールアドレスは必須です")
```

### 3. 不変条件パターン
```python
from typing import List, Optional
from decimal import Decimal

class Product(Entity):
    def __init__(
        self,
        id: UUID,
        name: str,
        price: Decimal,
        stock: int,
        category: str
    ):
        super().__init__()
        self._validate_price(price)
        self._validate_stock(stock)
        
        self.id = id
        self.name = name
        self._price = price
        self._stock = stock
        self.category = category
        
    @property
    def price(self) -> Decimal:
        return self._price
    
    @price.setter
    def price(self, value: Decimal) -> None:
        self._validate_price(value)
        self._price = value
        
    @property
    def stock(self) -> int:
        return self._stock
    
    @stock.setter
    def stock(self, value: int) -> None:
        self._validate_stock(value)
        self._stock = value
        
    def decrease_stock(self, quantity: int) -> None:
        if quantity <= 0:
            raise ValueError("数量は正の値である必要があります")
        if self._stock < quantity:
            raise ValueError("在庫が不足しています")
        self._stock -= quantity
        
    @staticmethod
    def _validate_price(price: Decimal) -> None:
        if price < Decimal("0"):
            raise ValueError("価格は0以上である必要があります")
            
    @staticmethod
    def _validate_stock(stock: int) -> None:
        if stock < 0:
            raise ValueError("在庫は0以上である必要があります")
```

## 設計原則

### 1. 識別子の管理
- 一意な識別子の使用
- 識別子の不変性
- 識別子の生成戦略

### 2. 整合性の保証
- 不変条件の検証
- 状態変更の制御
- ドメインイベントの発行

### 3. ライフサイクル管理
- 作成日時の記録
- 更新日時の管理
- 論理削除の実装

## アンチパターン

### 1. 避けるべきプラクティス
- 可変な識別子
- 整合性チェックの欠如
- ドメインロジックの漏洩

### 2. 改善パターン
- 不変な識別子の使用
- バリデーションの徹底
- ドメインロジックのカプセル化

## レビューチェックリスト
- [ ] エンティティが一意に識別可能である
- [ ] 不変条件が適切に実装されている
- [ ] ドメインロジックが適切にカプセル化されている
- [ ] ライフサイクルが適切に管理されている
- [ ] ドメインイベントが適切に発行されている

## 関連パターン
- 値オブジェクトパターン（`value_object_patterns.md`）
- リポジトリパターン（`repository_patterns.md`）
- サービスパターン（`service_patterns.md`） 