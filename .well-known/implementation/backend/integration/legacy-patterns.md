# レガシーパターン (Legacy Patterns)

## 概要

レガシーシステムの統合、移行、モダナイゼーションのための実証済みパターンを定義します。既存システムを段階的に現代化し、新旧システムの共存を実現するアーキテクチャパターンとベストプラクティスを提供します。

## レガシー統合パターン

### 1. ストラングラーフィグパターン

#### **段階的置換戦略**
```python
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import asyncio

class LegacyService(ABC):
    """レガシーサービスのインターフェース"""
    
    @abstractmethod
    async def process_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        pass

class ModernService(ABC):
    """モダンサービスのインターフェース"""
    
    @abstractmethod
    async def process_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        pass

class StranglerFacade:
    """ストラングラーファサードパターン実装"""
    
    def __init__(self, legacy_service: LegacyService, modern_service: ModernService):
        self.legacy_service = legacy_service
        self.modern_service = modern_service
        self.migration_rules = {}
        self.feature_flags = {}
    
    def add_migration_rule(self, condition: str, target: str):
        """移行ルールを追加"""
        self.migration_rules[condition] = target
    
    def set_feature_flag(self, feature: str, enabled: bool, percentage: float = 100.0):
        """フィーチャーフラグ設定"""
        self.feature_flags[feature] = {"enabled": enabled, "percentage": percentage}
    
    async def route_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """リクエストのルーティング決定"""
        
        # フィーチャーフラグによるルーティング
        if self._should_use_modern_service(request):
            try:
                return await self.modern_service.process_request(request)
            except Exception as e:
                # フォールバック: レガシーサービス使用
                print(f"Modern service failed, falling back to legacy: {e}")
                return await self.legacy_service.process_request(request)
        else:
            return await self.legacy_service.process_request(request)
    
    def _should_use_modern_service(self, request: Dict[str, Any]) -> bool:
        """モダンサービスを使用すべきかの判定"""
        import random
        
        # リクエストタイプベースのルーティング
        request_type = request.get("type", "unknown")
        if request_type in self.migration_rules:
            target = self.migration_rules[request_type]
            if target == "modern":
                return True
        
        # フィーチャーフラグによるカナリア展開
        feature_name = f"modern_{request_type}"
        if feature_name in self.feature_flags:
            flag = self.feature_flags[feature_name]
            if flag["enabled"]:
                return random.random() * 100 < flag["percentage"]
        
        return False

# 使用例
class LegacyUserService(LegacyService):
    async def process_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        # レガシーシステムへのSOAPコール
        return {"user_id": request["id"], "source": "legacy", "name": "John Doe"}

class ModernUserService(ModernService):
    async def process_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        # モダンなREST APIコール
        return {"user_id": request["id"], "source": "modern", "name": "John Doe", "email": "john@example.com"}

# ストラングラーファサード設定
facade = StranglerFacade(LegacyUserService(), ModernUserService())
facade.add_migration_rule("user_profile", "modern")
facade.set_feature_flag("modern_user_profile", True, 25.0)  # 25%のトラフィックをモダンサービスに
```

### 2. アンチコラプションレイヤー

