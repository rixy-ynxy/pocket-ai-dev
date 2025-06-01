# SOLID原則

@version[1.0.0]
@owner[architecture-team]
@category[code-principles]
@priority[high]
@lastUpdated[2024-03-16]
@status[active]

## 概要

SOLID原則は、オブジェクト指向プログラミングにおける5つの基本原則の頭文字を取ったものです。これらの原則に従うことで、より保守性が高く、拡張しやすく、テスト容易性の高いソフトウェアを設計できます。

## 原則

### 1. 単一責任の原則 (Single Responsibility Principle)

クラスは単一の責任のみを持つべきです。つまり、クラスを変更する理由は1つだけであるべきです。

#### 例：良い実装

```typescript
// 単一責任の原則に従った実装
class UserRepository {
  findById(id: string): User { /* ... */ }
  save(user: User): void { /* ... */ }
}

class UserValidator {
  validate(user: User): ValidationResult { /* ... */ }
}

class NotificationService {
  sendUserCreatedNotification(user: User): void { /* ... */ }
}
```

#### 例：悪い実装

```typescript
// 複数の責任を持つクラス
class UserManager {
  findById(id: string): User { /* ... */ }
  save(user: User): void { /* ... */ }
  validate(user: User): ValidationResult { /* ... */ }
  sendUserCreatedNotification(user: User): void { /* ... */ }
}
```

#### ポイント
- クラスは単一の目的を持つべき
- 「このクラスは何をするものか」と一文で説明できるべき
- 機能が追加されるたびにクラスが拡大するのは避ける

### 2. オープン・クローズドの原則 (Open/Closed Principle)

ソフトウェアのエンティティ（クラス、モジュール、関数など）は拡張に対して開いていて、修正に対して閉じているべきです。既存のコードを変更せずに機能を追加できるようにすべきです。

#### 例：良い実装

```typescript
// 基本インターフェース
interface PaymentProcessor {
  process(amount: number): PaymentResult;
}

// 実装クラス
class CreditCardProcessor implements PaymentProcessor {
  process(amount: number): PaymentResult { /* ... */ }
}

class PayPalProcessor implements PaymentProcessor {
  process(amount: number): PaymentResult { /* ... */ }
}

// 新しい支払い方法を追加しても、既存のコードを変更する必要がない
class CryptoCurrencyProcessor implements PaymentProcessor {
  process(amount: number): PaymentResult { /* ... */ }
}

// 支払い処理を行うクラス
class PaymentService {
  constructor(private processor: PaymentProcessor) {}
  
  processPayment(amount: number): PaymentResult {
    return this.processor.process(amount);
  }
}
```

#### 例：悪い実装

```typescript
class PaymentService {
  processPayment(paymentType: string, amount: number): PaymentResult {
    if (paymentType === 'credit_card') {
      // クレジットカード処理
    } else if (paymentType === 'paypal') {
      // PayPal処理
    }
    // 新しい支払い方法を追加するにはこのメソッドを修正する必要がある
  }
}
```

#### ポイント
- 抽象化を活用して拡張ポイントを設計する
- ポリモーフィズムを使用して実装の詳細を隠蔽する
- 継承より合成（コンポジション）を優先する

### 3. リスコフの置換原則 (Liskov Substitution Principle)

派生クラス（サブクラス）は基底クラス（スーパークラス）の代わりに使用できなければなりません。つまり、派生クラスは基底クラスの契約を破るべきではありません。

#### 例：良い実装

```typescript
class Rectangle {
  constructor(
    protected width: number,
    protected height: number
  ) {}
  
  setWidth(width: number): void {
    this.width = width;
  }
  
  setHeight(height: number): void {
    this.height = height;
  }
  
  getArea(): number {
    return this.width * this.height;
  }
}

class Square extends Rectangle {
  constructor(side: number) {
    super(side, side);
  }
  
  setWidth(width: number): void {
    super.setWidth(width);
    super.setHeight(width);
  }
  
  setHeight(height: number): void {
    super.setWidth(height);
    super.setHeight(height);
  }
}
```

#### 例：悪い実装

```typescript
class Rectangle {
  constructor(
    protected width: number,
    protected height: number
  ) {}
  
  setWidth(width: number): void {
    this.width = width;
  }
  
  setHeight(height: number): void {
    this.height = height;
  }
  
  getArea(): number {
    return this.width * this.height;
  }
}

// この実装は問題がある。setWidth/setHeightが期待通りに動作しない
class Square extends Rectangle {
  constructor(side: number) {
    super(side, side);
  }
  
  // 正方形は幅と高さが同じでなければならない制約があるため、
  // Rectangleの契約に違反している
}

function testRectangle(rectangle: Rectangle): void {
  rectangle.setWidth(5);
  rectangle.setHeight(4);
  // 期待値は area = 20
  console.assert(rectangle.getArea() === 20); // Squareの場合、これは失敗する
}
```

