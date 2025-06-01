# クリーンアーキテクチャ - インフラストラクチャパターン

@version[1.0.0]
@owner[architecture-team]
@category[clean-architecture]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、クリーンアーキテクチャにおけるインフラストラクチャ層の実装パターンを定義します。
外部システムとの連携、永続化、技術的な実装詳細を提供します。

## 実装パターン

### 1. リポジトリ実装パターン
```python
from typing import Optional
from sqlalchemy.orm import Session
from domain.models import Order
from domain.repositories import OrderRepository
from domain.value_objects import UniqueEntityId
from infrastructure.entities import OrderEntity

class SQLAlchemyOrderRepository(OrderRepository):
    def __init__(self, session: Session):
        self._session = session

    def find_by_id(self, id: UniqueEntityId) -> Optional[Order]:
        entity = self._session.query(OrderEntity).filter(
            OrderEntity.id == str(id)
        ).first()
        
        if not entity:
            return None
            
        return self._to_domain(entity)

    def save(self, order: Order) -> None:
        entity = self._to_entity(order)
        self._session.merge(entity)
        self._session.flush()

    def _to_domain(self, entity: OrderEntity) -> Order:
        return Order.reconstruct(
            id=UniqueEntityId(entity.id),
            items=[
                OrderItem(
                    product_id=UniqueEntityId(item.product_id),
                    quantity=item.quantity,
                    price=Money(item.price, Currency.JPY)
                ) for item in entity.items
            ],
            status=OrderStatus(entity.status)
        )

    def _to_entity(self, domain: Order) -> OrderEntity:
        return OrderEntity(
            id=str(domain.id),
            status=domain.status.value,
            items=[{
                'product_id': str(item.product_id),
                'quantity': item.quantity,
                'price': item.price.amount
            } for item in domain.items]
        )
```

### 2. トランザクション実装パターン
```python
from contextlib import contextmanager
from typing import Generator
from sqlalchemy.orm import Session
from domain.interfaces import UnitOfWork

class SQLAlchemyUnitOfWork(UnitOfWork):
    def __init__(self, session: Session):
        self._session = session

    @contextmanager
    def transaction(self) -> Generator[None, None, None]:
        try:
            yield
            self._session.commit()
        except Exception:
            self._session.rollback()
            raise
```

### 3. キャッシュパターン
```python
from typing import Optional, TypeVar, Generic
import json
import redis
from domain.interfaces import CacheService

T = TypeVar('T')

class RedisCacheService(CacheService, Generic[T]):
    def __init__(self, redis_client: redis.Redis):
        self._redis = redis_client

    def get(self, key: str) -> Optional[T]:
        data = self._redis.get(key)
        return json.loads(data) if data else None

    def set(self, key: str, value: T, ttl: Optional[int] = None) -> None:
        data = json.dumps(value)
        if ttl:
            self._redis.setex(key, ttl, data)
        else:
            self._redis.set(key, data)

    def delete(self, key: str) -> None:
        self._redis.delete(key)
```

### 4. メッセージングパターン
```python
from typing import Type, Callable, Any
from datetime import datetime
import json
import pika
from domain.events import DomainEvent
from domain.interfaces import EventBus

class RabbitMQEventBus(EventBus):
    def __init__(self, connection: pika.BlockingConnection):
        self._channel = connection.channel()
        self._exchange = 'domain_events'
        self._channel.exchange_declare(
            exchange=self._exchange,
            exchange_type='topic',
            durable=True
        )

    def publish(self, event: DomainEvent) -> None:
        routing_key = event.__class__.__name__
        self._channel.basic_publish(
            exchange=self._exchange,
            routing_key=routing_key,
            body=json.dumps({
                'type': routing_key,
                'data': event.to_dict(),
                'timestamp': datetime.now().isoformat()
            }),
            properties=pika.BasicProperties(
                delivery_mode=2  # メッセージの永続化
            )
        )

    def subscribe(
        self,
        event_type: Type[DomainEvent],
        handler: Callable[[DomainEvent], None]
    ) -> None:
        queue_name = f"{event_type.__name__}_queue"
        routing_key = event_type.__name__

        self._channel.queue_declare(queue=queue_name, durable=True)
        self._channel.queue_bind(
            queue=queue_name,
            exchange=self._exchange,
            routing_key=routing_key
        )

        def callback(ch: Any, method: Any, _: Any, body: bytes) -> None:
            event_data = json.loads(body)
            event = event_type.from_dict(event_data['data'])
            handler(event)
            ch.basic_ack(delivery_tag=method.delivery_tag)

        self._channel.basic_consume(
            queue=queue_name,
            on_message_callback=callback
        )
        self._channel.start_consuming()
```

## 設計原則

### 1. 技術詳細の隠蔽
- インフラストラクチャの実装詳細をインターフェースの背後に隠す
- ドメイン層への依存を避ける
- 技術選択の柔軟性を確保

### 2. 永続化の管理
- トランザクションの一貫性
- キャッシュ戦略
- パフォーマンス最適化

### 3. 外部システム連携
- 疎結合な統合
- エラーハンドリング
- リトライ戦略

## アンチパターン

### 1. 避けるべきプラクティス
- ドメインロジックの漏洩
- 技術的制約のドメインへの影響
- 過度な最適化

### 2. 改善パターン
- クリーンな抽象化
- 適切なエラー変換
- 効率的なリソース管理

## レビューチェックリスト
- [ ] インフラストラクチャの詳細が適切に隠蔽されている
- [ ] トランザクション管理が適切に実装されている
- [ ] キャッシュ戦略が効果的に適用されている
- [ ] エラーハンドリングが適切に実装されている
- [ ] パフォーマンスが考慮されている

## 関連パターン
- ドメインパターン（`domain_patterns.md`）
- アプリケーションパターン（`application_patterns.md`）
- インターフェースパターン（`interface_patterns.md`） 