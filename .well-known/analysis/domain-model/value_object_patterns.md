# 値オブジェクトパターン

@version[1.0.0]
@owner[domain-team]
@category[domain-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、ドメイン駆動設計における値オブジェクトパターンを定義します。
不変性、等価性による比較、自己完結的な振る舞いなどのパターンを提供します。

## 実装パターン

### 1. 基本値オブジェクトパターン
```python
from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True)
class ValueObject:
    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, self.__class__):
            return NotImplemented
        return self.__dict__ == other.__dict__

    def __hash__(self) -> int:
        return hash(tuple(sorted(self.__dict__.items())))
```

### 2. ドメイン固有値オブジェクトパターン
```python
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
import re

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str

    def __post_init__(self) -> None:
        if not isinstance(self.amount, Decimal):
            object.__setattr__(self, 'amount', Decimal(str(self.amount)))
        if len(self.currency) != 3:
            raise ValueError("Currency code must be 3 characters")

    def __add__(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(self.amount + other.amount, self.currency)

    def __sub__(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Cannot subtract different currencies")
        return Money(self.amount - other.amount, self.currency)

    def multiply(self, multiplier: Decimal) -> 'Money':
        return Money(self.amount * multiplier, self.currency)

@dataclass(frozen=True)
class EmailAddress:
    value: str

    def __post_init__(self) -> None:
        if not self._is_valid_email(self.value):
            raise ValueError("Invalid email address")

    @staticmethod
    def _is_valid_email(email: str) -> bool:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    @property
    def domain(self) -> str:
        return self.value.split('@')[1]

@dataclass(frozen=True)
class PhoneNumber:
    country_code: str
    number: str

    def __post_init__(self) -> None:
        if not self.country_code.startswith('+'):
            raise ValueError("Country code must start with '+'")
        if not self.number.isdigit():
            raise ValueError("Phone number must contain only digits")

    def __str__(self) -> str:
        return f"{self.country_code}{self.number}"

    @classmethod
    def from_string(cls, phone_string: str) -> 'PhoneNumber':
        if not phone_string.startswith('+'):
            raise ValueError("Phone string must start with '+'")
        country_code = '+'
        i = 1
        while i < len(phone_string) and (phone_string[i].isdigit() or phone_string[i] == ' '):
            if phone_string[i].isdigit():
                country_code += phone_string[i]
            i += 1
        number = ''.join(c for c in phone_string[i:] if c.isdigit())
        return cls(country_code, number)
```

### 3. 複合値オブジェクトパターン
```python
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class Address:
    street: str
    city: str
    state: str
    postal_code: str
    country: str
    building: Optional[str] = None
    apartment: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.street:
            raise ValueError("Street cannot be empty")
        if not self.city:
            raise ValueError("City cannot be empty")
        if not self.state:
            raise ValueError("State cannot be empty")
        if not self.postal_code:
            raise ValueError("Postal code cannot be empty")
        if not self.country:
            raise ValueError("Country cannot be empty")

    def format(self, include_country: bool = True) -> str:
        parts = [self.street]
        
        if self.building:
            parts.append(self.building)
        if self.apartment:
            parts.append(f"Apt {self.apartment}")
            
        parts.append(f"{self.city}, {self.state} {self.postal_code}")
        
        if include_country:
            parts.append(self.country)
            
        return '\n'.join(parts)

@dataclass(frozen=True)
class PersonName:
    first_name: str
    last_name: str
    middle_name: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.first_name:
            raise ValueError("First name cannot be empty")
        if not self.last_name:
            raise ValueError("Last name cannot be empty")

    @property
    def full_name(self) -> str:
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return ' '.join(parts)

    @property
    def initials(self) -> str:
        parts = [self.first_name[0]]
        if self.middle_name:
            parts.append(self.middle_name[0])
        parts.append(self.last_name[0])
        return ''.join(parts).upper()
```

## 設計原則

### 1. 不変性の原則
- イミュータブルな状態
- 副作用のない操作
- 値の整合性保証

### 2. 等価性の原則
- 属性による比較
- ハッシュ可能性
- 一貫した振る舞い

### 3. 自己完結性の原則
- ドメインルールの適用
- バリデーション
- フォーマット変換

## アンチパターン

### 1. 避けるべきプラクティス
- ミュータブルな状態
- IDによる同一性
- 不適切な責務の混在

### 2. 改善パターン
- イミュータブルな設計
- 属性による等価性
- 明確な責務の分離

## レビューチェックリスト
- [ ] 不変性が保証されている
- [ ] 等価性が適切に実装されている
- [ ] バリデーションが実装されている
- [ ] ドメインルールが適用されている
- [ ] 自己完結的な振る舞いが提供されている

## 関連パターン
- エンティティパターン（`entity_patterns.md`）
- 集約パターン（`aggregate_patterns.md`）
- リポジトリパターン（`repository_patterns.md`） 