#### ポイント
- サブクラスは基底クラスの前提条件を強化してはならない
- サブクラスは基底クラスの事後条件を弱めてはならない
- サブクラスは基底クラスの不変条件を維持しなければならない

### 4. インターフェース分離の原則 (Interface Segregation Principle)

クライアントは使用しないメソッドに依存すべきではありません。大きなインターフェースは複数の小さなインターフェースに分割すべきです。

#### 例：良い実装

```typescript
// 分離されたインターフェース
interface Readable {
  read(): string;
}

interface Writable {
  write(data: string): void;
}

interface Closable {
  close(): void;
}

// 必要なインターフェースのみを実装
class FileStream implements Readable, Writable, Closable {
  read(): string { /* ... */ }
  write(data: string): void { /* ... */ }
  close(): void { /* ... */ }
}

class ReadOnlyFileStream implements Readable, Closable {
  read(): string { /* ... */ }
  close(): void { /* ... */ }
}

// クライアントは必要なインターフェースのみに依存
function processReadableData(reader: Readable): void {
  const data = reader.read();
  // データ処理
}
```

#### 例：悪い実装

```typescript
// 肥大化したインターフェース
interface FileOperations {
  read(): string;
  write(data: string): void;
  seek(position: number): void;
  close(): void;
  compress(): void;
  encrypt(): void;
}

// 使用しないメソッドも実装する必要がある
class SimpleFileReader implements FileOperations {
  read(): string { /* ... */ }
  write(data: string): void { throw new Error('Not supported'); }
  seek(position: number): void { /* ... */ }
  close(): void { /* ... */ }
  compress(): void { throw new Error('Not supported'); }
  encrypt(): void { throw new Error('Not supported'); }
}
```

#### ポイント
- インターフェースを目的別に分割する
- クライアントが必要としない機能を強制しない
- 実装クラスが意味のないメソッドを持たないようにする

### 5. 依存性逆転の原則 (Dependency Inversion Principle)

上位モジュールは下位モジュールに依存すべきではありません。両方とも抽象に依存すべきです。また、抽象は詳細に依存すべきではなく、詳細が抽象に依存すべきです。

#### 例：良い実装

```typescript
// 抽象（インターフェース）
interface Logger {
  log(message: string): void;
}

// 上位モジュール
class OrderService {
  constructor(private logger: Logger) {}
  
  placeOrder(order: Order): void {
    // 注文処理
    this.logger.log(`Order ${order.id} placed`);
  }
}

// 下位モジュール（実装の詳細）
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }
}

class FileLogger implements Logger {
  constructor(private filePath: string) {}
  
  log(message: string): void {
    // ファイルにログを書き込む
  }
}

// 依存関係の構築
const orderService = new OrderService(new ConsoleLogger());
```

#### 例：悪い実装

```typescript
// 下位モジュール（具象クラス）
class ConsoleLogger {
  log(message: string): void {
    console.log(message);
  }
}

// 上位モジュールが下位モジュールに直接依存している
class OrderService {
  private logger = new ConsoleLogger();
  
  placeOrder(order: Order): void {
    // 注文処理
    this.logger.log(`Order ${order.id} placed`);
  }
}
```

#### ポイント
- 依存性注入を活用する
- インターフェースを使って抽象化する
- テスト容易性が向上する
- モジュール間の結合度が低下する

## 実践におけるSOLID原則の適用

### 段階的な適用
- すべてのコードに一度に適用しようとせず、段階的に導入する
- 新規開発時から原則を意識する
- リファクタリングの際に適用を検討する

### バランスの取れた適用
- 過度な抽象化や細分化は避ける
- 将来の変更が予想される部分に重点的に適用する
- チームの理解度に合わせて導入する

### コードレビューの活用
- SOLID原則をコードレビューの評価基準に含める
- 具体的な改善提案を行う
- ベストプラクティスを共有する

## アンチパターン

### 1. 避けるべきプラクティス
- 過剰設計（YAGNI原則に反する）
- 抽象化のための抽象化
- 単一責任原則を盾に取った過度な分割

### 2. 改善パターン
- 実際の変更履歴に基づく抽象化
- ドメインに基づいた責任の分割
- 意図を明確にするコード構造

## レビューチェックリスト
- [ ] クラスは単一の責任を持っているか
- [ ] 拡張ポイントは明確に定義されているか
- [ ] 継承関係はリスコフの置換原則に従っているか
- [ ] インターフェースは十分に細分化されているか
- [ ] 依存関係は抽象に向けられているか

## 関連パターン
- [デザインパターン](../patterns/design-patterns.md)
- [クリーンコード原則](clean-code-principles.md)
- [アーキテクチャパターン](../architecture/patterns.md) 