#### **境界コンテキスト保護**
```python
from dataclasses import dataclass
from typing import List, Optional
import xml.etree.ElementTree as ET

@dataclass
class ModernUser:
    """モダンシステムのユーザーモデル"""
    id: str
    email: str
    first_name: str
    last_name: str
    is_active: bool
    created_at: str
    metadata: dict

@dataclass
class LegacyUserData:
    """レガシーシステムからの生データ"""
    xml_data: str
    soap_response: dict

class AntiCorruptionLayer:
    """アンチコラプションレイヤー実装"""
    
    def __init__(self):
        self.field_mappings = {
            "USER_ID": "id",
            "EMAIL_ADDR": "email", 
            "FNAME": "first_name",
            "LNAME": "last_name",
            "ACTIVE_FLAG": "is_active",
            "CREATE_DATE": "created_at"
        }
        self.transformations = {}
    
    def add_transformation(self, field: str, transformer_func):
        """フィールド変換関数を追加"""
        self.transformations[field] = transformer_func
    
    def translate_to_modern(self, legacy_data: LegacyUserData) -> ModernUser:
        """レガシーデータからモダンモデルへの変換"""
        
        # XML解析
        if legacy_data.xml_data:
            parsed_data = self._parse_legacy_xml(legacy_data.xml_data)
        else:
            parsed_data = legacy_data.soap_response
        
        # フィールドマッピング適用
        modern_data = {}
        for legacy_field, modern_field in self.field_mappings.items():
            if legacy_field in parsed_data:
                value = parsed_data[legacy_field]
                
                # カスタム変換関数適用
                if modern_field in self.transformations:
                    value = self.transformations[modern_field](value)
                
                modern_data[modern_field] = value
        
        # デフォルト値設定
        modern_data.setdefault("metadata", {})
        modern_data.setdefault("is_active", True)
        
        return ModernUser(**modern_data)
    
    def translate_to_legacy(self, modern_user: ModernUser) -> dict:
        """モダンモデルからレガシー形式への変換"""
        legacy_data = {}
        
        reverse_mappings = {v: k for k, v in self.field_mappings.items()}
        
        for modern_field, value in modern_user.__dict__.items():
            if modern_field in reverse_mappings:
                legacy_field = reverse_mappings[modern_field]
                
                # 逆変換適用
                if f"reverse_{modern_field}" in self.transformations:
                    value = self.transformations[f"reverse_{modern_field}"](value)
                
                legacy_data[legacy_field] = value
        
        return legacy_data
    
    def _parse_legacy_xml(self, xml_data: str) -> dict:
        """レガシーXMLの解析"""
        root = ET.fromstring(xml_data)
        data = {}
        
        for child in root:
            data[child.tag] = child.text
        
        return data

# 使用例
acl = AntiCorruptionLayer()

# カスタム変換関数の追加
acl.add_transformation("is_active", lambda x: x.upper() == "Y")
acl.add_transformation("created_at", lambda x: f"{x}T00:00:00Z")
acl.add_transformation("reverse_is_active", lambda x: "Y" if x else "N")

# レガシーデータの変換
legacy_xml = """
<USER>
    <USER_ID>12345</USER_ID>
    <EMAIL_ADDR>user@example.com</EMAIL_ADDR>
    <FNAME>John</FNAME>
    <LNAME>Doe</LNAME>
    <ACTIVE_FLAG>Y</ACTIVE_FLAG>
    <CREATE_DATE>2023-01-15</CREATE_DATE>
</USER>
"""

legacy_data = LegacyUserData(xml_data=legacy_xml, soap_response={})
modern_user = acl.translate_to_modern(legacy_data)
```

### 3. リファクタリング支援パターン

