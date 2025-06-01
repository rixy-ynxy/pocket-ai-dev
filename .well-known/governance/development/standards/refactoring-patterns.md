# リファクタリングパターン

@version[1.0.0]
@owner[architecture-team]
@category[code-patterns]
@priority[high]
@lastUpdated[2024-03-16]
@status[active]

## 概要

リファクタリングとは、外部から見たプログラムの動作を変えずに、内部構造を改善する過程です。既存のコードを整理し、可読性を高め、保守性を向上させ、バグを減らし、将来の拡張を容易にする技術的手法です。このドキュメントでは、主要なリファクタリングパターンを紹介し、それらをいつ、どのように適用するかを説明します。

## リファクタリングの基本原則

### 1. 段階的な改善
小さな変更を一度に行い、各ステップ後にテストを実行して機能が破壊されていないことを確認します。

### 2. テストの重要性
リファクタリングを行う前に、十分なテストカバレッジがあることを確認します。テストは、リファクタリングによって動作が変わっていないことを検証する安全ネットとして機能します。

### 3. 意図の明確化
コードの意図を明確にすることで、理解しやすく保守しやすいコードになります。

### 4. 重複の排除
DRY（Don't Repeat Yourself）原則に従い、重複コードを排除します。

## コードの構造を改善するパターン

### 1. メソッドの抽出（Extract Method）

関連する一連のコード断片をメソッドに抽出し、意図を明確に示す名前を付けます。

#### 適用タイミング
- コードの一部が他の部分から独立している
- コードが長すぎて理解しにくい
- 同じコード断片が複数の場所に現れる

#### 例：リファクタリング前

```typescript
function printBill(order: Order): void {
  // ヘッダー印刷
  console.log('***********************');
  console.log(`* 注文 #${order.id} *`);
  console.log('***********************');
  
  // 明細印刷
  let total = 0;
  for (const item of order.items) {
    const price = item.quantity * item.unitPrice;
    total += price;
    console.log(`${item.name}: ${item.quantity} x ${item.unitPrice} = ${price}`);
  }
  
  // フッター印刷
  console.log('***********************');
  console.log(`合計: ${total}`);
  console.log('ありがとうございました！');
  console.log('***********************');
}
```

#### 例：リファクタリング後

```typescript
function printBill(order: Order): void {
  printHeader(order);
  const total = printItems(order.items);
  printFooter(total);
}

function printHeader(order: Order): void {
  console.log('***********************');
  console.log(`* 注文 #${order.id} *`);
  console.log('***********************');
}

function printItems(items: OrderItem[]): number {
  let total = 0;
  for (const item of items) {
    const price = item.quantity * item.unitPrice;
    total += price;
    console.log(`${item.name}: ${item.quantity} x ${item.unitPrice} = ${price}`);
  }
  return total;
}

function printFooter(total: number): void {
  console.log('***********************');
  console.log(`合計: ${total}`);
  console.log('ありがとうございました！');
  console.log('***********************');
}
```

### 2. クラスの抽出（Extract Class）

クラスが複数の責任を持つ場合、関連する属性とメソッドを新しいクラスに移動します。

#### 適用タイミング
- クラスが複数の責任を持っている
- クラスの一部の機能が密接に関連している
- クラスが大きくなりすぎている

#### 例：リファクタリング前

```typescript
class Person {
  name: string;
  phoneNumber: string;
  phoneAreaCode: string;
  address: string;
  city: string;
  postalCode: string;
  
  constructor(name: string, phoneAreaCode: string, phoneNumber: string, 
              address: string, city: string, postalCode: string) {
    this.name = name;
    this.phoneAreaCode = phoneAreaCode;
    this.phoneNumber = phoneNumber;
    this.address = address;
    this.city = city;
    this.postalCode = postalCode;
  }
  
  getPhoneNumber(): string {
    return `(${this.phoneAreaCode}) ${this.phoneNumber}`;
  }
  
  getFullAddress(): string {
    return `${this.address}, ${this.city} ${this.postalCode}`;
  }
}
```

#### 例：リファクタリング後

```typescript
class Person {
  name: string;
  phone: Phone;
  address: Address;
  
