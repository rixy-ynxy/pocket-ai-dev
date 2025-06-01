# 認証パターン (Authentication Patterns)

## 概要

現代的なアプリケーションにおける認証アーキテクチャパターンの標準的な実装方法を定義します。セキュリティ、拡張性、ユーザビリティのバランスを考慮した認証設計パターンを提供します。

## 基本認証パターン

### 1. JWT (JSON Web Token) 認証

#### **概要**
- ステートレス認証の標準的なアプローチ
- トークンベースの認証システム
- マイクロサービス環境に適合

#### **実装パターン**
```typescript
// JWT認証の基本実装
interface JWTAuthService {
  generateToken(userId: string, roles: string[]): string;
  verifyToken(token: string): TokenPayload;
  refreshToken(refreshToken: string): string;
}

// トークンペイロード
interface TokenPayload {
  userId: string;
  roles: string[];
  iat: number;  // 発行日時
  exp: number;  // 有効期限
}
```

#### **セキュリティ考慮事項**
- **有効期限設定**: アクセストークン（15分）、リフレッシュトークン（30日）
- **秘密鍵管理**: 環境変数での安全な管理
- **トークンローテーション**: 定期的なリフレッシュトークン更新

### 2. OAuth 2.0 / OpenID Connect

#### **概要**
- 外部プロバイダー（Google、Microsoft、GitHub等）との連携
- 標準化された認証・認可プロトコル
- シングルサインオン（SSO）対応

#### **実装パターン**
```python
# OAuth 2.0実装例
class OAuthProvider:
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
    
    def get_authorization_url(self) -> str:
        # 認証URLの生成
        pass
    
    def exchange_code_for_token(self, code: str) -> AccessToken:
        # 認証コードをアクセストークンに交換
        pass
```

#### **対応プロバイダー**
- **Google OAuth**: `googleapis-auth`
- **Microsoft Azure AD**: `msal`
- **GitHub OAuth**: `github-oauth`
- **Discord OAuth**: `discord-oauth2`

### 3. セッションベース認証

#### **概要**
- 従来型のサーバーサイドセッション管理
- セッションストレージを使用
- 単一サーバー環境に適合

#### **実装パターン**
```python
# セッション管理の実装
from fastapi import FastAPI, Depends, HTTPException
from fastapi.sessions import SessionMiddleware

app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key="your-secret-key")

@app.post("/login")
async def login(credentials: UserCredentials, request: Request):
    user = authenticate_user(credentials)
    if user:
        request.session["user_id"] = user.id
        request.session["roles"] = user.roles
        return {"status": "success"}
    raise HTTPException(status_code=401, detail="認証失敗")
```

## 高度認証パターン

### 1. 多要素認証 (MFA)

#### **TOTP (Time-based One-Time Password)**
```python
import pyotp
import qrcode

class TOTPAuth:
    @staticmethod
    def generate_secret() -> str:
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(secret: str, user_email: str) -> str:
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name="Your App"
        )
        return qrcode.make(totp_uri)
    
    @staticmethod
    def verify_token(secret: str, token: str) -> bool:
        totp = pyotp.TOTP(secret)
        return totp.verify(token)
```

#### **SMS認証**
```python
class SMSAuth:
    def send_verification_code(self, phone_number: str) -> str:
        code = self.generate_code()
        self.send_sms(phone_number, f"認証コード: {code}")
        return code
    
    def verify_code(self, input_code: str, stored_code: str) -> bool:
        return input_code == stored_code and not self.is_expired(stored_code)
```

### 2. 認証フロー統合パターン

#### **統合認証サービス**
```typescript
interface AuthService {
  // 基本認証
  login(credentials: LoginCredentials): Promise<AuthResult>;
  logout(token: string): Promise<void>;
  
  // MFA
  enableMFA(userId: string): Promise<MFASetup>;
  verifyMFA(userId: string, code: string): Promise<boolean>;
  
  // OAuth
  initiateOAuth(provider: string): Promise<string>;
  handleOAuthCallback(code: string, state: string): Promise<AuthResult>;
  
  // セッション管理
  validateSession(token: string): Promise<User>;
  refreshSession(refreshToken: string): Promise<AuthResult>;
}
```

## セキュリティベストプラクティス

### 1. パスワード管理

