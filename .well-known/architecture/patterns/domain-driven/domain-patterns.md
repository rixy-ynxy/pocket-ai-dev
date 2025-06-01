# クリーンアーキテクチャ - ドメインパターン

@version[1.0.0]
@owner[architecture-team]
@category[clean-architecture]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、クリーンアーキテクチャにおけるドメイン層の実装パターンを定義します。
ドメインロジックの純粋性を保ちながら、ビジネスルールを効果的に実装する方法を提供します。

## 実装パターン

### 1. エンティティパターン
```python
from dataclasses import dataclass
from typing import List
from domain.value_objects import UniqueEntityId, OrderStatus, Result

@dataclass
class Order:
    id: UniqueEntityId
    items: List['OrderItem']
    status: OrderStatus

    def __init__(self, id: UniqueEntityId):
        self.id = id
        self.items = []
        self.status = OrderStatus.CREATED

    def add_item(self, item: 'OrderItem') -> Result:
        if self.status != OrderStatus.CREATED:
            return Result.fail('注文確定後は商品を追加できません')
        self.items.append(item)
        return Result.ok()

    def confirm(self) -> Result:
        if not self.items:
            return Result.fail('商品が追加されていません')
        self.status = OrderStatus.CONFIRMED
        return Result.ok()
```

### 2. 値オブジェクトパターン
```python
from dataclasses import dataclass
from enum import Enum
from typing import Any

class Currency(Enum):
    JPY = 'JPY'
    USD = 'USD'

@dataclass(frozen=True)
class Money:
    amount: int
    currency: Currency

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError('金額は0以上である必要があります')

    def add(self, money: 'Money') -> 'Money':
        if self.currency != money.currency:
            raise ValueError('通貨単位が異なります')
        return Money(self.amount + money.amount, self.currency)

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self.amount == other.amount and self.currency == other.currency
```

### 3. 集約パターン
```python
from dataclasses import dataclass
from typing import Optional
from domain.value_objects import Result

@dataclass
class OrderAggregate:
    order: Order
    customer: 'CustomerRef'
    payment: Optional['Payment'] = None

    def process_payment(self, payment: 'Payment') -> Result:
        if not self.customer.has_valid_payment_method():
            return Result.fail('有効な支払い方法がありません')
        self.payment = payment
        return Result.ok()

    def can_modify(self) -> bool:
        return self.order.status == OrderStatus.CREATED

    def calculate_total(self) -> Money:
        return sum((item.price for item in self.order.items), 
                  start=Money(0, Currency.JPY))
```

### 4. リポジトリパターン
```python
from abc import ABC, abstractmethod
from typing import Optional, Protocol
from domain.value_objects import UniqueEntityId

class OrderRepository(Protocol):
    @abstractmethod
    def find_by_id(self, id: UniqueEntityId) -> Optional[Order]:
        pass

    @abstractmethod
    def save(self, order: Order) -> None:
        pass

    @abstractmethod
    def delete(self, id: UniqueEntityId) -> None:
        pass
```

## 設計原則

### 1. 不変条件の保護
- エンティティの状態変更は必ずメソッドを通じて行う
- 値オブジェクトは不変に保つ（`@dataclass(frozen=True)`の活用）
- ビジネスルールの違反を型システムで防ぐ

### 2. 依存関係の制御
- ドメイン層は外部に依存しない
- インフラストラクチャの詳細から隔離
- インターフェースによる抽象化（Protocolの活用）

### 3. 集約の境界
- トランザクションの一貫性を保証
- 関連オブジェクトのライフサイクル管理
- 参照の整合性確保

## アンチパターン

### 1. 避けるべきプラクティス
- ドメインロジックの漏洩
- 永続化の詳細への依存
- ビジネスルールの分散

### 2. 改善パターン
- ドメインロジックの集約
- 明示的な不変条件
- 型による制約の活用

## レビューチェックリスト
- [ ] ビジネスルールが適切にカプセル化されている
- [ ] 値オブジェクトが不変である
- [ ] 集約の境界が適切に設定されている
- [ ] 依存関係が制御されている
- [ ] 型による制約が活用されている

## 関連パターン
- アプリケーションサービスパターン（`application_patterns.md`）
- インターフェースパターン（`interface_patterns.md`）
- インフラストラクチャパターン（`infrastructure_patterns.md`） 
