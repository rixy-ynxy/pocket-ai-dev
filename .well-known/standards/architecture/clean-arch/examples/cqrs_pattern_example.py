"""
CQRSパターンの実装例
"""
from dataclasses import dataclass
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal

# コマンド側
@dataclass
class CreateOrderCommand:
    customer_id: UUID
    items: List["OrderItemDTO"]

class OrderCommandHandler:
    def __init__(
        self,
        repository: "OrderRepository",
        event_store: "EventStore"
    ):
        self._repository = repository
        self._event_store = event_store
    
    async def handle(self, command: CreateOrderCommand) -> UUID:
        order = Order.create(
            customer_id=command.customer_id,
            items=[
                OrderItem(
                    product_id=item.product_id,
                    quantity=item.quantity,
                    unit_price=item.unit_price
                )
                for item in command.items
            ]
        )
        
        await self._repository.save(order)
        
        for event in order.domain_events:
            await self._event_store.append(event)
        
        return order.id

# クエリ側
@dataclass
class OrderSummaryDTO:
    id: UUID
    customer_name: str
    total_amount: "Money"
    status: str
    created_at: datetime

class OrderQueryService:
    def __init__(self, read_db: "ReadOnlyDatabase"):
        self._db = read_db
    
    async def get_order_summary(
        self,
        order_id: UUID
    ) -> Optional[OrderSummaryDTO]:
        result = await self._db.execute("""
            SELECT 
                o.id,
                c.name as customer_name,
                o.total_amount,
                o.currency,
                o.status,
                o.created_at
            FROM order_summary o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.id = :order_id
        """, {"order_id": order_id})
        
        if not result:
            return None
        
        return OrderSummaryDTO(
            id=result.id,
            customer_name=result.customer_name,
            total_amount=Money(
                result.total_amount,
                result.currency
            ),
            status=result.status,
            created_at=result.created_at
        )

# イベントハンドラ（プロジェクション）
class OrderSummaryProjection:
    def __init__(self, read_db: "Database"):
        self._db = read_db
    
    async def handle_order_created(
        self,
        event: "OrderCreatedEvent"
    ) -> None:
        await self._db.execute("""
            INSERT INTO order_summary (
                id, customer_id, total_amount,
                currency, status, created_at
            ) VALUES (
                :id, :customer_id, :total_amount,
                :currency, :status, :created_at
            )
        """, {
            "id": event.order_id,
            "customer_id": event.customer_id,
            "total_amount": event.total_amount.amount,
            "currency": event.total_amount.currency,
            "status": "created",
            "created_at": event.timestamp
        })

    async def handle_order_confirmed(
        self,
        event: "OrderConfirmedEvent"
    ) -> None:
        await self._db.execute("""
            UPDATE order_summary
            SET status = :status,
                updated_at = :updated_at
            WHERE id = :id
        """, {
            "id": event.order_id,
            "status": "confirmed",
            "updated_at": event.timestamp
        }) 