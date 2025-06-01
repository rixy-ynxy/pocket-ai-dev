# セキュリティパターン

@version[1.0.0]
@owner[architecture-team]
@category[security]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、システムのセキュリティを確保するための主要なパターンを定義します。
認証、認可、暗号化、およびセキュアな通信のパターンを提供します。

## 実装パターン

### 1. 認証パターン
```python
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import jwt
from passlib.hash import pbkdf2_sha256
from dataclasses import dataclass
import logging

@dataclass
class User:
    id: str
    username: str
    password_hash: str
    roles: list[str]

class AuthenticationService:
    def __init__(
        self,
        secret_key: str,
        token_expiry: int = 3600,
        refresh_token_expiry: int = 86400
    ):
        self._secret_key = secret_key
        self._token_expiry = token_expiry
        self._refresh_token_expiry = refresh_token_expiry
        self._logger = logging.getLogger(__name__)

    def hash_password(self, password: str) -> str:
        return pbkdf2_sha256.hash(password)

    def verify_password(
        self,
        password: str,
        password_hash: str
    ) -> bool:
        return pbkdf2_sha256.verify(password, password_hash)

    def create_access_token(
        self,
        user: User,
        additional_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        claims = {
            "sub": user.id,
            "username": user.username,
            "roles": user.roles,
            "exp": datetime.utcnow() + timedelta(seconds=self._token_expiry)
        }
        if additional_claims:
            claims.update(additional_claims)

        return jwt.encode(claims, self._secret_key, algorithm="HS256")

    def create_refresh_token(self, user: User) -> str:
        claims = {
            "sub": user.id,
            "type": "refresh",
            "exp": datetime.utcnow() + timedelta(seconds=self._refresh_token_expiry)
        }
        return jwt.encode(claims, self._secret_key, algorithm="HS256")

    def verify_token(self, token: str) -> Dict[str, Any]:
        try:
            return jwt.decode(token, self._secret_key, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise ValueError(f"Invalid token: {str(e)}")
```

### 2. 認可パターン
```python
from typing import List, Set, Optional
from dataclasses import dataclass
from enum import Enum
import logging

class Permission(Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"

@dataclass
class Resource:
    id: str
    type: str
    owner_id: str

class AuthorizationService:
    def __init__(self):
        self._role_permissions: Dict[str, Set[Permission]] = {}
        self._resource_policies: Dict[str, List[Callable]] = {}
        self._logger = logging.getLogger(__name__)

    def add_role_permissions(
        self,
        role: str,
        permissions: Set[Permission]
    ) -> None:
        self._role_permissions[role] = permissions

    def add_resource_policy(
        self,
        resource_type: str,
        policy: Callable[[User, Resource, Permission], bool]
    ) -> None:
        if resource_type not in self._resource_policies:
            self._resource_policies[resource_type] = []
        self._resource_policies[resource_type].append(policy)

    def check_permission(
        self,
        user: User,
        resource: Resource,
        required_permission: Permission
    ) -> bool:
        # ロールベースの権限チェック
        has_permission = False
        for role in user.roles:
            if role in self._role_permissions:
                if required_permission in self._role_permissions[role]:
                    has_permission = True
                    break

        if not has_permission:
            self._logger.warning(
                f"User {user.id} lacks permission {required_permission.value}"
            )
            return False

        # リソース固有のポリシーチェック
        policies = self._resource_policies.get(resource.type, [])
        for policy in policies:
            if not policy(user, resource, required_permission):
                self._logger.warning(
                    f"Policy check failed for user {user.id} "
                    f"on resource {resource.id}"
                )
                return False

        return True
```

### 3. 暗号化パターン
```python
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
import logging

class EncryptionService:
    def __init__(self, master_key: Optional[str] = None):
        self._master_key = master_key or self._generate_key()
        self._fernet = Fernet(self._master_key.encode())
        self._logger = logging.getLogger(__name__)

    @staticmethod
    def _generate_key() -> str:
        return base64.urlsafe_b64encode(os.urandom(32)).decode()

    def derive_key(self, password: str, salt: Optional[bytes] = None) -> str:
        if salt is None:
            salt = os.urandom(16)

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return f"{key.decode()}:{base64.b64encode(salt).decode()}"

    def encrypt(self, data: str) -> str:
        try:
            return self._fernet.encrypt(data.encode()).decode()
        except Exception as e:
            self._logger.error(f"Encryption failed: {str(e)}")
            raise

    def decrypt(self, encrypted_data: str) -> str:
        try:
            return self._fernet.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            self._logger.error(f"Decryption failed: {str(e)}")
            raise

class SecureDataManager:
    def __init__(
        self,
        encryption_service: EncryptionService,
        sensitive_fields: Set[str]
    ):
        self._encryption = encryption_service
        self._sensitive_fields = sensitive_fields

    def secure_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        secured = data.copy()
        for field in self._sensitive_fields:
            if field in secured:
                secured[field] = self._encryption.encrypt(str(secured[field]))
        return secured

    def unsecure_data(self, secured_data: Dict[str, Any]) -> Dict[str, Any]:
        data = secured_data.copy()
        for field in self._sensitive_fields:
            if field in data:
                data[field] = self._encryption.decrypt(str(data[field]))
        return data
```

## 設計原則

### 1. 認証と認可
- 適切な認証メカニズム
- きめ細かな認可制御
- セッション管理

### 2. データ保護
- 暗号化の適切な使用
- 機密データの管理
- セキュアな通信

### 3. セキュリティ監視
- ログ記録と監査
- 異常検知
- インシデント対応

## アンチパターン

### 1. 避けるべきプラクティス
- 平文でのパスワード保存
- 不適切な権限管理
- セキュリティログの欠如

### 2. 改善パターン
- 適切なパスワードハッシュ化
- 最小権限の原則
- 包括的なログ記録

## レビューチェックリスト
- [ ] 認証メカニズムが適切に実装されている
- [ ] 認可制御が適切に設定されている
- [ ] データの暗号化が適切に行われている
- [ ] セキュリティログが適切に記録されている
- [ ] セキュリティ監視が設定されている

## 関連パターン
- 分散システムパターン（`distributed_patterns.md`）
- スケーラビリティパターン（`scalability_patterns.md`）
- レジリエンスパターン（`resilience_patterns.md`）