  constructor(name: string, phone: Phone, address: Address) {
    this.name = name;
    this.phone = phone;
    this.address = address;
  }
}

class Phone {
  areaCode: string;
  number: string;
  
  constructor(areaCode: string, number: string) {
    this.areaCode = areaCode;
    this.number = number;
  }
  
  getPhoneNumber(): string {
    return `(${this.areaCode}) ${this.number}`;
  }
}

class Address {
  street: string;
  city: string;
  postalCode: string;
  
  constructor(street: string, city: string, postalCode: string) {
    this.street = street;
    this.city = city;
    this.postalCode = postalCode;
  }
  
  getFullAddress(): string {
    return `${this.street}, ${this.city} ${this.postalCode}`;
  }
}
```

### 3. 一時変数の置き換え（Replace Temp with Query）

一時変数の代わりにメソッドを使用して、重複コードを減らし、コードの意図を明確にします。

#### 適用タイミング
- 一時変数が複数の場所で使用されている
- 一時変数の計算ロジックが複雑、または再利用可能

#### 例：リファクタリング前

```typescript
function calculateTotal(order: Order): number {
  let basePrice = order.quantity * order.itemPrice;
  let discount = Math.max(0, order.quantity - 500) * order.itemPrice * 0.05;
  let shipping = Math.min(basePrice * 0.1, 100);
  return basePrice - discount + shipping;
}
```

#### 例：リファクタリング後

```typescript
function calculateTotal(order: Order): number {
  return basePrice(order) - discount(order) + shipping(order);
}

function basePrice(order: Order): number {
  return order.quantity * order.itemPrice;
}

function discount(order: Order): number {
  return Math.max(0, order.quantity - 500) * order.itemPrice * 0.05;
}

function shipping(order: Order): number {
  return Math.min(basePrice(order) * 0.1, 100);
}
```

## 条件付きロジックの簡素化

### 1. 条件の分解（Decompose Conditional）

複雑な条件文をメソッドに抽出し、コードの意図を明確にします。

#### 適用タイミング
- 条件式が複雑で理解しにくい
- 同じ条件が複数の場所で使用されている

#### 例：リファクタリング前

```typescript
function calculateCharge(date: Date, plan: Plan, usage: number): number {
  let charge = 0;
  
  if (date.getMonth() + 1 >= 6 && date.getMonth() + 1 <= 9) {
    charge = usage * plan.summerRate;
  } else {
    charge = usage * plan.regularRate + plan.regularServiceCharge;
  }
  
  return charge;
}
```

#### 例：リファクタリング後

```typescript
function calculateCharge(date: Date, plan: Plan, usage: number): number {
  if (isSummer(date)) {
    return summerCharge(usage, plan);
  } else {
    return regularCharge(usage, plan);
  }
}

function isSummer(date: Date): boolean {
  const month = date.getMonth() + 1;
  return month >= 6 && month <= 9;
}

function summerCharge(usage: number, plan: Plan): number {
  return usage * plan.summerRate;
}

function regularCharge(usage: number, plan: Plan): number {
  return usage * plan.regularRate + plan.regularServiceCharge;
}
```

### 2. ポリモーフィズムによる条件分岐の置き換え（Replace Conditional with Polymorphism）

型ごとに異なる振る舞いをする条件文をポリモーフィズムで置き換えます。

#### 適用タイミング
- オブジェクトの型に基づいて条件分岐している
- 同じ条件文が複数の場所で使用されている
- 新しい型を追加する際に複数の条件文を修正する必要がある

#### 例：リファクタリング前

```typescript
enum EmployeeType {
  ENGINEER,
  MANAGER,
  SALESPERSON
}

class Employee {
  type: EmployeeType;
  name: string;
  monthlySalary: number;
  commission: number;
  bonus: number;
  
  constructor(type: EmployeeType, name: string, monthlySalary: number, 
              commission: number = 0, bonus: number = 0) {
    this.type = type;
    this.name = name;
    this.monthlySalary = monthlySalary;
    this.commission = commission;
    this.bonus = bonus;
  }
  
