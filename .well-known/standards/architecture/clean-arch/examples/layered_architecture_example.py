"""
レイヤードアーキテクチャの実装例
"""
from abc import ABC, abstractmethod
from typing import Optional, List
from dataclasses import dataclass
from uuid import UUID, uuid4
from decimal import Decimal
from datetime import datetime

# アプリケーション層
@dataclass
class CreateOrderCommand:
    customer_id: UUID
    items: List["OrderItemDTO"]

@dataclass
class OrderResponse:
    order_id: UUID
    status: str
    total_amount: "Money"

class OrderApplicationService:
    def __init__(
        self,
        order_repository: "OrderRepository",
        customer_repository: "CustomerRepository",
        unit_of_work: "UnitOfWork"
    ):
        self._order_repo = order_repository
        self._customer_repo = customer_repository
        self._uow = unit_of_work
    
    async def create_order(
        self,
        command: CreateOrderCommand
    ) -> OrderResponse:
        async with self._uow:
            customer = await self._customer_repo.find_by_id(
                command.customer_id
            )
            if not customer:
                raise CustomerNotFoundError()
            
            order = Order.create(
                customer_id=customer.id,
                items=[
                    OrderItem(
                        product_id=item.product_id,
                        quantity=item.quantity,
                        unit_price=item.unit_price
                    )
                    for item in command.items
                ]
            )
            
            await self._order_repo.save(order)
            await self._uow.commit()
            
            return OrderResponse(
                order_id=order.id,
                status=order.status.value,
                total_amount=order.total_amount
            )

# ドメイン層
class Order(AggregateRoot):
    def __init__(
        self,
        id: UUID,
        customer_id: UUID,
        status: "OrderStatus" = OrderStatus.CREATED
    ):
        super().__init__(id)
        self._customer_id = customer_id
        self._status = status
        self._items: List[OrderItem] = []
        self._total_amount = Money(Decimal("0"), "JPY")
    
    @classmethod
    def create(
        cls,
        customer_id: UUID,
        items: List["OrderItem"]
    ) -> "Order":
        order = cls(
            id=uuid4(),
            customer_id=customer_id
        )
        
        for item in items:
            order.add_item(item)
        
        return order
    
    def add_item(self, item: "OrderItem") -> None:
        if self._status != OrderStatus.CREATED:
            raise OrderError("確定済みの注文には商品を追加できません")
        
        self._items.append(item)
        self._total_amount = self._total_amount.add(
            item.unit_price.multiply(Decimal(str(item.quantity)))
        )

# インフラストラクチャ層
class PostgresOrderRepository(OrderRepository):
    def __init__(self, session_factory: "SessionFactory"):
        self._session_factory = session_factory
    
    async def find_by_id(self, id: UUID) -> Optional[Order]:
        session = self._session_factory()
        row = await session.execute(
            select(OrderModel).where(OrderModel.id == id)
        ).first()
        
        if not row:
            return None
        
        return self._to_entity(row[0])
    
    async def save(self, order: Order) -> None:
        session = self._session_factory()
        model = await session.get(OrderModel, order.id)
        
        if model:
            self._update_model(model, order)
        else:
            model = self._to_model(order)
            session.add(model) 