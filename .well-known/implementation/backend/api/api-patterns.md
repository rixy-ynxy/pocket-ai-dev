# APIパターン (API Patterns)

## 概要

現代的なWebサービスにおけるAPI設計と実装のための実証済みパターンを定義します。RESTful API、GraphQL、WebSocket、gRPCなど、様々なAPIアーキテクチャパターンとベストプラクティスを提供します。

## RESTful APIパターン

### 1. リソース指向設計

#### **RESTfulリソース設計**
```python
from fastapi import FastAPI, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

app = FastAPI(title="RESTful API Example", version="1.0.0")

# データモデル定義
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    full_name: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = Field(None, regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool

# RESTful APIエンドポイント
@app.get("/api/v1/users", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(10, ge=1, le=100, description="ページあたりのアイテム数"),
    search: Optional[str] = Query(None, description="検索クエリ"),
    is_active: Optional[bool] = Query(None, description="アクティブユーザーフィルター")
):
    """ユーザー一覧取得 (Collection Resource)"""
    # ページネーション計算
    offset = (page - 1) * per_page
    
    # クエリ構築
    filters = {}
    if search:
        filters["search"] = search
    if is_active is not None:
        filters["is_active"] = is_active
    
    # データ取得（実際の実装ではDB呼び出し）
    users, total = await get_users_from_db(offset, per_page, filters)
    
    return UserListResponse(
        users=users,
        total=total,
        page=page,
        per_page=per_page,
        has_next=(page * per_page) < total,
        has_prev=page > 1
    )

@app.get("/api/v1/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """個別ユーザー取得 (Item Resource)"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/api/v1/users", response_model=UserResponse, status_code=201)
async def create_user(user_data: UserCreate):
    """ユーザー作成"""
    # 重複チェック
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    # ユーザー作成
    user = await create_user_in_db(user_data)
    return user

@app.put("/api/v1/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate):
    """ユーザー完全更新"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await update_user_in_db(user_id, user_data)
    return updated_user

@app.patch("/api/v1/users/{user_id}", response_model=UserResponse)
async def partial_update_user(user_id: str, user_data: UserUpdate):
    """ユーザー部分更新"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 部分更新（提供されたフィールドのみ更新）
    update_data = user_data.dict(exclude_unset=True)
    updated_user = await partial_update_user_in_db(user_id, update_data)
    return updated_user

@app.delete("/api/v1/users/{user_id}", status_code=204)
async def delete_user(user_id: str):
    """ユーザー削除"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await delete_user_from_db(user_id)
    return None
```

### 2. APIバージョニングパターン

