# リポジトリ実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[domain-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、ドメインリポジトリの実装パターンを定義します。
永続化の抽象化、集約の管理、クエリの最適化などのパターンを提供します。

## 実装パターン

### 1. 基本リポジトリパターン
```python
from abc import ABC, abstractmethod
from typing import Optional, List, Protocol
from uuid import UUID
import asyncio
from datetime import datetime

class Repository(Protocol[T]):
    @abstractmethod
    async def find_by_id(self, id: UUID) -> Optional[T]:
        pass

    @abstractmethod
    async def save(self, entity: T) -> None:
        pass

    @abstractmethod
    async def delete(self, id: UUID) -> None:
        pass

class OrderRepository(Repository[Order]):
    def __init__(self, session_factory: SessionFactory):
        self._session_factory = session_factory

    async def find_by_id(self, id: UUID) -> Optional[Order]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(OrderModel).where(OrderModel.id == id)
            )
            model = result.scalar_one_or_none()
            return model.to_entity() if model else None

    async def save(self, order: Order) -> None:
        async with self._session_factory() as session:
            model = OrderModel.from_entity(order)
            session.merge(model)
            await session.commit()

    async def delete(self, id: UUID) -> None:
        async with self._session_factory() as session:
            await session.execute(
                delete(OrderModel).where(OrderModel.id == id)
            )
            await session.commit()
```

### 2. 集約リポジトリパターン
```python
class CustomerRepository(Repository[Customer]):
    def __init__(self, session_factory: SessionFactory):
        self._session_factory = session_factory

    async def find_by_id(self, id: UUID) -> Optional[Customer]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(CustomerModel)
                .options(
                    joinedload(CustomerModel.addresses),
                    joinedload(CustomerModel.payment_methods)
                )
                .where(CustomerModel.id == id)
            )
            model = result.scalar_one_or_none()
            return model.to_entity() if model else None

    async def save(self, customer: Customer) -> None:
        async with self._session_factory() as session:
            async with session.begin():
                # メインエンティティの保存
                customer_model = CustomerModel.from_entity(customer)
                session.merge(customer_model)

                # 関連エンティティの保存
                for address in customer.addresses:
                    address_model = AddressModel.from_entity(address)
                    address_model.customer_id = customer.id
                    session.merge(address_model)

                # 削除された関連エンティティの処理
                await session.execute(
                    delete(AddressModel).where(
                        and_(
                            AddressModel.customer_id == customer.id,
                            AddressModel.id.not_in([
                                a.id for a in customer.addresses
                            ])
                        )
                    )
                )

    async def find_by_email(self, email: str) -> Optional[Customer]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(CustomerModel)
                .options(joinedload(CustomerModel.addresses))
                .where(CustomerModel.email == email)
            )
            model = result.scalar_one_or_none()
            return model.to_entity() if model else None
```

### 3. クエリ最適化パターン
```python
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class OrderSearchCriteria:
    customer_id: Optional[UUID] = None
    status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None

class OrderQueryRepository:
    def __init__(self, session_factory: SessionFactory):
        self._session_factory = session_factory

    async def search(
        self,
        criteria: OrderSearchCriteria,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Order], int]:
        async with self._session_factory() as session:
            query = select(OrderModel)

            # 検索条件の適用
            if criteria.customer_id:
                query = query.where(
                    OrderModel.customer_id == criteria.customer_id
                )
            if criteria.status:
                query = query.where(OrderModel.status == criteria.status)
            if criteria.date_from:
                query = query.where(
                    OrderModel.created_at >= criteria.date_from
                )
            if criteria.date_to:
                query = query.where(
                    OrderModel.created_at <= criteria.date_to
                )
            if criteria.min_amount:
                query = query.where(
                    OrderModel.total_amount >= criteria.min_amount
                )
            if criteria.max_amount:
                query = query.where(
                    OrderModel.total_amount <= criteria.max_amount
                )

            # 総件数の取得
            count_query = select(func.count()).select_from(query.subquery())
            total = await session.scalar(count_query)

            # ページネーション
            query = query.offset((page - 1) * page_size).limit(page_size)

            # 結果の取得
            result = await session.execute(query)
            models = result.scalars().all()
            orders = [model.to_entity() for model in models]

            return orders, total

    async def find_with_details(
        self,
        id: UUID
    ) -> Optional[Dict[str, Any]]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    OrderModel,
                    CustomerModel,
                    func.count(OrderItemModel.id).label("item_count"),
                    func.sum(
                        OrderItemModel.price * OrderItemModel.quantity
                    ).label("total_amount")
                )
                .join(CustomerModel)
                .join(OrderItemModel)
                .where(OrderModel.id == id)
                .group_by(OrderModel, CustomerModel)
            )
            row = result.one_or_none()
            if not row:
                return None

            order, customer, item_count, total_amount = row
            return {
                "order": order.to_entity(),
                "customer": customer.to_entity(),
                "item_count": item_count,
                "total_amount": total_amount
            }
```

## 設計原則

### 1. 永続化の抽象化
- インフラストラクチャの隠蔽
- ドメインモデルの独立性
- トランザクション管理

### 2. 集約の整合性
- 集約ルートを通じたアクセス
- 関連エンティティの同期
- 整合性制約の保証

### 3. クエリの最適化
- 効率的なデータ取得
- N+1問題の回避
- インデックスの活用

## アンチパターン

### 1. 避けるべきプラクティス
- ドメインロジックの漏洩
- 過度な結合
- 非効率なクエリ

### 2. 改善パターン
- 明確な責務の分離
- 適切な粒度の設定
- クエリの最適化

## レビューチェックリスト
- [ ] 永続化が適切に抽象化されている
- [ ] 集約の整合性が保たれている
- [ ] クエリが最適化されている
- [ ] トランザクションが適切に管理されている
- [ ] インフラストラクチャの詳細が隠蔽されている

## 関連パターン
- エンティティパターン（`entity_patterns.md`）
- 値オブジェクトパターン（`value_object_patterns.md`）
- インフラストラクチャパターン（`infrastructure_patterns.md`） 