#### **段階的リファクタリング**
```python
from abc import ABC, abstractmethod
from typing import Any, Callable, List
import inspect
import asyncio

class RefactoringStep(ABC):
    """リファクタリング手順の抽象基底クラス"""
    
    @abstractmethod
    async def execute(self, context: dict) -> dict:
        pass
    
    @abstractmethod
    def rollback(self, context: dict) -> dict:
        pass
    
    @abstractmethod
    def validate(self, context: dict) -> bool:
        pass

class DatabaseMigrationStep(RefactoringStep):
    """データベース移行手順"""
    
    def __init__(self, migration_sql: str, rollback_sql: str):
        self.migration_sql = migration_sql
        self.rollback_sql = rollback_sql
    
    async def execute(self, context: dict) -> dict:
        db = context["database"]
        try:
            await db.execute(self.migration_sql)
            context["migration_completed"] = True
            return context
        except Exception as e:
            context["error"] = str(e)
            raise e
    
    def rollback(self, context: dict) -> dict:
        db = context["database"]
        db.execute(self.rollback_sql)
        context["migration_completed"] = False
        return context
    
    def validate(self, context: dict) -> bool:
        # マイグレーション結果の検証
        db = context["database"]
        result = db.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'new_users'")
        return result[0][0] > 0

class CodeRefactoringStep(RefactoringStep):
    """コードリファクタリング手順"""
    
    def __init__(self, old_function: Callable, new_function: Callable):
        self.old_function = old_function
        self.new_function = new_function
        self.function_registry = {}
    
    async def execute(self, context: dict) -> dict:
        # 関数の置き換え
        module = context.get("target_module")
        if module:
            old_name = self.old_function.__name__
            self.function_registry[old_name] = getattr(module, old_name, None)
            setattr(module, old_name, self.new_function)
        
        context["function_replaced"] = True
        return context
    
    def rollback(self, context: dict) -> dict:
        module = context.get("target_module")
        if module:
            old_name = self.old_function.__name__
            if old_name in self.function_registry:
                setattr(module, old_name, self.function_registry[old_name])
        
        context["function_replaced"] = False
        return context
    
    def validate(self, context: dict) -> bool:
        # 新しい関数が正しく動作するかテスト
        try:
            test_input = context.get("test_input", {})
            result = self.new_function(**test_input)
            return result is not None
        except Exception:
            return False

class RefactoringOrchestrator:
    """リファクタリング手順の統合管理"""
    
    def __init__(self):
        self.steps: List[RefactoringStep] = []
        self.completed_steps: List[int] = []
    
    def add_step(self, step: RefactoringStep):
        """リファクタリング手順を追加"""
        self.steps.append(step)
    
    async def execute_refactoring(self, context: dict) -> bool:
        """リファクタリングの実行"""
        try:
            for i, step in enumerate(self.steps):
                print(f"Executing step {i+1}/{len(self.steps)}: {step.__class__.__name__}")
                
                # 手順実行
                context = await step.execute(context)
                
                # 検証
                if not step.validate(context):
                    raise Exception(f"Validation failed for step {i+1}")
                
                self.completed_steps.append(i)
                print(f"Step {i+1} completed successfully")
            
            return True
            
        except Exception as e:
            print(f"Refactoring failed: {e}")
            await self.rollback_all(context)
            return False
    
    async def rollback_all(self, context: dict):
        """全手順のロールバック"""
        print("Rolling back all completed steps...")
        
        for step_index in reversed(self.completed_steps):
            step = self.steps[step_index]
            try:
                step.rollback(context)
                print(f"Rolled back step {step_index + 1}")
            except Exception as e:
                print(f"Rollback failed for step {step_index + 1}: {e}")
        
        self.completed_steps.clear()

# 使用例
async def run_legacy_modernization():
    orchestrator = RefactoringOrchestrator()
    
    # データベース移行手順
    db_migration = DatabaseMigrationStep(
        migration_sql="CREATE TABLE new_users AS SELECT * FROM legacy_users",
        rollback_sql="DROP TABLE new_users"
    )
    
    # コードリファクタリング手順
    def legacy_get_user(user_id):
        # レガシー実装
        return f"Legacy user {user_id}"
    
    def modern_get_user(user_id):
        # モダン実装
        return f"Modern user {user_id}"
    
    code_refactoring = CodeRefactoringStep(legacy_get_user, modern_get_user)
    
    orchestrator.add_step(db_migration)
    orchestrator.add_step(code_refactoring)
    
    context = {
        "database": None,  # 実際のDBコネクション
        "target_module": None,  # リファクタリング対象のモジュール
        "test_input": {"user_id": "123"}
    }
    
    success = await orchestrator.execute_refactoring(context)
    return success
```

## レガシー連携パターン

### 1. メッセージ変換パターン