#### **バージョン管理戦略**
```python
from fastapi import FastAPI, APIRouter, Header
from typing import Optional
import asyncio

# v1 API
v1_router = APIRouter(prefix="/api/v1", tags=["v1"])

@v1_router.get("/users/{user_id}")
async def get_user_v1(user_id: str):
    """v1: 基本ユーザー情報のみ"""
    return {
        "id": user_id,
        "name": "John Doe",
        "email": "john@example.com"
    }

# v2 API (拡張フィールド追加)
v2_router = APIRouter(prefix="/api/v2", tags=["v2"])

@v2_router.get("/users/{user_id}")
async def get_user_v2(user_id: str):
    """v2: 追加フィールドを含む"""
    return {
        "id": user_id,
        "name": "John Doe",
        "email": "john@example.com",
        "profile": {
            "bio": "Software Developer",
            "avatar_url": "https://example.com/avatar.jpg",
            "location": "Tokyo, Japan"
        },
        "preferences": {
            "language": "ja",
            "timezone": "Asia/Tokyo"
        }
    }

# ヘッダーベースバージョニング
class VersionedAPIRouter:
    def __init__(self):
        self.routes = {}
    
    def register_route(self, path: str, version: str, handler):
        """バージョン付きルートの登録"""
        if path not in self.routes:
            self.routes[path] = {}
        self.routes[path][version] = handler
    
    async def handle_request(self, path: str, api_version: Optional[str] = Header(None)):
        """APIバージョンに基づくルーティング"""
        if path not in self.routes:
            raise HTTPException(status_code=404, detail="Endpoint not found")
        
        # デフォルトバージョン
        version = api_version or "v1"
        
        if version not in self.routes[path]:
            # フォールバック: 利用可能な最新バージョン
            available_versions = sorted(self.routes[path].keys(), reverse=True)
            version = available_versions[0] if available_versions else "v1"
        
        handler = self.routes[path][version]
        return await handler()

# バージョン情報管理
class APIVersionManager:
    def __init__(self):
        self.versions = {
            "v1": {
                "status": "deprecated",
                "sunset_date": "2024-12-31",
                "supported_until": "2025-06-30"
            },
            "v2": {
                "status": "current",
                "sunset_date": None,
                "supported_until": None
            },
            "v3": {
                "status": "beta",
                "sunset_date": None,
                "supported_until": None
            }
        }
    
    def get_version_info(self, version: str) -> dict:
        """バージョン情報取得"""
        return self.versions.get(version, {})
    
    def is_version_deprecated(self, version: str) -> bool:
        """バージョンが非推奨かチェック"""
        info = self.get_version_info(version)
        return info.get("status") == "deprecated"

# 使用例
versioned_router = VersionedAPIRouter()
version_manager = APIVersionManager()

@app.middleware("http")
async def version_deprecation_warning(request, call_next):
    """非推奨バージョンの警告ヘッダー追加"""
    response = await call_next(request)
    
    api_version = request.headers.get("api-version", "v1")
    if version_manager.is_version_deprecated(api_version):
        version_info = version_manager.get_version_info(api_version)
        response.headers["Deprecation"] = "true"
        response.headers["Sunset"] = version_info.get("sunset_date", "")
        response.headers["Link"] = '<https://api.example.com/v2>; rel="successor-version"'
    
    return response
```

### 3. エラーハンドリングパターン

#### **統一エラーレスポンス**
```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import traceback
import uuid

class ErrorDetail(BaseModel):
    """エラー詳細"""
    field: Optional[str] = None
    code: str
    message: str
    value: Optional[Any] = None

class APIError(BaseModel):
    """統一APIエラーレスポンス"""
    error: str
    message: str
    details: Optional[List[ErrorDetail]] = None
    request_id: str
    timestamp: datetime
    path: str
    
class APIErrorHandler:
    """API エラーハンドラー"""
    
    @staticmethod
    def create_error_response(
        request: Request,
        error_type: str,
        message: str,
        details: Optional[List[ErrorDetail]] = None,
        status_code: int = 400
    ) -> JSONResponse:
        """統一エラーレスポンス作成"""
        
        error_response = APIError(
            error=error_type,
            message=message,
            details=details or [],
            request_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            path=str(request.url.path)
        )
        
        return JSONResponse(
            status_code=status_code,
            content=error_response.dict()
        )

# カスタム例外
class ValidationError(HTTPException):
    def __init__(self, details: List[ErrorDetail]):
        self.details = details
        super().__init__(status_code=422, detail="Validation failed")

class BusinessLogicError(HTTPException):
    def __init__(self, message: str, code: str = "BUSINESS_LOGIC_ERROR"):
        self.code = code
        super().__init__(status_code=400, detail=message)

class ResourceNotFoundError(HTTPException):
    def __init__(self, resource: str, identifier: str):
        self.resource = resource
        self.identifier = identifier
        super().__init__(
            status_code=404, 
            detail=f"{resource} with id '{identifier}' not found"
        )

# グローバル例外ハンドラー
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return APIErrorHandler.create_error_response(
        request=request,
        error_type="VALIDATION_ERROR",
        message="Request validation failed",
        details=exc.details,
        status_code=422
    )

@app.exception_handler(BusinessLogicError)
async def business_logic_exception_handler(request: Request, exc: BusinessLogicError):
    return APIErrorHandler.create_error_response(
        request=request,
        error_type=exc.code,
        message=str(exc.detail),
        status_code=400
    )

@app.exception_handler(ResourceNotFoundError)
async def not_found_exception_handler(request: Request, exc: ResourceNotFoundError):
    details = [ErrorDetail(
        field="id",
        code="NOT_FOUND",
        message=f"{exc.resource} not found",
        value=exc.identifier
    )]
    
    return APIErrorHandler.create_error_response(
        request=request,
        error_type="RESOURCE_NOT_FOUND",
        message=str(exc.detail),
        details=details,
        status_code=404
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """一般的な例外の処理"""
    # ログ記録
    print(f"Unhandled exception: {exc}")
    print(traceback.format_exc())
    
    return APIErrorHandler.create_error_response(
        request=request,
        error_type="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred",
        status_code=500
    )
```

