# SOLID原則実装ガイド

## 概要

SOLIDは、オブジェクト指向プログラミングの5つの基本原則の頭文字をとったものです：

```mermaid
mindmap
  root((SOLID))
    S[単一責任の原則]
      責任は1つだけ
      変更理由は1つだけ
    O[開放閉鎖の原則]
      拡張に対して開いている
      修正に対して閉じている
    L[リスコフの置換原則]
      継承は振る舞いを保証
      基底クラスと互換性維持
    I[インターフェース分離の原則]
      インターフェースは小さく
      クライアント特化
    D[依存関係逆転の原則]
      抽象に依存
      具象に依存しない
```

## 1. 単一責任の原則 (SRP)

```mermaid
classDiagram
    class UserService {
        +createUser()
        +updateUser()
        +deleteUser()
    }
    class EmailService {
        +sendWelcomeEmail()
        +sendPasswordReset()
    }
    class UserRepository {
        +save()
        +find()
        +delete()
    }
    UserService --> EmailService
    UserService --> UserRepository
```

### 実装例
```python
class UserService:
    def __init__(self, repository: UserRepository, email_service: EmailService):
        self.repository = repository
        self.email_service = email_service

    async def create_user(self, user: User) -> None:
        await self.repository.save(user)
        await self.email_service.send_welcome_email(user.email)
```

## 2. 開放閉鎖の原則 (OCP)

```mermaid
classDiagram
    class PaymentProcessor {
        <<interface>>
        +process(amount: Money)
    }
    class CreditCardProcessor {
        +process(amount: Money)
    }
    class PayPalProcessor {
        +process(amount: Money)
    }
    PaymentProcessor <|.. CreditCardProcessor
    PaymentProcessor <|.. PayPalProcessor
```

### 実装例
```python
class PaymentService:
    def __init__(self, processor: PaymentProcessor):
        self.processor = processor

    async def process_payment(self, amount: Money) -> None:
        await self.processor.process(amount)
```

## 3. リスコフの置換原則 (LSP)

```mermaid
classDiagram
    class Bird {
        <<abstract>>
        +fly()
    }
    class Sparrow {
        +fly()
    }
    class Penguin {
        +fly()
    }
    Bird <|-- Sparrow
    Bird <|-- Penguin
```

### 問題のある実装
```python
class Bird:
    def fly(self):
        pass

class Penguin(Bird):
    def fly(self):
        raise NotImplementedError("ペンギンは飛べません")  # LSP違反
```

### 改善された実装
```mermaid
classDiagram
    class Bird {
        <<abstract>>
        +move()
    }
    class FlyingBird {
        +fly()
        +move()
    }
    class WalkingBird {
        +walk()
        +move()
    }
    Bird <|-- FlyingBird
    Bird <|-- WalkingBird
```

## 4. インターフェース分離の原則 (ISP)

```mermaid
classDiagram
    class Printer {
        <<interface>>
        +print()
    }
    class Scanner {
        <<interface>>
        +scan()
    }
    class Fax {
        <<interface>>
        +fax()
    }
    class SimplePrinter {
        +print()
    }
    class AllInOnePrinter {
        +print()
        +scan()
        +fax()
    }
    Printer <|.. SimplePrinter
    Printer <|.. AllInOnePrinter
    Scanner <|.. AllInOnePrinter
    Fax <|.. AllInOnePrinter
```

## 5. 依存関係逆転の原則 (DIP)

```mermaid
graph TD
    A[高レベルモジュール] --> B[抽象インターフェース]
    C[低レベルモジュール] --> B
```

### 実装例
```python
class UserRepository(Protocol):
    async def save(self, user: User) -> None: ...
    async def find(self, id: UUID) -> Optional[User]: ...

class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

class PostgresUserRepository(UserRepository):
    async def save(self, user: User) -> None:
        # PostgreSQL実装
        pass

class MongoUserRepository(UserRepository):
    async def save(self, user: User) -> None:
        # MongoDB実装
        pass
```

## アンチパターン

以下のような実装は避けましょう：

```mermaid
graph TD
    A[God Class] -->|多すぎる責任| B[SRP違反]
    C[継承の過剰使用] -->|柔軟性の低下| D[OCP違反]
    E[基底クラスへの依存] -->|抽象化の欠如| F[DIP違反]
```

## ベストプラクティス

1. インターフェースを先に設計
2. 依存性注入を活用
3. 単体テストで原則違反を検出

```mermaid
graph LR
    A[設計] --> B[インターフェース定義]
    B --> C[実装]
    C --> D[テスト]
    D -->|フィードバック| A