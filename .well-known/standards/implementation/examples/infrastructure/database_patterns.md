# データベース実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[infrastructure-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、インフラストラクチャ層のデータベース実装パターンを定義します。
SQLAlchemyを使用したORMマッピング、クエリ最適化、トランザクション管理などのパターンを提供します。

## 実装パターン

### 1. ORMマッピングパターン
```python
from sqlalchemy import Column, Integer, String, ForeignKey, Decimal, DateTime
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

Base = declarative_base()

class OrderModel(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"))
    status = Column(String(50), nullable=False)
    total_amount = Column(Decimal, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("OrderItemModel", back_populates="order")
    customer = relationship("CustomerModel", back_populates="orders")

    def to_entity(self) -> Order:
        return Order(
            id=self.id,
            customer_id=self.customer_id,
            status=OrderStatus(self.status),
            total_amount=self.total_amount,
            items=[item.to_entity() for item in self.items],
            created_at=self.created_at,
            updated_at=self.updated_at
        )

    @classmethod
    def from_entity(cls, entity: Order) -> "OrderModel":
        return cls(
            id=entity.id,
            customer_id=entity.customer_id,
            status=entity.status.value,
            total_amount=entity.total_amount,
            items=[
                OrderItemModel.from_entity(item)
                for item in entity.items
            ]
        )
```

### 2. リポジトリ実装パターン
```python
from typing import Optional, List, Tuple
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

class SQLAlchemyOrderRepository(OrderRepository):
    def __init__(self, session_factory: AsyncSession):
        self._session_factory = session_factory

    async def find_by_id(self, id: UUID) -> Optional[Order]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(OrderModel)
                .options(joinedload(OrderModel.items))
                .where(OrderModel.id == id)
            )
            model = result.scalar_one_or_none()
            return model.to_entity() if model else None

    async def save(self, order: Order) -> None:
        async with self._session_factory() as session:
            model = OrderModel.from_entity(order)
            session.merge(model)
            await session.commit()

    async def find_by_customer(
        self,
        customer_id: UUID,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Order], int]:
        async with self._session_factory() as session:
            # 総件数の取得
            count_query = select(func.count(OrderModel.id)).where(
                OrderModel.customer_id == customer_id
            )
            total = await session.scalar(count_query)

            # 注文の取得
            query = (
                select(OrderModel)
                .options(joinedload(OrderModel.items))
                .where(OrderModel.customer_id == customer_id)
                .order_by(OrderModel.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
            result = await session.execute(query)
            models = result.scalars().all()
            orders = [model.to_entity() for model in models]

            return orders, total
```

### 3. クエリ最適化パターン
```python
from sqlalchemy import text, Index
from typing import List, Dict, Any

class OptimizedOrderQuery:
    def __init__(self, session_factory: AsyncSession):
        self._session_factory = session_factory

    async def find_orders_with_details(
        self,
        criteria: OrderSearchCriteria
    ) -> List[Dict[str, Any]]:
        async with self._session_factory() as session:
            # 最適化されたクエリの構築
            query = """
                SELECT 
                    o.id,
                    o.status,
                    o.total_amount,
                    o.created_at,
                    c.id as customer_id,
                    c.name as customer_name,
                    COUNT(oi.id) as item_count,
                    SUM(oi.quantity) as total_quantity
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE 1=1
            """
            params = {}

            if criteria.customer_id:
                query += " AND c.id = :customer_id"
                params["customer_id"] = criteria.customer_id

            if criteria.status:
                query += " AND o.status = :status"
                params["status"] = criteria.status

            if criteria.date_from:
                query += " AND o.created_at >= :date_from"
                params["date_from"] = criteria.date_from

            if criteria.date_to:
                query += " AND o.created_at <= :date_to"
                params["date_to"] = criteria.date_to

            query += """
                GROUP BY o.id, c.id
                ORDER BY o.created_at DESC
            """

            result = await session.execute(text(query), params)
            return [dict(row) for row in result]

    @staticmethod
    def create_indexes(metadata):
        # 検索パフォーマンスを向上させるインデックス
        Index(
            "ix_orders_customer_status",
            OrderModel.customer_id,
            OrderModel.status
        )
        Index(
            "ix_orders_created_at",
            OrderModel.created_at.desc()
        )
        Index(
            "ix_order_items_order_id",
            OrderItemModel.order_id
        )
```

## 設計原則

### 1. データアクセスの抽象化
- リポジトリパターンの活用
- ORMマッピングの整理
- クエリの最適化

### 2. パフォーマンスの最適化
- インデックス設計
- クエリチューニング
- N+1問題の回避

### 3. トランザクション管理
- 整合性の確保
- デッドロック対策
- リトライ戦略

## アンチパターン

### 1. 避けるべきプラクティス
- 生SQLの乱用
- 非効率なクエリ
- トランザクション境界の不明確さ

### 2. 改善パターン
- ORMの適切な活用
- クエリの最適化
- 明確なトランザクション境界

## レビューチェックリスト
- [ ] ORMマッピングが適切である
- [ ] クエリが最適化されている
- [ ] インデックスが適切に設定されている
- [ ] トランザクションが適切に管理されている
- [ ] パフォーマンスが考慮されている

## 関連パターン
- リポジトリパターン（`repository_patterns.md`）
- トランザクションパターン（`transaction_patterns.md`）
- キャッシュパターン（`cache_patterns.md`） 