## GraphQLパターン

### 1. スキーマファースト設計

#### **GraphQLスキーマ定義**
```python
import strawberry
from typing import List, Optional
from datetime import datetime

@strawberry.type
class User:
    id: str
    username: str
    email: str
    full_name: Optional[str]
    created_at: datetime
    posts: List['Post']
    
    @strawberry.field
    async def post_count(self) -> int:
        """ユーザーの投稿数"""
        return len(self.posts)

@strawberry.type
class Post:
    id: str
    title: str
    content: str
    published: bool
    created_at: datetime
    author: User
    tags: List['Tag']

@strawberry.type
class Tag:
    id: str
    name: str
    posts: List[Post]

@strawberry.input
class CreateUserInput:
    username: str
    email: str
    password: str
    full_name: Optional[str] = None

@strawberry.input
class UpdateUserInput:
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None

@strawberry.input
class PostFilter:
    published: Optional[bool] = None
    author_id: Optional[str] = None
    tags: Optional[List[str]] = None

class UserResolver:
    """ユーザー関連のリゾルバー"""
    
    @staticmethod
    async def get_user_posts(user: User) -> List[Post]:
        """ユーザーの投稿を取得（N+1問題対策）"""
        # DataLoaderパターンを使用
        return await post_dataloader.load(user.id)
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[User]:
        """IDによるユーザー取得"""
        return await user_service.get_by_id(user_id)

@strawberry.type
class Query:
    @strawberry.field
    async def user(self, id: str) -> Optional[User]:
        """単一ユーザー取得"""
        return await UserResolver.get_user_by_id(id)
    
    @strawberry.field
    async def users(
        self, 
        limit: int = 10, 
        offset: int = 0,
        search: Optional[str] = None
    ) -> List[User]:
        """ユーザー一覧取得"""
        return await user_service.get_users(limit, offset, search)
    
    @strawberry.field
    async def posts(
        self,
        filter: Optional[PostFilter] = None,
        limit: int = 10,
        offset: int = 0
    ) -> List[Post]:
        """投稿一覧取得"""
        return await post_service.get_posts(filter, limit, offset)

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_user(self, input: CreateUserInput) -> User:
        """ユーザー作成"""
        # バリデーション
        if await user_service.email_exists(input.email):
            raise Exception("Email already exists")
        
        return await user_service.create_user(input)
    
    @strawberry.mutation
    async def update_user(self, id: str, input: UpdateUserInput) -> User:
        """ユーザー更新"""
        user = await user_service.get_by_id(id)
        if not user:
            raise Exception("User not found")
        
        return await user_service.update_user(id, input)
    
    @strawberry.mutation
    async def delete_user(self, id: str) -> bool:
        """ユーザー削除"""
        return await user_service.delete_user(id)

# スキーマ作成
schema = strawberry.Schema(query=Query, mutation=Mutation)
```

### 2. DataLoaderパターン

