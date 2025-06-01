# 値オブジェクト実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[domain-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、ドメインの値オブジェクトの実装パターンを定義します。
値オブジェクトの基本構造、不変性の保証、演算の実装方法などを提供します。

## 実装パターン

### 1. 基本値オブジェクトパターン
```python
from dataclasses import dataclass
from typing import Optional
from decimal import Decimal

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("金額は0以上である必要があります")
        if not self.currency:
            raise ValueError("通貨は必須です")

    def __add__(self, other: "Money") -> "Money":
        if not isinstance(other, Money):
            return NotImplemented
        if self.currency != other.currency:
            raise ValueError("通貨単位が異なります")
        return Money(self.amount + other.amount, self.currency)

    def __sub__(self, other: "Money") -> "Money":
        if not isinstance(other, Money):
            return NotImplemented
        if self.currency != other.currency:
            raise ValueError("通貨単位が異なります")
        return Money(self.amount - other.amount, self.currency)

    def __mul__(self, multiplier: Decimal) -> "Money":
        return Money(self.amount * multiplier, self.currency)

@dataclass(frozen=True)
class EmailAddress:
    value: str

    def __post_init__(self) -> None:
        if not self._is_valid_email(self.value):
            raise ValueError("無効なメールアドレスです")

    @staticmethod
    def _is_valid_email(email: str) -> bool:
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
```

### 2. 複合値オブジェクトパターン
```python
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class Address:
    postal_code: str
    prefecture: str
    city: str
    street: str
    building: Optional[str] = None

    def __post_init__(self) -> None:
        if not self._is_valid_postal_code(self.postal_code):
            raise ValueError("無効な郵便番号です")
        if not self.prefecture or not self.city or not self.street:
            raise ValueError("住所の必須項目が不足しています")

    @staticmethod
    def _is_valid_postal_code(code: str) -> bool:
        import re
        return bool(re.match(r'^\d{3}-\d{4}$', code))

    def to_full_string(self) -> str:
        parts = [
            f"〒{self.postal_code}",
            self.prefecture,
            self.city,
            self.street
        ]
        if self.building:
            parts.append(self.building)
        return " ".join(parts)

@dataclass(frozen=True)
class DateRange:
    start_date: datetime
    end_date: datetime

    def __post_init__(self) -> None:
        if self.end_date < self.start_date:
            raise ValueError("終了日は開始日以降である必要があります")

    def contains(self, date: datetime) -> bool:
        return self.start_date <= date <= self.end_date

    def overlaps(self, other: "DateRange") -> bool:
        return (
            self.start_date <= other.end_date and
            other.start_date <= self.end_date
        )

    def duration_days(self) -> int:
        return (self.end_date - self.start_date).days
```

### 3. 列挙値オブジェクトパターン
```python
from enum import Enum, auto
from typing import List, Dict, Any

class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

    @property
    def is_active(self) -> bool:
        return self in [
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.SHIPPED
        ]

    @property
    def can_cancel(self) -> bool:
        return self in [
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED
        ]

    @property
    def display_name(self) -> str:
        return {
            OrderStatus.PENDING: "注文受付",
            OrderStatus.CONFIRMED: "注文確定",
            OrderStatus.SHIPPED: "発送済み",
            OrderStatus.DELIVERED: "配達完了",
            OrderStatus.CANCELLED: "キャンセル"
        }[self]

class PaymentMethod(Enum):
    CREDIT_CARD = auto()
    BANK_TRANSFER = auto()
    CONVENIENCE_STORE = auto()

    @property
    def requires_verification(self) -> bool:
        return self in [
            PaymentMethod.CREDIT_CARD,
            PaymentMethod.BANK_TRANSFER
        ]

    @property
    def processing_time(self) -> timedelta:
        return {
            PaymentMethod.CREDIT_CARD: timedelta(minutes=5),
            PaymentMethod.BANK_TRANSFER: timedelta(days=3),
            PaymentMethod.CONVENIENCE_STORE: timedelta(days=1)
        }[self]
```

## 設計原則

### 1. 不変性の保証
- イミュータブルな実装
- バリデーションの徹底
- 副作用のない操作

### 2. 値の等価性
- 構造的な比較
- ハッシュコードの実装
- 一貫した比較動作

### 3. 自己完結性
- 独立した検証ロジック
- 完全なカプセル化
- 明確なインターフェース

## アンチパターン

### 1. 避けるべきプラクティス
- ミュータブルな実装
- 不完全なバリデーション
- 外部依存の混入

### 2. 改善パターン
- イミュータブルクラスの使用
- 完全なバリデーション
- 純粋な値オブジェクトの維持

## レビューチェックリスト
- [ ] 値オブジェクトが不変である
- [ ] バリデーションが完全である
- [ ] 等価性が適切に実装されている
- [ ] 演算が副作用を持たない
- [ ] 自己完結的な実装である

## 関連パターン
- エンティティパターン（`entity_patterns.md`）
- リポジトリパターン（`repository_patterns.md`）
- サービスパターン（`service_patterns.md`） 