# メッセージング実装パターン

@version[1.0.0]
@owner[implementation-team]
@category[infrastructure-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、インフラストラクチャ層のメッセージング実装パターンを定義します。
非同期メッセージング、イベント駆動アーキテクチャ、メッセージブローカーとの統合などのパターンを提供します。

## 実装パターン

### 1. メッセージパブリッシャーパターン
```python
from abc import ABC, abstractmethod
from typing import Any, Dict
import json
from datetime import datetime
import aio_pika
from uuid import UUID

class DomainEvent:
    def __init__(self, event_type: str, data: Dict[str, Any]):
        self.event_type = event_type
        self.data = data
        self.timestamp = datetime.utcnow()
        self.event_id = uuid.uuid4()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": str(self.event_id),
            "event_type": self.event_type,
            "data": self.data,
            "timestamp": self.timestamp.isoformat()
        }

class MessagePublisher(ABC):
    @abstractmethod
    async def publish(
        self,
        event: DomainEvent,
        routing_key: str
    ) -> None:
        pass

class RabbitMQPublisher(MessagePublisher):
    def __init__(self, connection_url: str, exchange_name: str):
        self._connection_url = connection_url
        self._exchange_name = exchange_name
        self._connection = None
        self._channel = None
        self._exchange = None

    async def connect(self) -> None:
        if not self._connection:
            self._connection = await aio_pika.connect_robust(
                self._connection_url
            )
            self._channel = await self._connection.channel()
            self._exchange = await self._channel.declare_exchange(
                self._exchange_name,
                aio_pika.ExchangeType.TOPIC,
                durable=True
            )

    async def publish(
        self,
        event: DomainEvent,
        routing_key: str
    ) -> None:
        await self.connect()
        message = aio_pika.Message(
            body=json.dumps(event.to_dict()).encode(),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            message_id=str(event.event_id)
        )
        await self._exchange.publish(
            message,
            routing_key=routing_key
        )
```

### 2. メッセージコンシューマーパターン
```python
from typing import Callable, Awaitable
import logging
from aio_pika import IncomingMessage
from functools import wraps

class MessageHandler:
    def __init__(self, logger: logging.Logger):
        self._logger = logger

    def handle_errors(self, func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(
            message: IncomingMessage
        ) -> None:
            async with message.process():
                try:
                    await func(message)
                except Exception as e:
                    self._logger.error(
                        f"Error processing message: {str(e)}",
                        exc_info=True
                    )
                    # メッセージを Dead Letter Queue に送信
                    await message.reject(requeue=False)
        return wrapper

class OrderEventConsumer:
    def __init__(
        self,
        connection_url: str,
        queue_name: str,
        handler: MessageHandler
    ):
        self._connection_url = connection_url
        self._queue_name = queue_name
        self._handler = handler
        self._logger = logging.getLogger(__name__)

    async def start(self) -> None:
        connection = await aio_pika.connect_robust(
            self._connection_url
        )
        channel = await connection.channel()
        
        # Dead Letter Exchange の設定
        await channel.declare_exchange(
            "dlx",
            aio_pika.ExchangeType.DIRECT,
            durable=True
        )
        
        # キューの宣言
        queue = await channel.declare_queue(
            self._queue_name,
            durable=True,
            arguments={
                "x-dead-letter-exchange": "dlx",
                "x-dead-letter-routing-key": f"dlq.{self._queue_name}"
            }
        )

        await queue.consume(self._handler.handle_errors(self._process_message))
        self._logger.info(f"Started consuming from queue: {self._queue_name}")

    async def _process_message(self, message: IncomingMessage) -> None:
        try:
            payload = json.loads(message.body.decode())
            event_type = payload.get("event_type")
            
            if event_type == "order_created":
                await self._handle_order_created(payload)
            elif event_type == "order_cancelled":
                await self._handle_order_cancelled(payload)
            else:
                self._logger.warning(f"Unknown event type: {event_type}")
                
        except json.JSONDecodeError:
            self._logger.error("Invalid JSON payload")
            raise
```

### 3. イベントストリーミングパターン
```python
from typing import AsyncGenerator, List
import asyncio
from datetime import datetime, timedelta

class EventStore:
    def __init__(self, session_factory: AsyncSession):
        self._session_factory = session_factory

    async def append_event(
        self,
        event: DomainEvent,
        aggregate_id: UUID
    ) -> None:
        async with self._session_factory() as session:
            event_model = EventModel(
                event_id=event.event_id,
                aggregate_id=aggregate_id,
                event_type=event.event_type,
                data=event.to_dict(),
                timestamp=event.timestamp
            )
            session.add(event_model)
            await session.commit()

    async def get_events(
        self,
        aggregate_id: UUID
    ) -> List[DomainEvent]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(EventModel)
                .where(EventModel.aggregate_id == aggregate_id)
                .order_by(EventModel.timestamp)
            )
            events = result.scalars().all()
            return [
                DomainEvent(
                    event_type=event.event_type,
                    data=event.data
                )
                for event in events
            ]

class EventStream:
    def __init__(
        self,
        publisher: MessagePublisher,
        batch_size: int = 100,
        interval: float = 1.0
    ):
        self._publisher = publisher
        self._batch_size = batch_size
        self._interval = interval
        self._running = False

    async def start_streaming(
        self,
        event_generator: AsyncGenerator[DomainEvent, None]
    ) -> None:
        self._running = True
        batch = []

        async for event in event_generator:
            batch.append(event)
            
            if len(batch) >= self._batch_size:
                await self._publish_batch(batch)
                batch = []
                await asyncio.sleep(self._interval)

            if not self._running:
                break

        if batch:
            await self._publish_batch(batch)

    async def _publish_batch(
        self,
        events: List[DomainEvent]
    ) -> None:
        for event in events:
            routing_key = f"events.{event.event_type}"
            try:
                await self._publisher.publish(event, routing_key)
            except Exception as e:
                logging.error(
                    f"Failed to publish event: {str(e)}",
                    exc_info=True
                )
```

## 設計原則

### 1. メッセージングの信頼性
- 配信保証
- 冪等性の確保
- エラー処理

### 2. スケーラビリティ
- 非同期処理
- バッチ処理
- 負荷分散

### 3. モニタリングと運用
- ログ記録
- メトリクス収集
- アラート設定

## アンチパターン

### 1. 避けるべきプラクティス
- 同期的な処理の過剰使用
- エラーハンドリングの不備
- メッセージの永続化忘れ

### 2. 改善パターン
- 非同期処理の活用
- 適切なエラー処理
- メッセージの永続化

## レビューチェックリスト
- [ ] メッセージの信頼性が確保されている
- [ ] エラー処理が適切に実装されている
- [ ] スケーラビリティが考慮されている
- [ ] モニタリングが適切に設定されている
- [ ] 運用面が考慮されている

## 関連パターン
- イベントソーシングパターン（`event_sourcing_patterns.md`）
- CQRSパターン（`cqrs_patterns.md`）
- 永続化パターン（`persistence_patterns.md`） 