#### **ハッシュ化**
```python
import bcrypt

class PasswordManager:
    @staticmethod
    def hash_password(password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
```

#### **パスワードポリシー**
- **最小長**: 8文字以上
- **複雑性**: 大文字、小文字、数字、特殊文字
- **履歴管理**: 過去5回のパスワード再利用禁止
- **有効期限**: 90日間（企業環境）

### 2. セッションセキュリティ

#### **セキュア設定**
```python
# セッションセキュリティ設定
SESSION_CONFIG = {
    "httponly": True,      # XSS攻撃防止
    "secure": True,        # HTTPS必須
    "samesite": "strict",  # CSRF攻撃防止
    "max_age": 3600,       # 1時間で自動無効化
}
```

#### **セッション固定攻撃対策**
```python
def login_user(user_id: str, request: Request):
    # ログイン成功時にセッションIDを再生成
    old_session = request.session.copy()
    request.session.clear()
    request.session.update(old_session)
    request.session["user_id"] = user_id
```

### 3. レート制限

#### **ログイン試行制限**
```python
from functools import wraps
import time

class RateLimiter:
    def __init__(self):
        self.attempts = {}
    
    def is_rate_limited(self, identifier: str) -> bool:
        now = time.time()
        if identifier not in self.attempts:
            self.attempts[identifier] = []
        
        # 過去5分間の試行回数をチェック
        recent_attempts = [
            attempt for attempt in self.attempts[identifier]
            if now - attempt < 300  # 5分 = 300秒
        ]
        
        return len(recent_attempts) >= 5  # 5回まで許可

def rate_limit(identifier_func):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            identifier = identifier_func(*args, **kwargs)
            if rate_limiter.is_rate_limited(identifier):
                raise HTTPException(status_code=429, detail="試行回数上限")
            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

## エラーハンドリングパターン

### 1. 認証エラー分類

```python
class AuthError(Exception):
    pass

class InvalidCredentialsError(AuthError):
    """認証情報が無効"""
    pass

class AccountLockedError(AuthError):
    """アカウントがロック状態"""
    pass

class TokenExpiredError(AuthError):
    """トークンが期限切れ"""
    pass

class InsufficientPermissionsError(AuthError):
    """権限不足"""
    pass
```

### 2. 統一エラーレスポンス

```typescript
interface AuthErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

// エラーハンドリング例
function handleAuthError(error: AuthError): AuthErrorResponse {
  return {
    error: {
      code: error.constructor.name,
      message: error.message,
    },
    timestamp: new Date().toISOString(),
    path: request.url,
  };
}
```

## 実装ガイドライン

### 1. 開発環境セットアップ

```bash
# Python依存関係
pip install fastapi[all] python-jose[cryptography] passlib[bcrypt] python-multipart

# Node.js依存関係
npm install jsonwebtoken bcryptjs passport passport-jwt passport-google-oauth20
```

### 2. 設定管理

```yaml
# 環境設定例
auth:
  jwt:
    secret_key: ${JWT_SECRET_KEY}
    algorithm: "HS256"
    access_token_expire_minutes: 15
    refresh_token_expire_days: 30
  
  oauth:
    google:
      client_id: ${GOOGLE_CLIENT_ID}
      client_secret: ${GOOGLE_CLIENT_SECRET}
      redirect_uri: ${GOOGLE_REDIRECT_URI}
  
  security:
    password_min_length: 8
    max_login_attempts: 5
    lockout_duration_minutes: 15
```

### 3. テスト戦略

```python
# 認証テストの例
def test_jwt_authentication():
    # 正常な認証
    token = auth_service.generate_token("user123", ["user"])
    payload = auth_service.verify_token(token)
    assert payload["userId"] == "user123"
    
    # 無効なトークン
    with pytest.raises(TokenExpiredError):
        auth_service.verify_token("invalid_token")

def test_password_hashing():
    password = "secure_password123"
    hashed = PasswordManager.hash_password(password)
    
    assert PasswordManager.verify_password(password, hashed)
    assert not PasswordManager.verify_password("wrong_password", hashed)
```

## まとめ

認証パターンの選択は、アプリケーションの要件、セキュリティレベル、拡張性要求に応じて決定する必要があります。本ドキュメントで提供されるパターンを組み合わせることで、堅牢で使いやすい認証システムを構築できます。
