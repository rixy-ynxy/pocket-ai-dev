"""
ヘキサゴナルアーキテクチャの実装例
"""
from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID
from decimal import Decimal

# ポート（インターフェース）定義
class OrderRepository(ABC):
    @abstractmethod
    async def find_by_id(self, id: UUID) -> Optional["Order"]:
        pass
    
    @abstractmethod
    async def save(self, order: "Order") -> None:
        pass

class PaymentGateway(ABC):
    @abstractmethod
    async def process_payment(
        self,
        order_id: UUID,
        amount: "Money"
    ) -> "PaymentResult":
        pass

class OrderNotificationPort(ABC):
    @abstractmethod
    async def notify_order_created(self, order: "Order") -> None:
        pass

# アダプター実装
class StripePaymentAdapter(PaymentGateway):
    def __init__(self, api_key: str):
        self._stripe = stripe.Client(api_key)
    
    async def process_payment(
        self,
        order_id: UUID,
        amount: Money
    ) -> PaymentResult:
        try:
            result = await self._stripe.charges.create(
                amount=int(amount.amount * 100),
                currency=amount.currency.lower(),
                metadata={"order_id": str(order_id)}
            )
            return PaymentResult(
                success=True,
                transaction_id=result.id
            )
        except stripe.error.StripeError as e:
            return PaymentResult(
                success=False,
                error_message=str(e)
            )

class EmailNotificationAdapter(OrderNotificationPort):
    def __init__(self, email_client: "EmailClient"):
        self._email = email_client
    
    async def notify_order_created(self, order: Order) -> None:
        await self._email.send(
            template="order_created",
            to=order.customer_email,
            context={
                "order_id": order.id,
                "total_amount": order.total_amount,
                "items": order.items
            }
        )

# ドメインサービス
class OrderService:
    def __init__(
        self,
        order_repository: OrderRepository,
        payment_gateway: PaymentGateway,
        notification_port: OrderNotificationPort
    ):
        self._order_repo = order_repository
        self._payment = payment_gateway
        self._notification = notification_port
    
    async def process_order(self, order: Order) -> None:
        # 支払い処理
        payment_result = await self._payment.process_payment(
            order_id=order.id,
            amount=order.total_amount
        )
        
        if not payment_result.success:
            raise PaymentError(payment_result.error_message)
        
        # 注文確定
        order.confirm()
        await self._order_repo.save(order)
        
        # 通知送信
        await self._notification.notify_order_created(order) 