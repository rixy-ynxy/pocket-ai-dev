# プレゼンター実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[interface-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、インターフェース層のプレゼンター実装パターンを定義します。
ドメインオブジェクトやDTOをクライアントに適した形式に変換し、表示ロジックを分離するパターンを提供します。

## 実装パターン

### 1. JSONプレゼンターパターン
```python
from typing import Dict, Any, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal
import json

class OrderPresenter:
    @staticmethod
    def to_dict(order: Order) -> Dict[str, Any]:
        return {
            "id": str(order.id),
            "customer": {
                "id": str(order.customer_id),
                "name": order.customer_name
            },
            "items": [
                {
                    "product_id": str(item.product_id),
                    "name": item.product_name,
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "subtotal": float(item.subtotal)
                }
                for item in order.items
            ],
            "total_amount": float(order.total_amount),
            "status": order.status.value,
            "created_at": order.created_at.isoformat(),
            "updated_at": order.updated_at.isoformat()
        }

    @staticmethod
    def to_json(order: Order) -> str:
        return json.dumps(
            OrderPresenter.to_dict(order),
            ensure_ascii=False
        )

class OrderListPresenter:
    @staticmethod
    def to_dict(
        orders: List[Order],
        total_count: int,
        page: int,
        per_page: int
    ) -> Dict[str, Any]:
        return {
            "data": [
                OrderPresenter.to_dict(order)
                for order in orders
            ],
            "meta": {
                "total_count": total_count,
                "page": page,
                "per_page": per_page,
                "total_pages": (total_count + per_page - 1) // per_page
            }
        }
```

### 2. GraphQLプレゼンターパターン
```python
from typing import Optional, List
import strawberry
from datetime import datetime

@strawberry.type
class CustomerType:
    id: str
    name: str
    email: str

@strawberry.type
class OrderItemType:
    product_id: str
    name: str
    quantity: int
    unit_price: float
    subtotal: float

@strawberry.type
class OrderType:
    id: str
    customer: CustomerType
    items: List[OrderItemType]
    total_amount: float
    status: str
    created_at: datetime
    updated_at: datetime

class OrderGraphQLPresenter:
    @staticmethod
    def to_graphql(order: Order) -> OrderType:
        return OrderType(
            id=str(order.id),
            customer=CustomerType(
                id=str(order.customer_id),
                name=order.customer_name,
                email=order.customer_email
            ),
            items=[
                OrderItemType(
                    product_id=str(item.product_id),
                    name=item.product_name,
                    quantity=item.quantity,
                    unit_price=float(item.unit_price),
                    subtotal=float(item.subtotal)
                )
                for item in order.items
            ],
            total_amount=float(order.total_amount),
            status=order.status.value,
            created_at=order.created_at,
            updated_at=order.updated_at
        )
```

### 3. CSVプレゼンターパターン
```python
import csv
from io import StringIO
from typing import List
from datetime import datetime

class OrderCSVPresenter:
    @staticmethod
    def to_csv(orders: List[Order]) -> str:
        output = StringIO()
        writer = csv.writer(output)
        
        # ヘッダー行
        writer.writerow([
            "注文ID",
            "顧客ID",
            "顧客名",
            "商品数",
            "合計金額",
            "ステータス",
            "作成日時"
        ])
        
        # データ行
        for order in orders:
            writer.writerow([
                str(order.id),
                str(order.customer_id),
                order.customer_name,
                len(order.items),
                f"{float(order.total_amount):.2f}",
                order.status.value,
                order.created_at.strftime("%Y-%m-%d %H:%M:%S")
            ])
        
        return output.getvalue()

    @staticmethod
    def to_detailed_csv(orders: List[Order]) -> str:
        output = StringIO()
        writer = csv.writer(output)
        
        # ヘッダー行
        writer.writerow([
            "注文ID",
            "顧客ID",
            "顧客名",
            "商品ID",
            "商品名",
            "数量",
            "単価",
            "小計",
            "ステータス",
            "作成日時"
        ])
        
        # データ行
        for order in orders:
            for item in order.items:
                writer.writerow([
                    str(order.id),
                    str(order.customer_id),
                    order.customer_name,
                    str(item.product_id),
                    item.product_name,
                    item.quantity,
                    f"{float(item.unit_price):.2f}",
                    f"{float(item.subtotal):.2f}",
                    order.status.value,
                    order.created_at.strftime("%Y-%m-%d %H:%M:%S")
                ])
        
        return output.getvalue()
```

## 設計原則

### 1. 表示ロジックの分離
- ドメインロジックとの分離
- フォーマット変換の責務
- 表示用データの整形

### 2. データ変換の一貫性
- 型変換の標準化
- 日付/時刻のフォーマット
- 数値の精度管理

### 3. 出力形式の対応
- JSON/GraphQL/CSV
- 国際化対応
- メタデータの付加

## アンチパターン

### 1. 避けるべきプラクティス
- ドメインロジックの混入
- 不適切なデータ変換
- 非効率なメモリ使用

### 2. 改善パターン
- 適切な責務の分離
- 効率的なデータ変換
- メモリ使用の最適化

## レビューチェックリスト
- [ ] 表示ロジックが適切に分離されている
- [ ] データ変換が一貫している
- [ ] 出力形式が適切に対応している
- [ ] メモリ使用が最適化されている
- [ ] エラー処理が考慮されている

## 関連パターン
- コントローラーパターン（`controller_patterns.md`）
- DTOパターン（`dto_patterns.md`）
- バリデーションパターン（`validation_patterns.md`） 