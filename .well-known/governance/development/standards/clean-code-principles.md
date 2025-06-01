# クリーンコード原則

@version[1.0.0]
@owner[architecture-team]
@category[code-principles]
@priority[high]
@lastUpdated[2024-03-16]
@status[active]

## 概要

クリーンコードは、読みやすく、理解しやすく、保守しやすいコードを書くための一連の原則とプラクティスです。これらの原則に従うことで、技術的負債を減らし、開発効率を向上させることができます。

## 原則

### 1. 命名規則

#### 明確で意図を表す命名

名前は明確かつ意図を表すものにします。変数、関数、クラスの名前を読めば、何をするものかがすぐに分かるようにします。

#### 例：良い命名

```typescript
// 良い例
const userAccounts = getUserAccounts();
function calculateTotalPrice(items: Item[]): number { /* ... */ }
class OrderProcessor { /* ... */ }
```

#### 例：悪い命名

```typescript
// 悪い例
const data = getData();
function process(x: any[]): number { /* ... */ }
class Handler { /* ... */ }
```

#### ポイント
- 検索可能な名前を使用する
- 発音可能な名前を使用する
- エンコードされた名前（ハンガリアン記法など）を避ける
- クラス名は名詞、メソッド名は動詞
- 一貫性のある用語を使用する

### 2. 関数の設計

#### 小さく、単一の責任を持つ関数

関数は小さく、一つのことだけを行うべきです。理想的には20行以下にし、抽象化レベルを一定に保ちます。

#### 例：良い関数設計

```typescript
// 良い例
function sendWelcomeEmail(user: User): void {
  const emailContent = createWelcomeEmailContent(user);
  const emailSubject = getWelcomeEmailSubject();
  sendEmail(user.email, emailSubject, emailContent);
}

function createWelcomeEmailContent(user: User): string {
  return `こんにちは、${user.name}さん。ご登録ありがとうございます。`;
}

function getWelcomeEmailSubject(): string {
  return "ご登録ありがとうございます";
}
```

#### 例：悪い関数設計

```typescript
// 悪い例
function handleUser(user: User, action: string): void {
  if (action === 'create') {
    // ユーザー作成ロジック（20行）
    // データベース保存
    // ログ記録
    
    // 通知メール送信
    const emailContent = `こんにちは、${user.name}さん。ご登録ありがとうございます。`;
    const emailSubject = "ご登録ありがとうございます";
    
    // メール送信ロジック（15行）
  } else if (action === 'update') {
    // ユーザー更新ロジック（30行）
  } else {
    // その他のアクション
  }
}
```

#### ポイント
- 関数の引数は少なく（理想的には2つ以下）
- フラグ引数を避ける
- 副作用を避ける
- コマンドとクエリの分離
- 適切な抽象化レベルを維持する

### 3. コメント

#### 必要なときにだけコメントを書く

コードの意図が明確でないときや、避けられない複雑さがある場合にのみコメントを書きます。コメントはコード自体を良くする代わりにはなりません。

#### 例：良いコメント

```typescript
// 良い例
// RFC 5322に準拠したメールアドレスのバリデーション
// 簡易バージョンは単純だが、完全バージョンは複雑なため正規表現を使用
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 注文処理中に在庫チェックを一時的にスキップ（パフォーマンス改善）
// TODO: 2024-06-01までに非同期在庫チェックに移行する
function processOrder(order: Order): void {
  // ...
}
```

#### 例：悪いコメント

```typescript
// 悪い例
// ユーザーを取得する
function getUser(id: string): User { /* ... */ }

// iを1増やす
i++;

// 注文を処理する関数
// @param order 注文オブジェクト
// @return void
function processOrder(order: Order): void { /* ... */ }
```

#### ポイント
- コメントではなくコードで意図を表現する
- TODOコメントには期限と担当者を含める
- コードを説明するコメントではなく、なぜそのコードが必要かを説明するコメント
- コメントアウトされたコードは削除する

### 4. エラー処理

#### 例外を使った明確なエラー処理

エラーケースを明示的に処理し、例外の使用によりメインコードパスをクリーンに保ちます。

#### 例：良いエラー処理

```typescript
// 良い例
function withdraw(account: Account, amount: number): void {
  if (amount <= 0) {
    throw new InvalidAmountError("引き出し金額は正の数でなければなりません");
  }
  
  if (amount > account.balance) {
    throw new InsufficientFundsError("残高不足です");
  }
  
  account.balance -= amount;
}

// 呼び出し側
try {
  withdraw(userAccount, withdrawalAmount);
  notifySuccess("引き出しが完了しました");
} catch (error) {
  if (error instanceof InvalidAmountError) {
    notifyUser("無効な金額です");
  } else if (error instanceof InsufficientFundsError) {
    offerLoan(userAccount);
  } else {
    logError("予期せぬエラー", error);
    notifyUser("システムエラーが発生しました");
  }
}
```

#### 例：悪いエラー処理

```typescript
// 悪い例
function withdraw(account: Account, amount: number): boolean {
  if (amount <= 0) {
    console.error("Invalid amount");
    return false;
  }
  
  if (amount > account.balance) {
    console.error("Insufficient funds");
    return false;
  }
  
  account.balance -= amount;
  return true;
}

// 呼び出し側
const success = withdraw(userAccount, withdrawalAmount);
if (success) {
  notifySuccess("引き出しが完了しました");
} else {
  notifyUser("何らかのエラーが発生しました");
}
```