  payAmount(): number {
    switch (this.type) {
      case EmployeeType.ENGINEER:
        return this.monthlySalary;
      case EmployeeType.SALESPERSON:
        return this.monthlySalary + this.commission;
      case EmployeeType.MANAGER:
        return this.monthlySalary + this.bonus;
      default:
        throw new Error("不明な従業員タイプ");
    }
  }
}
```

#### 例：リファクタリング後

```typescript
abstract class Employee {
  name: string;
  monthlySalary: number;
  
  constructor(name: string, monthlySalary: number) {
    this.name = name;
    this.monthlySalary = monthlySalary;
  }
  
  abstract payAmount(): number;
}

class Engineer extends Employee {
  constructor(name: string, monthlySalary: number) {
    super(name, monthlySalary);
  }
  
  payAmount(): number {
    return this.monthlySalary;
  }
}

class Salesperson extends Employee {
  commission: number;
  
  constructor(name: string, monthlySalary: number, commission: number) {
    super(name, monthlySalary);
    this.commission = commission;
  }
  
  payAmount(): number {
    return this.monthlySalary + this.commission;
  }
}

class Manager extends Employee {
  bonus: number;
  
  constructor(name: string, monthlySalary: number, bonus: number) {
    super(name, monthlySalary);
    this.bonus = bonus;
  }
  
  payAmount(): number {
    return this.monthlySalary + this.bonus;
  }
}
```

## データの操作とカプセル化

### 1. フィールドのカプセル化（Encapsulate Field）

パブリックフィールドをプライベートにし、アクセサメソッドを提供します。

#### 適用タイミング
- クラスの内部データへの直接アクセスを制限したい
- フィールドへのアクセス時に追加のロジックを実行したい

#### 例：リファクタリング前

```typescript
class Person {
  public name: string;
  public age: number;
  
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
}

// 使用例
const person = new Person("John", 30);
person.age = -5; // 不正な値でも設定できてしまう
```

#### 例：リファクタリング後

```typescript
class Person {
  private _name: string;
  private _age: number;
  
  constructor(name: string, age: number) {
    this._name = name;
    this.setAge(age);
  }
  
  getName(): string {
    return this._name;
  }
  
  setName(name: string): void {
    this._name = name;
  }
  
  getAge(): number {
    return this._age;
  }
  
  setAge(age: number): void {
    if (age < 0) {
      throw new Error("年齢は正の値である必要があります");
    }
    this._age = age;
  }
}

// 使用例
const person = new Person("John", 30);
// person.setAge(-5); // エラーが発生
```

### 2. コレクションのカプセル化（Encapsulate Collection）

コレクションの操作を制御するために、コレクションフィールドへの直接アクセスを制限します。

#### 適用タイミング
- コレクションの変更を制御したい
- コレクションの変更時に追加のロジックを実行したい

#### 例：リファクタリング前

```typescript
class Course {
  name: string;
  isAdvanced: boolean;
  
  constructor(name: string, isAdvanced: boolean) {
    this.name = name;
    this.isAdvanced = isAdvanced;
  }
}

class Person {
  name: string;
  courses: Course[];
  
  constructor(name: string) {
    this.name = name;
    this.courses = [];
  }
}

// 使用例
const person = new Person("John");
const courses = person.courses;
courses.push(new Course("Math", false));
// 直接コレクションを操作できるため、Personクラスが変更を知ることができない
```

#### 例：リファクタリング後

```typescript
class Course {
  private _name: string;
  private _isAdvanced: boolean;
  
  constructor(name: string, isAdvanced: boolean) {
    this._name = name;
    this._isAdvanced = isAdvanced;
  }
  
  getName(): string {
    return this._name;
  }
  
  isAdvanced(): boolean {
    return this._isAdvanced;
  }
}

class Person {
  private _name: string;
  private _courses: Course[];
  
  constructor(name: string) {
    this._name = name;
    this._courses = [];
  }
  
  getName(): string {
    return this._name;
  }
  
  getCourses(): Course[] {
    // コレクションのコピーを返す
    return [...this._courses];
  }
  