#### **プロトコル変換ゲートウェイ**
```python
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional
import json

class ProtocolGateway:
    """プロトコル変換ゲートウェイ"""
    
    def __init__(self):
        self.soap_client = SOAPClient()
        self.rest_client = RESTClient()
        self.message_transformers = {}
    
    def register_transformer(self, operation: str, transformer: 'MessageTransformer'):
        """メッセージ変換器を登録"""
        self.message_transformers[operation] = transformer
    
    async def handle_rest_to_soap(self, operation: str, rest_request: dict) -> dict:
        """RESTからSOAPへの変換"""
        if operation not in self.message_transformers:
            raise ValueError(f"No transformer found for operation: {operation}")
        
        transformer = self.message_transformers[operation]
        
        # REST → SOAP変換
        soap_request = transformer.rest_to_soap(rest_request)
        
        # SOAPサービス呼び出し
        soap_response = await self.soap_client.call(operation, soap_request)
        
        # SOAP → REST変換
        rest_response = transformer.soap_to_rest(soap_response)
        
        return rest_response
    
    async def handle_soap_to_rest(self, operation: str, soap_request: str) -> str:
        """SOAPからRESTへの変換"""
        if operation not in self.message_transformers:
            raise ValueError(f"No transformer found for operation: {operation}")
        
        transformer = self.message_transformers[operation]
        
        # SOAP → REST変換
        rest_request = transformer.soap_to_rest_request(soap_request)
        
        # RESTサービス呼び出し
        rest_response = await self.rest_client.call(operation, rest_request)
        
        # REST → SOAP変換
        soap_response = transformer.rest_to_soap_response(rest_response)
        
        return soap_response

class MessageTransformer:
    """メッセージ変換器基底クラス"""
    
    def rest_to_soap(self, rest_data: dict) -> str:
        """RESTデータをSOAP XMLに変換"""
        raise NotImplementedError
    
    def soap_to_rest(self, soap_xml: str) -> dict:
        """SOAP XMLをRESTデータに変換"""
        raise NotImplementedError

class UserServiceTransformer(MessageTransformer):
    """ユーザーサービス向けメッセージ変換器"""
    
    def rest_to_soap(self, rest_data: dict) -> str:
        """RESTユーザーデータをSOAP XMLに変換"""
        user_id = rest_data.get("user_id", "")
        soap_xml = f"""
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
            <soap:Body>
                <GetUser xmlns="http://legacy.example.com/userservice">
                    <UserId>{user_id}</UserId>
                </GetUser>
            </soap:Body>
        </soap:Envelope>
        """
        return soap_xml.strip()
    
    def soap_to_rest(self, soap_xml: str) -> dict:
        """SOAP XMLをRESTユーザーデータに変換"""
        root = ET.fromstring(soap_xml)
        
        # SOAP応答の解析
        user_element = root.find(".//{http://legacy.example.com/userservice}User")
        if user_element is None:
            return {"error": "User not found"}
        
        return {
            "user_id": user_element.find("UserId").text,
            "name": user_element.find("Name").text,
            "email": user_element.find("Email").text,
            "status": "active"
        }

class SOAPClient:
    """SOAP クライアント"""
    
    async def call(self, operation: str, soap_xml: str) -> str:
        """SOAP サービス呼び出し"""
        async with aiohttp.ClientSession() as session:
            headers = {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': f'"http://legacy.example.com/userservice/{operation}"'
            }
            
            async with session.post(
                "http://legacy-system.com/soap/userservice",
                data=soap_xml,
                headers=headers
            ) as response:
                return await response.text()

class RESTClient:
    """REST クライアント"""
    
    async def call(self, operation: str, data: dict) -> dict:
        """REST サービス呼び出し"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"http://modern-system.com/api/{operation}",
                json=data
            ) as response:
                return await response.json()

# 使用例
gateway = ProtocolGateway()
user_transformer = UserServiceTransformer()
gateway.register_transformer("GetUser", user_transformer)

# RESTからSOAPへの変換例
rest_request = {"user_id": "12345"}
rest_response = await gateway.handle_rest_to_soap("GetUser", rest_request)
```

### 2. データ同期パターン

