# DTOパターン実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[application-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、Data Transfer Object (DTO)の実装パターンを定義します。
レイヤー間のデータ転送、入出力の構造化、バリデーションなどのパターンを提供します。

## 実装パターン

### 1. 基本DTOパターン
```python
from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal

@dataclass(frozen=True)
class AddressDTO:
    postal_code: str
    prefecture: str
    city: str
    street: str
    building: Optional[str] = None

@dataclass(frozen=True)
class CustomerDTO:
    id: UUID
    name: str
    email: str
    phone: Optional[str]
    addresses: List[AddressDTO]
    created_at: datetime

    @classmethod
    def from_entity(cls, entity: Customer) -> "CustomerDTO":
        return cls(
            id=entity.id,
            name=entity.name,
            email=entity.email,
            phone=entity.phone,
            addresses=[
                AddressDTO(
                    postal_code=addr.postal_code,
                    prefecture=addr.prefecture,
                    city=addr.city,
                    street=addr.street,
                    building=addr.building
                )
                for addr in entity.addresses
            ],
            created_at=entity.created_at
        )

@dataclass(frozen=True)
class OrderItemDTO:
    product_id: UUID
    name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
```

### 2. リクエスト/レスポンスDTOパターン
```python
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class CreateOrderRequest(BaseModel):
    customer_id: UUID = Field(..., description="顧客ID")
    items: List["OrderItemRequest"] = Field(
        ...,
        min_items=1,
        description="注文商品リスト"
    )
    shipping_address_id: UUID = Field(..., description="配送先住所ID")
    payment_method_id: UUID = Field(..., description="支払い方法ID")
    notes: Optional[str] = Field(None, max_length=1000)

    @validator("items")
    def validate_items(cls, v: List["OrderItemRequest"]) -> List["OrderItemRequest"]:
        if not v:
            raise ValueError("注文商品は1つ以上指定してください")
        return v

class OrderItemRequest(BaseModel):
    product_id: UUID = Field(..., description="商品ID")
    quantity: int = Field(..., gt=0, description="数量")

    @validator("quantity")
    def validate_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("数量は1以上を指定してください")
        return v

class CreateOrderResponse(BaseModel):
    order_id: UUID
    total_amount: Decimal
    estimated_delivery_date: datetime
    tracking_number: Optional[str]

    class Config:
        json_encoders = {
            UUID: str,
            datetime: lambda v: v.isoformat(),
            Decimal: str
        }
```

### 3. 集約DTOパターン
```python
from dataclasses import dataclass
from typing import List, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal

@dataclass(frozen=True)
class OrderDetailsDTO:
    id: UUID
    customer: CustomerSummaryDTO
    items: List[OrderItemDetailDTO]
    shipping_address: AddressDTO
    payment_method: PaymentMethodDTO
    status: str
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    tracking_info: Optional[TrackingInfoDTO] = None

    @classmethod
    def from_aggregate(
        cls,
        order: Order,
        customer: Customer
    ) -> "OrderDetailsDTO":
        return cls(
            id=order.id,
            customer=CustomerSummaryDTO.from_entity(customer),
            items=[
                OrderItemDetailDTO.from_entity(item)
                for item in order.items
            ],
            shipping_address=AddressDTO.from_entity(
                order.shipping_address
            ),
            payment_method=PaymentMethodDTO.from_entity(
                order.payment_method
            ),
            status=order.status,
            total_amount=order.total_amount,
            created_at=order.created_at,
            updated_at=order.updated_at,
            tracking_info=TrackingInfoDTO.from_entity(
                order.tracking_info
            ) if order.tracking_info else None
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "customer": {
                "id": str(self.customer.id),
                "name": self.customer.name,
                "email": self.customer.email
            },
            "items": [
                {
                    "product_id": str(item.product_id),
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit_price": str(item.unit_price),
                    "subtotal": str(item.subtotal)
                }
                for item in self.items
            ],
            "shipping_address": {
                "postal_code": self.shipping_address.postal_code,
                "prefecture": self.shipping_address.prefecture,
                "city": self.shipping_address.city,
                "street": self.shipping_address.street,
                "building": self.shipping_address.building
            },
            "payment_method": {
                "id": str(self.payment_method.id),
                "type": self.payment_method.type,
                "last4": self.payment_method.last4
            },
            "status": self.status,
            "total_amount": str(self.total_amount),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "tracking_info": {
                "tracking_number": self.tracking_info.tracking_number,
                "carrier": self.tracking_info.carrier,
                "status": self.tracking_info.status,
                "estimated_delivery_date": self.tracking_info.estimated_delivery_date.isoformat()
            } if self.tracking_info else None
        }
```

## 設計原則

### 1. データの整合性
- イミュータブルな設計
- バリデーションの一元管理
- 型の安全性

### 2. 変換の責務
- エンティティとDTOの明確な分離
- 双方向の変換ロジック
- 整合性の保証

### 3. 使用性
- 明確なインターフェース
- 適切な粒度
- シリアライズ対応

## アンチパターン

### 1. 避けるべきプラクティス
- ドメインロジックの混入
- 過度な結合
- 不適切なバリデーション

### 2. 改善パターン
- 明確な責務の分離
- 適切な粒度の設定
- 堅牢なバリデーション

## レビューチェックリスト
- [ ] DTOが不変である
- [ ] バリデーションが適切に実装されている
- [ ] 変換ロジックが明確である
- [ ] シリアライズ対応が適切である
- [ ] 使用性が考慮されている

## 関連パターン
- エンティティパターン（`entity_patterns.md`）
- バリデーションパターン（`validation_patterns.md`）
- シリアライゼーションパターン（`serialization_patterns.md`） 