#### **N+1問題解決**
```python
from aiodataloader import DataLoader
from typing import List, Dict, Any
import asyncio

class UserDataLoader(DataLoader):
    """ユーザーDataLoader"""
    
    async def batch_load_fn(self, user_ids: List[str]) -> List[User]:
        """バッチでユーザーを取得"""
        users = await user_service.get_users_by_ids(user_ids)
        
        # IDでソート（リクエスト順序を保持）
        user_map = {user.id: user for user in users}
        return [user_map.get(user_id) for user_id in user_ids]

class PostDataLoader(DataLoader):
    """投稿DataLoader"""
    
    async def batch_load_fn(self, user_ids: List[str]) -> List[List[Post]]:
        """バッチでユーザーの投稿を取得"""
        posts_by_user = await post_service.get_posts_by_user_ids(user_ids)
        
        # ユーザーIDごとの投稿リストを返す
        return [posts_by_user.get(user_id, []) for user_id in user_ids]

class TagDataLoader(DataLoader):
    """タグDataLoader"""
    
    async def batch_load_fn(self, post_ids: List[str]) -> List[List[Tag]]:
        """バッチで投稿のタグを取得"""
        tags_by_post = await tag_service.get_tags_by_post_ids(post_ids)
        
        return [tags_by_post.get(post_id, []) for post_id in post_ids]

class DataLoaderContext:
    """DataLoaderコンテキスト管理"""
    
    def __init__(self):
        self.user_loader = UserDataLoader()
        self.post_loader = PostDataLoader()
        self.tag_loader = TagDataLoader()
    
    def clear_all(self):
        """全DataLoaderのキャッシュクリア"""
        self.user_loader.clear_all()
        self.post_loader.clear_all()
        self.tag_loader.clear_all()

# GraphQLコンテキストでDataLoaderを提供
@strawberry.type
class Query:
    @strawberry.field
    async def user(self, info: strawberry.Info, id: str) -> Optional[User]:
        """DataLoaderを使用したユーザー取得"""
        context = info.context
        return await context.user_loader.load(id)

# FastAPI統合
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

app = FastAPI()

async def get_context():
    """GraphQLコンテキスト作成"""
    return DataLoaderContext()

graphql_app = GraphQLRouter(
    schema=schema,
    context_getter=get_context
)

app.include_router(graphql_app, prefix="/graphql")
```

## WebSocketパターン

### 1. リアルタイム通信パターン

#### **WebSocket接続管理**
```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
import json
import asyncio
from datetime import datetime

class ConnectionManager:
    """WebSocket接続管理"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, Set[str]] = {}
        self.room_connections: Dict[str, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, connection_id: str, user_id: str):
        """WebSocket接続受け入れ"""
        await websocket.accept()
        
        self.active_connections[connection_id] = websocket
        
        # ユーザー接続追跡
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)
    
    def disconnect(self, connection_id: str, user_id: str):
        """WebSocket接続切断"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        # ユーザー接続から削除
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # ルーム接続から削除
        for room_id, connections in self.room_connections.items():
            connections.discard(connection_id)
    
    async def send_personal_message(self, message: str, connection_id: str):
        """個別メッセージ送信"""
        websocket = self.active_connections.get(connection_id)
        if websocket:
            await websocket.send_text(message)
    
    async def send_to_user(self, message: str, user_id: str):
        """ユーザーの全接続にメッセージ送信"""
        connection_ids = self.user_connections.get(user_id, set())
        
        for connection_id in connection_ids.copy():
            try:
                await self.send_personal_message(message, connection_id)
            except:
                # 切断された接続を削除
                self.disconnect(connection_id, user_id)
    
    async def join_room(self, connection_id: str, room_id: str):
        """ルーム参加"""
        if room_id not in self.room_connections:
            self.room_connections[room_id] = set()
        self.room_connections[room_id].add(connection_id)
    
    async def leave_room(self, connection_id: str, room_id: str):
        """ルーム退室"""
        if room_id in self.room_connections:
            self.room_connections[room_id].discard(connection_id)
    
    async def broadcast_to_room(self, message: str, room_id: str):
        """ルームにブロードキャスト"""
        connection_ids = self.room_connections.get(room_id, set())
        
        for connection_id in connection_ids.copy():
            try:
                await self.send_personal_message(message, connection_id)
            except:
                # 失敗した接続を削除
                connection_ids.discard(connection_id)

class MessageType:
    """メッセージタイプ定数"""
    CHAT_MESSAGE = "chat_message"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    TYPING_START = "typing_start"
    TYPING_STOP = "typing_stop"
    ROOM_JOIN = "room_join"
    ROOM_LEAVE = "room_leave"

class WebSocketMessage:
    """WebSocketメッセージ"""
    
    @staticmethod
    def create_message(msg_type: str, data: dict, user_id: str = None) -> str:
        """メッセージ作成"""
        message = {
            "type": msg_type,
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id
        }
        return json.dumps(message)
    
    @staticmethod
    def parse_message(message: str) -> dict:
        """メッセージ解析"""
        try:
            return json.loads(message)
        except json.JSONDecodeError:
            return {"type": "invalid", "data": {}}

manager = ConnectionManager()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocketエンドポイント"""
    connection_id = f"{user_id}_{datetime.now().timestamp()}"
    
    await manager.connect(websocket, connection_id, user_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = WebSocketMessage.parse_message(data)
            
            await handle_websocket_message(message, connection_id, user_id)
            
    except WebSocketDisconnect:
        manager.disconnect(connection_id, user_id)
        
        # ユーザー退室通知
        leave_message = WebSocketMessage.create_message(
            MessageType.USER_LEFT,
            {"user_id": user_id},
            user_id
        )
        
        # 全ルームに退室通知
        for room_id in manager.room_connections:
            if connection_id in manager.room_connections[room_id]:
                await manager.broadcast_to_room(leave_message, room_id)

async def handle_websocket_message(message: dict, connection_id: str, user_id: str):
    """WebSocketメッセージ処理"""
    msg_type = message.get("type")
    data = message.get("data", {})
    
    if msg_type == MessageType.CHAT_MESSAGE:
        room_id = data.get("room_id")
        text = data.get("text")
        
        if room_id and text:
            chat_message = WebSocketMessage.create_message(
                MessageType.CHAT_MESSAGE,
                {
                    "room_id": room_id,
                    "text": text,
                    "user_id": user_id
                },
                user_id
            )
            await manager.broadcast_to_room(chat_message, room_id)
    
    elif msg_type == MessageType.ROOM_JOIN:
        room_id = data.get("room_id")
        if room_id:
            await manager.join_room(connection_id, room_id)
            
            join_message = WebSocketMessage.create_message(
                MessageType.USER_JOINED,
                {"user_id": user_id, "room_id": room_id},
                user_id
            )
            await manager.broadcast_to_room(join_message, room_id)
    
    elif msg_type == MessageType.TYPING_START:
        room_id = data.get("room_id")
        if room_id:
            typing_message = WebSocketMessage.create_message(
                MessageType.TYPING_START,
                {"user_id": user_id, "room_id": room_id},
                user_id
            )
            await manager.broadcast_to_room(typing_message, room_id)
```