  addCourse(course: Course): void {
    this._courses.push(course);
  }
  
  removeCourse(course: Course): void {
    const index = this._courses.indexOf(course);
    if (index !== -1) {
      this._courses.splice(index, 1);
    } else {
      throw new Error("コースが見つかりません");
    }
  }
  
  getNumberOfAdvancedCourses(): number {
    return this._courses.filter(course => course.isAdvanced()).length;
  }
}

// 使用例
const person = new Person("John");
const mathCourse = new Course("Math", false);
person.addCourse(mathCourse);
// Personクラスのメソッドを使用してコレクションを操作
```

## オブジェクト間の関係の改善

### 1. メソッドの移動（Move Method）

メソッドを別のクラスに移動して、結合度を低下させます。

#### 適用タイミング
- メソッドが現在のクラスよりも別のクラスの属性を多く使用している
- メソッドの責任が現在のクラスの責任と一致していない

#### 例：リファクタリング前

```typescript
class Account {
  type: AccountType;
  daysOverdrawn: number;
  
  constructor(type: AccountType, daysOverdrawn: number) {
    this.type = type;
    this.daysOverdrawn = daysOverdrawn;
  }
  
  bankCharge(): number {
    let result = 4.5;
    if (this.daysOverdrawn > 0) {
      result += this.overdraftCharge();
    }
    return result;
  }
  
  overdraftCharge(): number {
    if (this.type.isPremium) {
      const baseCharge = 10;
      if (this.daysOverdrawn <= 7) {
        return baseCharge;
      } else {
        return baseCharge + (this.daysOverdrawn - 7) * 0.85;
      }
    } else {
      return this.daysOverdrawn * 1.75;
    }
  }
}

class AccountType {
  isPremium: boolean;
  
  constructor(isPremium: boolean) {
    this.isPremium = isPremium;
  }
}
```

#### 例：リファクタリング後

```typescript
class Account {
  type: AccountType;
  daysOverdrawn: number;
  
  constructor(type: AccountType, daysOverdrawn: number) {
    this.type = type;
    this.daysOverdrawn = daysOverdrawn;
  }
  
  bankCharge(): number {
    let result = 4.5;
    if (this.daysOverdrawn > 0) {
      result += this.type.overdraftCharge(this.daysOverdrawn);
    }
    return result;
  }
}

class AccountType {
  isPremium: boolean;
  
  constructor(isPremium: boolean) {
    this.isPremium = isPremium;
  }
  
  overdraftCharge(daysOverdrawn: number): number {
    if (this.isPremium) {
      const baseCharge = 10;
      if (daysOverdrawn <= 7) {
        return baseCharge;
      } else {
        return baseCharge + (daysOverdrawn - 7) * 0.85;
      }
    } else {
      return daysOverdrawn * 1.75;
    }
  }
}
```

### 2. 仲介者の除去（Remove Middle Man）

過度にデレゲーションを行うクラスを削除し、直接のやりとりを行うようにします。

#### 適用タイミング
- クラスが単純なデレゲーションメソッドを多く持っている
- デレゲーションの連鎖が複雑になっている

#### 例：リファクタリング前

```typescript
class Person {
  department: Department;
  
  constructor(department: Department) {
    this.department = department;
  }
  
  getManager(): Person {
    return this.department.getManager();
  }
  
  getDepartmentName(): string {
    return this.department.getName();
  }
}

class Department {
  name: string;
  manager: Person;
  
  constructor(name: string, manager: Person) {
    this.name = name;
    this.manager = manager;
  }
  
  getManager(): Person {
    return this.manager;
  }
  
  getName(): string {
    return this.name;
  }
}
```

#### 例：リファクタリング後

```typescript
class Person {
  department: Department;
  
  constructor(department: Department) {
    this.department = department;
  }
  
  getDepartment(): Department {
    return this.department;
  }
}

class Department {
  name: string;
  manager: Person;
  
  constructor(name: string, manager: Person) {
    this.name = name;
    this.manager = manager;
  }
  
  getManager(): Person {
    return this.manager;
  }
  
