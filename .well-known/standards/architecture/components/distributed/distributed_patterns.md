# 分散システムパターン

@version[1.0.0]
@owner[architecture-team]
@category[distributed-systems]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、分散システムにおける主要なアーキテクチャパターンを定義します。
マイクロサービス、イベント駆動アーキテクチャ、および分散データ管理のパターンを提供します。

## 実装パターン

### 1. マイクロサービス通信パターン
```python
from dataclasses import dataclass
from typing import Optional, Dict, Any
import httpx
from fastapi import FastAPI, HTTPException

@dataclass
class ServiceDiscovery:
    def __init__(self, consul_url: str):
        self._consul_url = consul_url
        self._client = httpx.AsyncClient()

    async def get_service_url(self, service_name: str) -> str:
        response = await self._client.get(
            f"{self._consul_url}/v1/health/service/{service_name}"
        )
        services = response.json()
        if not services:
            raise ServiceNotFoundException(f"Service {service_name} not found")
        return f"http://{services[0]['Service']['Address']}:{services[0]['Service']['Port']}"

class ServiceClient:
    def __init__(self, service_discovery: ServiceDiscovery):
        self._service_discovery = service_discovery
        self._client = httpx.AsyncClient()

    async def call_service(
        self,
        service_name: str,
        path: str,
        method: str = "GET",
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        service_url = await self._service_discovery.get_service_url(service_name)
        response = await self._client.request(
            method=method,
            url=f"{service_url}{path}",
            json=data
        )
        return response.json()
```

### 2. イベント駆動パターン
```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Callable
import json
import aio_pika
from datetime import datetime

class EventPublisher:
    def __init__(self, connection: aio_pika.Connection):
        self._connection = connection
        self._channel = None

    async def publish(
        self,
        event_type: str,
        data: Dict[str, Any],
        routing_key: str
    ) -> None:
        if not self._channel:
            self._channel = await self._connection.channel()
            await self._channel.declare_exchange(
                "domain_events",
                aio_pika.ExchangeType.TOPIC
            )

        message = aio_pika.Message(
            body=json.dumps({
                "type": event_type,
                "data": data,
                "timestamp": datetime.now().isoformat()
            }).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT
        )

        await self._channel.default_exchange.publish(
            message,
            routing_key=routing_key
        )

class EventSubscriber:
    def __init__(self, connection: aio_pika.Connection):
        self._connection = connection
        self._channel = None
        self._handlers: Dict[str, Callable] = {}

    async def subscribe(
        self,
        event_type: str,
        handler: Callable[[Dict[str, Any]], None]
    ) -> None:
        if not self._channel:
            self._channel = await self._connection.channel()
            await self._channel.declare_exchange(
                "domain_events",
                aio_pika.ExchangeType.TOPIC
            )

        queue = await self._channel.declare_queue(
            f"{event_type}_queue",
            durable=True
        )
        await queue.bind(
            exchange="domain_events",
            routing_key=event_type
        )

        self._handlers[event_type] = handler
        await queue.consume(self._message_handler)

    async def _message_handler(
        self,
        message: aio_pika.IncomingMessage
    ) -> None:
        async with message.process():
            event = json.loads(message.body.decode())
            handler = self._handlers.get(event["type"])
            if handler:
                await handler(event["data"])
```

### 3. 分散トランザクションパターン
```python
from enum import Enum
from typing import List, Optional
import asyncio

class TransactionStatus(Enum):
    PENDING = "PENDING"
    COMMITTED = "COMMITTED"
    ROLLED_BACK = "ROLLED_BACK"

class Participant:
    def __init__(self, name: str):
        self.name = name
        self.status = TransactionStatus.PENDING

    async def prepare(self) -> bool:
        # 実際のリソースのロックと準備
        return True

    async def commit(self) -> None:
        self.status = TransactionStatus.COMMITTED

    async def rollback(self) -> None:
        self.status = TransactionStatus.ROLLED_BACK

class TwoPhaseCommit:
    def __init__(self, participants: List[Participant]):
        self.participants = participants
        self._coordinator_log: List[str] = []

    async def execute(self) -> bool:
        # フェーズ1: 準備
        prepare_results = await asyncio.gather(
            *[p.prepare() for p in self.participants]
        )

        if all(prepare_results):
            # フェーズ2: コミット
            try:
                await asyncio.gather(
                    *[p.commit() for p in self.participants]
                )
                self._log("All participants committed successfully")
                return True
            except Exception as e:
                self._log(f"Commit failed: {str(e)}")
                await self._rollback()
                return False
        else:
            self._log("Prepare phase failed")
            await self._rollback()
            return False

    async def _rollback(self) -> None:
        await asyncio.gather(
            *[p.rollback() for p in self.participants]
        )
        self._log("Rolled back all participants")

    def _log(self, message: str) -> None:
        self._coordinator_log.append(
            f"{datetime.now().isoformat()}: {message}"
        )
```

## 設計原則

### 1. サービス分割
- 適切な粒度でのサービス分割
- 明確な境界と責務
- 独立したデプロイメント

### 2. 通信戦略
- 同期/非同期通信の使い分け
- エラー処理とリトライ
- サーキットブレーカー

### 3. データ管理
- データの一貫性
- 分散トランザクション
- CAP定理の考慮

## アンチパターン

### 1. 避けるべきプラクティス
- 過度な同期通信
- 分散モノリス
- 不適切なサービス境界

### 2. 改善パターン
- イベント駆動アーキテクチャの活用
- 適切なサービス粒度
- 非同期通信の活用

## レビューチェックリスト
- [ ] サービス境界が適切に定義されている
- [ ] 通信パターンが効率的に設計されている
- [ ] エラーハンドリングが適切に実装されている
- [ ] データの一貫性が保証されている
- [ ] 監視とロギングが考慮されている

## 関連パターン
- スケーラビリティパターン（`scalability_patterns.md`）
- レジリエンスパターン（`resilience_patterns.md`）
- セキュリティパターン（`security_patterns.md`） 