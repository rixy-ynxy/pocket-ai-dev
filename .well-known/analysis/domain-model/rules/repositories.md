# リポジトリパターン

@version[1.0.0]
@owner[domain-team]
@category[domain-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、ドメイン駆動設計におけるリポジトリパターンを定義します。
永続化の抽象化、集約単位の操作、トランザクション境界などのパターンを提供します。

## 実装パターン

### 1. 基本リポジトリパターン
```python
from abc import ABC, abstractmethod
from typing import Optional, List, TypeVar, Generic
from uuid import UUID

T = TypeVar('T', bound=AggregateRoot)

class Repository(Generic[T], ABC):
    @abstractmethod
    async def find_by_id(self, id: UUID) -> Optional[T]:
        pass

    @abstractmethod
    async def save(self, aggregate: T) -> None:
        pass

    @abstractmethod
    async def delete(self, aggregate: T) -> None:
        pass

class UnitOfWork(ABC):
    @abstractmethod
    async def __aenter__(self) -> 'UnitOfWork':
        pass

    @abstractmethod
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        pass

    @abstractmethod
    async def commit(self) -> None:
        pass

    @abstractmethod
    async def rollback(self) -> None:
        pass
```

### 2. SQLAlchemyリポジトリパターン
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

class SQLAlchemyRepository(Repository[T]):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def find_by_id(self, id: UUID) -> Optional[T]:
        stmt = (
            select(self._get_model_class())
            .options(joinedload('*'))
            .where(self._get_model_class().id == id)
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_aggregate() if model else None

    async def save(self, aggregate: T) -> None:
        model = self._get_model_class().from_aggregate(aggregate)
        self._session.merge(model)
        
        # ドメインイベントの処理
        events = aggregate.clear_domain_events()
        for event in events:
            await self._publish_event(event)

    async def delete(self, aggregate: T) -> None:
        stmt = (
            select(self._get_model_class())
            .where(self._get_model_class().id == aggregate.id)
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            await self._session.delete(model)

    @abstractmethod
    def _get_model_class(self) -> Type[Any]:
        pass

    async def _publish_event(self, event: DomainEvent) -> None:
        # イベントの永続化と発行
        event_model = EventModel(
            id=uuid4(),
            aggregate_id=event.aggregate_id,
            aggregate_type=event.aggregate_type,
            event_type=event.event_type,
            event_data=event.to_dict(),
            occurred_on=event.occurred_on
        )
        self._session.add(event_model)

class SQLAlchemyUnitOfWork(UnitOfWork):
    def __init__(self, session_factory: Callable[[], AsyncSession]):
        self._session_factory = session_factory
        self._session: Optional[AsyncSession] = None

    async def __aenter__(self) -> 'SQLAlchemyUnitOfWork':
        self._session = self._session_factory()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type:
            await self.rollback()
        await self._session.close()

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()

    def orders(self) -> OrderRepository:
        return OrderRepository(self._session)

    def inventory(self) -> InventoryRepository:
        return InventoryRepository(self._session)
```

### 3. 具体的なリポジトリ実装パターン
```python
class OrderRepository(SQLAlchemyRepository[OrderAggregate]):
    def _get_model_class(self) -> Type[OrderModel]:
        return OrderModel

    async def find_by_customer(
        self,
        customer_id: UUID,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[OrderAggregate], int]:
        # 総件数の取得
        count_stmt = (
            select(func.count(OrderModel.id))
            .where(OrderModel.customer_id == customer_id)
        )
        total = await self._session.scalar(count_stmt)

        # 注文の取得
        stmt = (
            select(OrderModel)
            .options(joinedload(OrderModel.items))
            .where(OrderModel.customer_id == customer_id)
            .order_by(OrderModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        orders = [model.to_aggregate() for model in models]

        return orders, total

    async def find_by_status(
        self,
        status: OrderStatus,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[OrderAggregate], int]:
        # 総件数の取得
        count_stmt = (
            select(func.count(OrderModel.id))
            .where(OrderModel.status == status)
        )
        total = await self._session.scalar(count_stmt)

        # 注文の取得
        stmt = (
            select(OrderModel)
            .options(joinedload(OrderModel.items))
            .where(OrderModel.status == status)
            .order_by(OrderModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        orders = [model.to_aggregate() for model in models]

        return orders, total

class InventoryRepository(SQLAlchemyRepository[InventoryAggregate]):
    def _get_model_class(self) -> Type[InventoryModel]:
        return InventoryModel

    async def find_by_product(
        self,
        product_id: UUID
    ) -> Optional[InventoryAggregate]:
        stmt = (
            select(InventoryModel)
            .where(InventoryModel.product_id == product_id)
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return model.to_aggregate() if model else None

    async def find_low_stock(
        self,
        threshold: int,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[InventoryAggregate], int]:
        # 総件数の取得
        count_stmt = (
            select(func.count(InventoryModel.id))
            .where(InventoryModel.quantity <= threshold)
        )
        total = await self._session.scalar(count_stmt)

        # 在庫の取得
        stmt = (
            select(InventoryModel)
            .where(InventoryModel.quantity <= threshold)
            .order_by(InventoryModel.quantity)
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        inventory = [model.to_aggregate() for model in models]

        return inventory, total
```

## 設計原則

### 1. 永続化の抽象化
- インフラストラクチャの隠蔽
- ドメインモデルの独立性
- テスト容易性

### 2. 集約単位の操作
- 整合性の保証
- トランザクション境界
- 並行性制御

### 3. パフォーマンス最適化
- 効率的なクエリ
- 適切なインデックス
- キャッシュ戦略

## アンチパターン

### 1. 避けるべきプラクティス
- 集約境界の無視
- 過度な結合
- N+1問題

### 2. 改善パターン
- 集約境界の尊重
- 適切な結合戦略
- クエリの最適化

## レビューチェックリスト
- [ ] 永続化が適切に抽象化されている
- [ ] 集約単位の操作が保証されている
- [ ] トランザクション境界が明確である
- [ ] パフォーマンスが最適化されている
- [ ] テストが容易である

## 関連パターン
- エンティティパターン（`entity_patterns.md`）
- 値オブジェクトパターン（`value_object_patterns.md`）
- 集約パターン（`aggregate_patterns.md`） 