## API セキュリティパターン

### 1. 認証・認可パターン

#### **JWT認証実装**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from datetime import datetime, timedelta
from typing import Optional, List

security = HTTPBearer()

class TokenService:
    """JWT トークンサービス"""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.access_token_expire_minutes = 15
        self.refresh_token_expire_days = 30
    
    def create_access_token(self, user_id: str, permissions: List[str]) -> str:
        """アクセストークン作成"""
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        payload = {
            "sub": user_id,
            "permissions": permissions,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user_id: str) -> str:
        """リフレッシュトークン作成"""
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        
        payload = {
            "sub": user_id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> dict:
        """トークン検証"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

class AuthService:
    """認証サービス"""
    
    def __init__(self, token_service: TokenService):
        self.token_service = token_service
    
    async def get_current_user(
        self, 
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> dict:
        """現在のユーザー取得"""
        token = credentials.credentials
        payload = self.token_service.verify_token(token)
        
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        user = await get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
    
    def require_permissions(self, required_permissions: List[str]):
        """権限チェックデコレーター"""
        def permission_checker(
            credentials: HTTPAuthorizationCredentials = Depends(security)
        ):
            token = credentials.credentials
            payload = self.token_service.verify_token(token)
            
            user_permissions = payload.get("permissions", [])
            
            if not all(perm in user_permissions for perm in required_permissions):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            
            return payload
        
        return permission_checker

# 使用例
token_service = TokenService("your-secret-key")
auth_service = AuthService(token_service)

@app.get("/api/v1/protected")
async def protected_endpoint(
    current_user: dict = Depends(auth_service.get_current_user)
):
    """認証が必要なエンドポイント"""
    return {"message": f"Hello, {current_user['username']}!"}

@app.get("/api/v1/admin")
async def admin_endpoint(
    _: dict = Depends(auth_service.require_permissions(["admin:read"]))
):
    """管理者権限が必要なエンドポイント"""
    return {"message": "Admin access granted"}
```

## まとめ

APIパターンの選択は、アプリケーションの要件、パフォーマンス目標、開発チームのスキルに応じて決定する必要があります。RESTful API、GraphQL、WebSocketそれぞれに適切な使用場面があり、適切なパターンの組み合わせにより、スケーラブルで保守性の高いAPIを構築できます。