  getName(): string {
    return this.name;
  }
}

// 使用例
const manager = new Person(null);
const department = new Department("Engineering", manager);
const employee = new Person(department);

// 変更前: employee.getManager()
// 変更後: employee.getDepartment().getManager()
```

## リファクタリングプロセス

### 1. リファクタリングの計画

1. **問題の特定**: コードスメル（悪い設計の兆候）を特定
2. **テストの確認**: 既存のテストカバレッジを確認、必要に応じてテストを追加
3. **戦略の決定**: 適用するリファクタリングパターンを選択

### 2. リファクタリングの実行

1. **小さなステップ**: 一度に1つの変更を行う
2. **テストの実行**: 各ステップ後にテストを実行
3. **バージョン管理**: 各ステップをコミット

### 3. リファクタリングの確認

1. **コードレビュー**: 変更を他の開発者とレビュー
2. **パフォーマンスチェック**: パフォーマンスへの影響を確認
3. **文書化**: 大きな変更を文書化

## コードスメルと適用すべきリファクタリング

| コードスメル | 説明 | 適用すべきリファクタリング |
|-------------|------|------------------------|
| 重複コード | 同じコード構造が複数の場所に存在 | メソッドの抽出、クラスの抽出 |
| 長いメソッド | メソッドが長すぎて理解しにくい | メソッドの抽出、一時変数の置き換え |
| 大きなクラス | クラスが多すぎる責任を持っている | クラスの抽出、サブクラスの抽出 |
| 長いパラメータリスト | メソッドのパラメータが多すぎる | パラメータオブジェクトの導入、メソッドオブジェクトの導入 |
| 発散的変更 | 1つの変更のために多くの場所を修正する必要がある | クラスの抽出 |
| ショットガン・サージェリー | 1つの変更のために多くのクラスを修正する必要がある | メソッドの移動、フィールドの移動 |
| 機能の妬み | クラスが他のクラスのデータに過度に関心を持っている | メソッドの移動、フィールドの移動 |
| データの塊 | データ項目のグループが一緒に現れる | クラスの抽出 |
| 基本型への執着 | 基本型を直接使用している | クラスの導入、パラメータオブジェクトの導入 |
| switch文 | 同じswitch文が複数の場所に現れる | ポリモーフィズムによる条件分岐の置き換え |
| 仮想関数の並行継承 | サブクラスを追加するたびに他のクラス階層にも追加が必要 | フィールドの移動、メソッドの移動 |
| 不必要なコメント | コードの悪さを説明するコメント | リファクタリングによる意図の明確化 |

## リファクタリングのタイミング

### 1. 機能追加前

新しい機能を追加する前に、関連するコードをリファクタリングすることで、追加作業が容易になります。

### 2. バグ修正時

バグを修正する前に、問題のあるコードをリファクタリングすることで、根本原因を特定しやすくなります。

### 3. コードレビュー後

コードレビューで指摘された問題を解決するためにリファクタリングします。

### 4. 定期的なメンテナンス

技術的負債を減らすために、定期的なリファクタリングを計画します。

## チームでのリファクタリング

### 1. リファクタリング文化の確立

- リファクタリングの価値を共有
- 「ボーイスカウトルール」を採用（訪れた場所を来た時よりも美しく）
- 技術的負債の管理を優先

### 2. コミュニケーション

- 大規模なリファクタリングを他のチームメンバーに通知
- リファクタリングの理由と利点を説明
- リファクタリングパターンの知識共有

### 3. ツールの活用

- IDEのリファクタリング機能
- 自動テストフレームワーク
- 静的解析ツール

## レビューチェックリスト

- [ ] リファクタリング前に十分なテストがあるか
- [ ] 各リファクタリングステップが小さく管理可能か
- [ ] リファクタリング後もすべてのテストが通過するか
- [ ] コードは前より理解しやすくなったか
- [ ] 技術的負債が減少したか

## 関連リソース

- [SOLID原則](solid-principles.md)
- [クリーンコード原則](clean-code-principles.md)
- [デザインパターン](patterns/design-patterns.md) 