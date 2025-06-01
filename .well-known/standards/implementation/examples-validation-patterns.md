# バリデーション実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[interface-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、インターフェース層のバリデーション実装パターンを定義します。
入力データの検証、ビジネスルールの適用、エラーメッセージの管理などのパターンを提供します。

## 実装パターン

### 1. Pydanticバリデーションパターン
```python
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal

class OrderItemRequest(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0, le=100)
    unit_price: Decimal = Field(gt=0)

    @validator("unit_price")
    def validate_unit_price(cls, v):
        if v.quantize(Decimal(".01")) != v:
            raise ValueError("単価は小数点2桁までです")
        return v

class CreateOrderRequest(BaseModel):
    customer_id: UUID
    items: List[OrderItemRequest] = Field(min_items=1)
    shipping_address_id: UUID
    payment_method_id: UUID
    notes: Optional[str] = Field(max_length=1000)

    @validator("items")
    def validate_items(cls, v):
        total_quantity = sum(item.quantity for item in v)
        if total_quantity > 1000:
            raise ValueError("注文の合計数量は1000を超えることはできません")
        return v

class UpdateOrderRequest(BaseModel):
    status: str = Field(regex="^(PENDING|CONFIRMED|SHIPPED|DELIVERED|CANCELLED)$")
    reason: Optional[str] = Field(max_length=1000)
    updated_by: UUID

    class Config:
        use_enum_values = True
```

### 2. カスタムバリデーションパターン
```python
from typing import List, Optional, Any, Dict
from dataclasses import dataclass
from datetime import datetime, date
import re

@dataclass
class ValidationError:
    field: str
    message: str
    code: str

class ValidationResult:
    def __init__(self):
        self._errors: List[ValidationError] = []

    def add_error(self, field: str, message: str, code: str):
        self._errors.append(ValidationError(field, message, code))

    @property
    def is_valid(self) -> bool:
        return len(self._errors) == 0

    @property
    def errors(self) -> List[ValidationError]:
        return self._errors.copy()

    def to_dict(self) -> Dict[str, List[str]]:
        result = {}
        for error in self._errors:
            if error.field not in result:
                result[error.field] = []
            result[error.field].append(error.message)
        return result

class CustomerValidator:
    def __init__(self):
        self._email_pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        self._phone_pattern = re.compile(r"^\+?[1-9][0-9]{7,14}$")

    def validate(self, data: Dict[str, Any]) -> ValidationResult:
        result = ValidationResult()

        # 必須フィールドの検証
        required_fields = ["name", "email", "phone"]
        for field in required_fields:
            if field not in data or not data[field]:
                result.add_error(
                    field,
                    f"{field}は必須です",
                    "required"
                )

        # メールアドレスの検証
        if "email" in data and data["email"]:
            if not self._email_pattern.match(data["email"]):
                result.add_error(
                    "email",
                    "メールアドレスの形式が不正です",
                    "invalid_format"
                )

        # 電話番号の検証
        if "phone" in data and data["phone"]:
            if not self._phone_pattern.match(data["phone"]):
                result.add_error(
                    "phone",
                    "電話番号の形式が不正です",
                    "invalid_format"
                )

        # 生年月日の検証
        if "birth_date" in data and data["birth_date"]:
            try:
                birth_date = datetime.strptime(
                    data["birth_date"],
                    "%Y-%m-%d"
                ).date()
                today = date.today()
                age = today.year - birth_date.year
                if today.month < birth_date.month or (
                    today.month == birth_date.month and
                    today.day < birth_date.day
                ):
                    age -= 1
                if age < 18:
                    result.add_error(
                        "birth_date",
                        "18歳未満は登録できません",
                        "underage"
                    )
            except ValueError:
                result.add_error(
                    "birth_date",
                    "生年月日の形式が不正です",
                    "invalid_format"
                )

        return result
```

### 3. ビジネスルールバリデーションパターン
```python
from typing import Protocol, List
from datetime import datetime
from decimal import Decimal

class OrderValidator(Protocol):
    def validate_order_limit(
        self,
        customer_id: UUID,
        total_amount: Decimal
    ) -> bool: ...

    def validate_product_availability(
        self,
        product_id: UUID,
        quantity: int
    ) -> bool: ...

class OrderValidationService:
    def __init__(
        self,
        order_repository: OrderRepository,
        product_repository: ProductRepository,
        customer_repository: CustomerRepository
    ):
        self._order_repository = order_repository
        self._product_repository = product_repository
        self._customer_repository = customer_repository

    async def validate_order_creation(
        self,
        request: CreateOrderRequest
    ) -> ValidationResult:
        result = ValidationResult()

        # 顧客の存在確認
        customer = await self._customer_repository.find_by_id(
            request.customer_id
        )
        if not customer:
            result.add_error(
                "customer_id",
                "指定された顧客が存在しません",
                "not_found"
            )
            return result

        # 注文制限の確認
        total_amount = sum(
            item.unit_price * item.quantity
            for item in request.items
        )
        if not await self.validate_order_limit(
            request.customer_id,
            total_amount
        ):
            result.add_error(
                "total_amount",
                "注文金額が制限を超えています",
                "limit_exceeded"
            )

        # 商品の在庫確認
        for item in request.items:
            if not await self.validate_product_availability(
                item.product_id,
                item.quantity
            ):
                result.add_error(
                    f"items.{item.product_id}",
                    "商品の在庫が不足しています",
                    "out_of_stock"
                )

        return result

    async def validate_order_limit(
        self,
        customer_id: UUID,
        total_amount: Decimal
    ) -> bool:
        # 月間の注文金額制限を確認
        start_date = datetime.now().replace(
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )
        monthly_orders = await self._order_repository.find_by_customer_and_date_range(
            customer_id,
            start_date,
            datetime.now()
        )
        monthly_total = sum(order.total_amount for order in monthly_orders)
        return monthly_total + total_amount <= Decimal("1000000")

    async def validate_product_availability(
        self,
        product_id: UUID,
        quantity: int
    ) -> bool:
        product = await self._product_repository.find_by_id(product_id)
        return product and product.stock >= quantity
```

## 設計原則

### 1. バリデーションの階層化
- 構文的バリデーション
- 意味的バリデーション
- ビジネスルールバリデーション

### 2. エラー処理の一貫性
- エラーメッセージの標準化
- エラーコードの体系化
- 多言語対応

### 3. 再利用性の確保
- バリデーションルールの共有
- カスタマイズ可能性
- テスト容易性

## アンチパターン

### 1. 避けるべきプラクティス
- バリデーションロジックの重複
- 不適切なエラーメッセージ
- 過度な依存関係

### 2. 改善パターン
- バリデーションの集約
- エラーメッセージの改善
- 依存関係の最小化

## レビューチェックリスト
- [ ] バリデーションが適切に階層化されている
- [ ] エラー処理が一貫している
- [ ] 再利用性が確保されている
- [ ] テストが容易である
- [ ] パフォーマンスが考慮されている

## 関連パターン
- コントローラーパターン（`controller_patterns.md`）
- DTOパターン（`dto_patterns.md`）
- エラーハンドリングパターン（`error_handling_patterns.md`） 