#### ポイント
- nullを返さない（Null Objectパターンまたは例外を使用）
- 具体的な例外クラスを作成する
- エラーコードより例外
- 呼び出し元に有益な情報を提供する
- 例外はビジネスロジックの一部として使わない

### 5. クラスの設計

#### 小さく、単一の責任を持つクラス

クラスは小さく、単一の責任を持つべきです。メソッドとプロパティは少なく、関連性の高いものだけに制限します。

#### 例：良いクラス設計

```typescript
// 良い例
class Order {
  private id: string;
  private customerId: string;
  private items: OrderItem[];
  private status: OrderStatus;
  
  constructor(customerId: string) {
    this.id = generateId();
    this.customerId = customerId;
    this.items = [];
    this.status = OrderStatus.CREATED;
  }
  
  addItem(product: Product, quantity: number): void { /* ... */ }
  removeItem(productId: string): void { /* ... */ }
  calculateTotal(): Money { /* ... */ }
  place(): void { /* ... */ }
  
  // アクセサメソッド
  getId(): string { return this.id; }
  getStatus(): OrderStatus { return this.status; }
}

class OrderProcessor {
  constructor(
    private orderRepository: OrderRepository,
    private paymentService: PaymentService,
    private inventoryService: InventoryService
  ) {}
  
  processOrder(order: Order): void { /* ... */ }
}
```

#### 例：悪いクラス設計

```typescript
// 悪い例
class OrderSystem {
  constructor(private db: Database) {}
  
  createOrder(customerId: string): Order { /* ... */ }
  addItemToOrder(orderId: string, productId: string, quantity: number): void { /* ... */ }
  removeItemFromOrder(orderId: string, productId: string): void { /* ... */ }
  calculateOrderTotal(orderId: string): number { /* ... */ }
  placeOrder(orderId: string): void { /* ... */ }
  processPayment(orderId: string, paymentMethod: string): void { /* ... */ }
  checkInventory(productId: string): boolean { /* ... */ }
  updateInventory(productId: string, quantity: number): void { /* ... */ }
  sendOrderConfirmationEmail(orderId: string): void { /* ... */ }
  generateInvoice(orderId: string): Invoice { /* ... */ }
}
```

#### ポイント
- 高凝集・低結合
- インスタンス変数は少なく
- 継承より合成
- 関連するメソッドとデータをまとめる
- カプセル化を活用する

### 6. コードの整理と形式

#### 一貫性のあるコード形式

コードの見た目は一貫性があり、読みやすいものにします。適切な空白、インデント、改行を使用します。

#### ポイント
- チームで一貫した形式を使用する
- 垂直方向の距離：関連するものは近くに配置
- 水平方向の整列：過度な整列は避ける
- 適切なインデントレベル（ネストを深くしない）
- リンターとフォーマッターを使用する

### 7. テスト

#### クリーンなテストコード

テストコードも本番コードと同じくらい重要です。読みやすく、保守しやすいテストコードを書きます。

#### 例：良いテスト

```typescript
// 良いテスト
describe('Order', () => {
  describe('calculateTotal', () => {
    it('空の注文の場合は0を返す', () => {
      // Arrange
      const order = new Order('customer-123');
      
      // Act
      const total = order.calculateTotal();
      
      // Assert
      expect(total.amount).toBe(0);
    });
    
    it('複数の商品がある場合は合計金額を返す', () => {
      // Arrange
      const order = new Order('customer-123');
      const product1 = new Product('product-1', 'Product 1', new Money(100, 'JPY'));
      const product2 = new Product('product-2', 'Product 2', new Money(200, 'JPY'));
      
      order.addItem(product1, 2);
      order.addItem(product2, 1);
      
      // Act
      const total = order.calculateTotal();
      
      // Assert
      expect(total.amount).toBe(400);
    });
  });
});
```

#### ポイント
- F.I.R.S.T原則に従う（Fast, Independent, Repeatable, Self-validating, Timely）
- Arrange-Act-Assertパターンを使用
- テストごとに一つのアサーション
- 意図を明確にするテスト名
- テストコードも整理する（ヘルパー関数、セットアップなど）

## アンチパターン

### 1. 避けるべきプラクティス
- スパゲッティコード（制御フローが複雑）
- コードの重複
- 過度に長い行や関数
- マジックナンバー
- グローバル変数の過剰使用

### 2. 改善パターン
- コードレビュー文化の構築
- リファクタリングの習慣化
- 継続的な学習と改善
- ペアプログラミング

## 実践へのステップ

### 1. 個人的なアプローチ
- コードを書く前に設計する時間を取る
- 定期的にセルフレビューを行う
- コードを書いた後に少し時間を置いてから見直す
- 読みやすさを最優先する

### 2. チームアプローチ
- コーディング規約の確立
- 定期的なコードレビュー
- クリーンコードの共有学習セッション
- リファクタリングのための時間確保

## レビューチェックリスト
- [ ] 名前は意図を明確に表しているか
- [ ] 関数は小さく、一つのことだけを行っているか
- [ ] コメントは必要最小限か
- [ ] エラー処理は明確か
- [ ] クラスは単一の責任を持っているか
- [ ] コードの形式は一貫しているか
- [ ] テストは明確で保守しやすいか

## 関連パターン
- [SOLID原則](solid-principles.md)
- [リファクタリングパターン](refactoring-patterns.md)
- [テスト駆動開発](../tdd/index.md) 