#### **Change Data Capture (CDC)**
```python
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

class ChangeType(Enum):
    INSERT = "insert"
    UPDATE = "update"
    DELETE = "delete"

@dataclass
class ChangeEvent:
    table: str
    change_type: ChangeType
    primary_key: Dict[str, Any]
    old_values: Optional[Dict[str, Any]]
    new_values: Optional[Dict[str, Any]]
    timestamp: datetime
    transaction_id: str

class CDCProcessor:
    """Change Data Capture プロセッサー"""
    
    def __init__(self):
        self.event_handlers = {}
        self.conflict_resolvers = {}
        self.transformation_rules = {}
    
    def register_handler(self, table: str, handler):
        """テーブル別のイベントハンドラーを登録"""
        self.event_handlers[table] = handler
    
    def register_conflict_resolver(self, table: str, resolver):
        """競合解決ロジックを登録"""
        self.conflict_resolvers[table] = resolver
    
    def register_transformation(self, table: str, transformer):
        """データ変換ルールを登録"""
        self.transformation_rules[table] = transformer
    
    async def process_change_event(self, event: ChangeEvent):
        """変更イベントの処理"""
        table = event.table
        
        # データ変換
        if table in self.transformation_rules:
            transformer = self.transformation_rules[table]
            event = transformer.transform(event)
        
        # イベントハンドラー実行
        if table in self.event_handlers:
            handler = self.event_handlers[table]
            try:
                await handler.handle(event)
            except ConflictException as e:
                # 競合解決
                if table in self.conflict_resolvers:
                    resolver = self.conflict_resolvers[table]
                    resolved_event = await resolver.resolve(event, e.existing_data)
                    await handler.handle(resolved_event)
                else:
                    raise e

class LegacyToModernSynchronizer:
    """レガシーからモダンシステムへの同期"""
    
    def __init__(self, modern_db_pool):
        self.modern_db = modern_db_pool
        self.sync_stats = {"processed": 0, "errors": 0, "skipped": 0}
    
    async def handle(self, event: ChangeEvent):
        """レガシーデータの変更をモダンシステムに同期"""
        try:
            if event.change_type == ChangeType.INSERT:
                await self._handle_insert(event)
            elif event.change_type == ChangeType.UPDATE:
                await self._handle_update(event)
            elif event.change_type == ChangeType.DELETE:
                await self._handle_delete(event)
            
            self.sync_stats["processed"] += 1
            
        except Exception as e:
            self.sync_stats["errors"] += 1
            print(f"Sync error for {event.table}: {e}")
            raise e
    
    async def _handle_insert(self, event: ChangeEvent):
        """挿入イベント処理"""
        values = event.new_values
        modern_table = self._get_modern_table_name(event.table)
        
        columns = list(values.keys())
        placeholders = ", ".join([f"${i+1}" for i in range(len(columns))])
        column_names = ", ".join(columns)
        
        query = f"INSERT INTO {modern_table} ({column_names}) VALUES ({placeholders})"
        params = list(values.values())
        
        await self.modern_db.execute_query(query, *params)
    
    async def _handle_update(self, event: ChangeEvent):
        """更新イベント処理"""
        values = event.new_values
        pk = event.primary_key
        modern_table = self._get_modern_table_name(event.table)
        
        set_clauses = [f"{col} = ${i+1}" for i, col in enumerate(values.keys())]
        where_clauses = [f"{col} = ${len(values)+i+1}" for i, col in enumerate(pk.keys())]
        
        query = f"""
        UPDATE {modern_table} 
        SET {', '.join(set_clauses)}
        WHERE {' AND '.join(where_clauses)}
        """
        
        params = list(values.values()) + list(pk.values())
        await self.modern_db.execute_query(query, *params)
    
    async def _handle_delete(self, event: ChangeEvent):
        """削除イベント処理"""
        pk = event.primary_key
        modern_table = self._get_modern_table_name(event.table)
        
        where_clauses = [f"{col} = ${i+1}" for i, col in enumerate(pk.keys())]
        query = f"DELETE FROM {modern_table} WHERE {' AND '.join(where_clauses)}"
        params = list(pk.values())
        
        await self.modern_db.execute_query(query, *params)
    
    def _get_modern_table_name(self, legacy_table: str) -> str:
        """レガシーテーブル名をモダンテーブル名に変換"""
        mapping = {
            "LEGACY_USERS": "users",
            "LEGACY_ORDERS": "orders",
            "LEGACY_PRODUCTS": "products"
        }
        return mapping.get(legacy_table, legacy_table.lower())

class ConflictException(Exception):
    def __init__(self, message: str, existing_data: dict):
        super().__init__(message)
        self.existing_data = existing_data

class TimestampBasedConflictResolver:
    """タイムスタンプベースの競合解決"""
    
    async def resolve(self, new_event: ChangeEvent, existing_data: dict) -> ChangeEvent:
        """新しいイベントが既存データより新しい場合のみ適用"""
        new_timestamp = new_event.timestamp
        existing_timestamp = existing_data.get("updated_at")
        
        if existing_timestamp and new_timestamp <= existing_timestamp:
            # 古いデータのため無視
            raise SkipEventException("Event is older than existing data")
        
        return new_event

class SkipEventException(Exception):
    pass

# 使用例
async def setup_cdc_sync():
    cdc = CDCProcessor()
    synchronizer = LegacyToModernSynchronizer(modern_db_pool)
    resolver = TimestampBasedConflictResolver()
    
    # ハンドラーと競合解決ロジックの登録
    cdc.register_handler("LEGACY_USERS", synchronizer)
    cdc.register_conflict_resolver("LEGACY_USERS", resolver)
    
    # 変更イベントの処理
    change_event = ChangeEvent(
        table="LEGACY_USERS",
        change_type=ChangeType.UPDATE,
        primary_key={"id": "12345"},
        old_values={"name": "Old Name", "email": "old@example.com"},
        new_values={"name": "New Name", "email": "new@example.com"},
        timestamp=datetime.now(),
        transaction_id="tx_789"
    )
    
    await cdc.process_change_event(change_event)
```

## まとめ

レガシーシステムのモダナイゼーションは段階的なアプローチが重要です。本ドキュメントで紹介されたパターンを適切に組み合わせることで、リスクを最小限に抑えながら既存システムを現代化できます。ストラングラーフィグパターンやアンチコラプションレイヤーを活用し、新旧システムの共存期間を適切に管理することが成功の鍵となります。
