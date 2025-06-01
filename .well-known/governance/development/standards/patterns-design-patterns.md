# デザインパターン

@version[1.0.0]
@owner[architecture-team]
@category[code-patterns]
@priority[high]
@lastUpdated[2024-03-16]
@status[active]

## 概要

デザインパターンは、ソフトウェア設計における一般的な問題に対する再利用可能な解決策です。これらのパターンは、経験豊富な開発者によって時間をかけて発見され、体系化されてきました。デザインパターンを理解し適用することで、保守性が高く、柔軟で拡張性のあるコードを書くことができます。

## パターンの分類

デザインパターンは主に3つのカテゴリに分類されます：

1. **生成パターン（Creational Patterns）**：オブジェクトの作成メカニズムに関するパターン
2. **構造パターン（Structural Patterns）**：クラスやオブジェクトの構成に関するパターン
3. **振る舞いパターン（Behavioral Patterns）**：オブジェクト間の通信や責任の割り当てに関するパターン

## 生成パターン

### シングルトン（Singleton）

クラスのインスタンスが1つだけ存在することを保証し、そのインスタンスへのグローバルアクセスポイントを提供します。

#### 例

```typescript
class Database {
  private static instance: Database;
  
  private constructor() {
    // 初期化コード
  }
  
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  
  public query(sql: string): any {
    // クエリ実行ロジック
  }
}

// 使用例
const db1 = Database.getInstance();
const db2 = Database.getInstance();

console.log(db1 === db2); // true
```

#### 適用シナリオ
- データベース接続のような共有リソース
- 設定管理
- ロギングシステム

#### 注意点
- テスト困難性
- グローバル状態による副作用
- マルチスレッド環境での注意

### ファクトリーメソッド（Factory Method）

オブジェクト生成のためのインターフェースを定義し、サブクラスがどのクラスをインスタンス化するかを決定できるようにします。

#### 例

```typescript
// 製品インターフェース
interface Product {
  operation(): string;
}

// 具体的な製品
class ConcreteProductA implements Product {
  operation(): string {
    return "ConcreteProductAの結果";
  }
}

class ConcreteProductB implements Product {
  operation(): string {
    return "ConcreteProductBの結果";
  }
}

// クリエイターインターフェース
abstract class Creator {
  abstract factoryMethod(): Product;
  
  someOperation(): string {
    const product = this.factoryMethod();
    return `Creator: ${product.operation()}`;
  }
}

// 具体的なクリエイター
class ConcreteCreatorA extends Creator {
  factoryMethod(): Product {
    return new ConcreteProductA();
  }
}

class ConcreteCreatorB extends Creator {
  factoryMethod(): Product {
    return new ConcreteProductB();
  }
}

// 使用例
function clientCode(creator: Creator) {
  console.log(creator.someOperation());
}

clientCode(new ConcreteCreatorA()); // "Creator: ConcreteProductAの結果"
clientCode(new ConcreteCreatorB()); // "Creator: ConcreteProductBの結果"
```

#### 適用シナリオ
- オブジェクト生成の詳細を隠蔽したい場合
- クラスの責任を分離したい場合
- 将来的に新しい種類のオブジェクトを追加する可能性がある場合

### 抽象ファクトリー（Abstract Factory）

関連する一連のオブジェクトを、具体的なクラスを指定せずに生成するためのインターフェースを提供します。

#### 例

```typescript
// 製品インターフェース
interface Button {
  render(): void;
  onClick(): void;
}

interface Checkbox {
  render(): void;
  toggle(): void;
}

// 具体的な製品
class WindowsButton implements Button {
  render(): void {
    console.log("Windowsスタイルのボタンをレンダリング");
  }
  
  onClick(): void {
    console.log("Windowsボタンのクリックハンドリング");
  }
}

class MacButton implements Button {
  render(): void {
    console.log("Macスタイルのボタンをレンダリング");
  }
  
  onClick(): void {
    console.log("Macボタンのクリックハンドリング");
  }
}

class WindowsCheckbox implements Checkbox {
  render(): void {
    console.log("Windowsスタイルのチェックボックスをレンダリング");
  }
  
  toggle(): void {
    console.log("Windowsチェックボックスの切り替え");
  }
}

class MacCheckbox implements Checkbox {
  render(): void {
    console.log("Macスタイルのチェックボックスをレンダリング");
  }
  
  toggle(): void {
    console.log("Macチェックボックスの切り替え");
  }
}

// 抽象ファクトリーインターフェース
interface GUIFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
}

// 具体的なファクトリー
class WindowsFactory implements GUIFactory {
  createButton(): Button {
    return new WindowsButton();
  }
  
  createCheckbox(): Checkbox {
    return new WindowsCheckbox();
  }
}

class MacFactory implements GUIFactory {
  createButton(): Button {
    return new MacButton();
  }
  
  createCheckbox(): Checkbox {
    return new MacCheckbox();
  }
}

// 使用例
function createUI(factory: GUIFactory) {
  const button = factory.createButton();
  const checkbox = factory.createCheckbox();
  
  button.render();
  checkbox.render();
  
  return { button, checkbox };
}

// クライアントコード
const windowsUI = createUI(new WindowsFactory());
const macUI = createUI(new MacFactory());
```

#### 適用シナリオ
- 関連する複数の製品ファミリーが必要な場合
- プラットフォーム間の互換性が必要な場合
- 製品の実装の詳細をクライアントから分離したい場合

### ビルダー（Builder）

複雑なオブジェクトの構築プロセスをその表現から分離し、同じ構築プロセスで異なる表現を作成できるようにします。

#### 例

```typescript
// 製品
class Car {
  seats: number = 0;
  engine: string = "";
  tripComputer: boolean = false;
  gps: boolean = false;
  
  getDescription(): string {
    return `Car with ${this.seats} seats, ${this.engine} engine, ` +
      `${this.tripComputer ? 'with' : 'without'} trip computer, ` +
      `${this.gps ? 'with' : 'without'} GPS`;
  }
}

// ビルダーインターフェース
interface CarBuilder {
  reset(): void;
  setSeats(seats: number): void;
  setEngine(engine: string): void;
  setTripComputer(installed: boolean): void;
  setGPS(installed: boolean): void;
  getResult(): Car;
}

// 具体的なビルダー
class ConcreteCarBuilder implements CarBuilder {
  private car: Car = new Car();
  
  reset(): void {
    this.car = new Car();
  }
  
  setSeats(seats: number): void {
    this.car.seats = seats;
  }
  
  setEngine(engine: string): void {
    this.car.engine = engine;
  }
  
  setTripComputer(installed: boolean): void {
    this.car.tripComputer = installed;
  }
  
  setGPS(installed: boolean): void {
    this.car.gps = installed;
  }
  
  getResult(): Car {
    return this.car;
  }
}

// ディレクター
class Director {
  constructSportsCar(builder: CarBuilder): void {
    builder.reset();
    builder.setSeats(2);
    builder.setEngine("Sport Engine");
    builder.setTripComputer(true);
    builder.setGPS(true);
  }
  
  constructSUV(builder: CarBuilder): void {
    builder.reset();
    builder.setSeats(7);
    builder.setEngine("SUV Engine");
    builder.setTripComputer(true);
    builder.setGPS(true);
  }
}

// 使用例
const builder = new ConcreteCarBuilder();
const director = new Director();

director.constructSportsCar(builder);
const sportsCar = builder.getResult();
console.log(sportsCar.getDescription());

director.constructSUV(builder);
const suv = builder.getResult();
console.log(suv.getDescription());

// カスタム構築
builder.reset();
builder.setSeats(4);
builder.setEngine("Economy Engine");
builder.setGPS(false);
const customCar = builder.getResult();
console.log(customCar.getDescription());
```

#### 適用シナリオ
- 複雑なオブジェクトの段階的な構築が必要な場合
- 同じプロセスで異なる表現のオブジェクトを作成する必要がある場合
- オブジェクト作成プロセスを細かく制御したい場合

## 構造パターン

### アダプター（Adapter）

既存のクラスのインターフェースを、クライアントが期待する別のインターフェースに変換します。互換性のないインターフェースを持つクラスを協調させることができます。

#### 例

```typescript
// クライアントが期待するインターフェース
interface Target {
  request(): string;
}

// 適応させたいクラス（既存のクラス）
class Adaptee {
  specificRequest(): string {
    return "Adapteeの特殊リクエスト";
  }
}

// アダプター
class Adapter implements Target {
  private adaptee: Adaptee;
  
  constructor(adaptee: Adaptee) {
    this.adaptee = adaptee;
  }
  
  request(): string {
    const result = this.adaptee.specificRequest();
    return `Adapter: (翻訳) ${result}`;
  }
}

// 使用例
function clientCode(target: Target) {
  console.log(target.request());
}

const adaptee = new Adaptee();
const adapter = new Adapter(adaptee);
clientCode(adapter); // "Adapter: (翻訳) Adapteeの特殊リクエスト"
```

#### 適用シナリオ
- 既存のクラスを使用したいが、インターフェースが合わない場合
- サードパーティライブラリとの統合
- レガシーコードの再利用

### コンポジット（Composite）

オブジェクトをツリー構造で構成し、個々のオブジェクトと複合オブジェクトを同じように扱えるようにします。

#### 例

```typescript
// コンポーネントインターフェース
abstract class Component {
  protected parent: Component | null = null;
  
  public setParent(parent: Component | null): void {
    this.parent = parent;
  }
  
  public getParent(): Component | null {
    return this.parent;
  }
  
  public add(component: Component): void {}
  public remove(component: Component): void {}
  public isComposite(): boolean {
    return false;
  }
  
  public abstract operation(): string;
}

// リーフクラス
class Leaf extends Component {
  public operation(): string {
    return "Leaf";
  }
}

// コンポジットクラス
class Composite extends Component {
  protected children: Component[] = [];
  
  public add(component: Component): void {
    this.children.push(component);
    component.setParent(this);
  }
  
  public remove(component: Component): void {
    const index = this.children.indexOf(component);
    if (index !== -1) {
      this.children.splice(index, 1);
      component.setParent(null);
    }
  }
  
  public isComposite(): boolean {
    return true;
  }
  
  public operation(): string {
    const results: string[] = [];
    for (const child of this.children) {
      results.push(child.operation());
    }
    return `Branch(${results.join('+')})`;
  }
}

// 使用例
function clientCode(component: Component) {
  console.log(`結果: ${component.operation()}`);
}

// 個々のコンポーネント
const simple = new Leaf();
console.log("クライアント: 単純なコンポーネントで作業:");
clientCode(simple);

// 複合構造
const tree = new Composite();
const branch1 = new Composite();
branch1.add(new Leaf());
branch1.add(new Leaf());

const branch2 = new Composite();
branch2.add(new Leaf());

tree.add(branch1);
tree.add(branch2);

console.log("クライアント: 複合構造で作業:");
clientCode(tree);
```

#### 適用シナリオ
- 階層構造のデータ表現（ファイルシステム、組織図など）
- クライアントが個々のオブジェクトと複合オブジェクトを同様に扱いたい場合

### デコレーター（Decorator）

オブジェクトに動的に新しい責任を追加します。継承よりも柔軟な機能拡張方法を提供します。

#### 例

```typescript
// コンポーネントインターフェース
interface Component {
  operation(): string;
}

// 基本コンポーネント
class ConcreteComponent implements Component {
  operation(): string {
    return "ConcreteComponent";
  }
}

// 基本デコレーター
abstract class Decorator implements Component {
  protected component: Component;
  
  constructor(component: Component) {
    this.component = component;
  }
  
  operation(): string {
    return this.component.operation();
  }
}

// 具体的なデコレーター
class ConcreteDecoratorA extends Decorator {
  operation(): string {
    return `ConcreteDecoratorA(${super.operation()})`;
  }
}

class ConcreteDecoratorB extends Decorator {
  operation(): string {
    return `ConcreteDecoratorB(${super.operation()})`;
  }
}

// 使用例
function clientCode(component: Component) {
  console.log(`結果: ${component.operation()}`);
}

const simple = new ConcreteComponent();
console.log("クライアント: 基本コンポーネント:");
clientCode(simple);

// デコレーター適用
const decorator1 = new ConcreteDecoratorA(simple);
const decorator2 = new ConcreteDecoratorB(decorator1);
console.log("クライアント: デコレート済みコンポーネント:");
clientCode(decorator2);
```

#### 適用シナリオ
- 既存のオブジェクトに動的に機能を追加したい場合
- クラスの継承が実用的でない場合
- クロスカッティングコンサーン（ロギング、キャッシュなど）の実装

## 振る舞いパターン

### オブザーバー（Observer）

オブジェクト間の１対多の依存関係を定義し、あるオブジェクトの状態が変化すると、依存するすべてのオブジェクトに自動的に通知し更新する仕組みを提供します。

#### 例

```typescript
// オブザーバーインターフェース
interface Observer {
  update(subject: Subject): void;
}

// サブジェクトインターフェース
interface Subject {
  attach(observer: Observer): void;
  detach(observer: Observer): void;
  notify(): void;
}

// 具体的なサブジェクト
class ConcreteSubject implements Subject {
  private state: number = 0;
  private observers: Observer[] = [];
  
  public attach(observer: Observer): void {
    const isExist = this.observers.includes(observer);
    if (isExist) {
      return;
    }
    this.observers.push(observer);
  }
  
  public detach(observer: Observer): void {
    const observerIndex = this.observers.indexOf(observer);
    if (observerIndex === -1) {
      return;
    }
    this.observers.splice(observerIndex, 1);
  }
  
  public notify(): void {
    for (const observer of this.observers) {
      observer.update(this);
    }
  }
  
  public getState(): number {
    return this.state;
  }
  
  public setState(state: number): void {
    this.state = state;
    this.notify();
  }
}

// 具体的なオブザーバー
class ConcreteObserverA implements Observer {
  update(subject: Subject): void {
    if (subject instanceof ConcreteSubject && subject.getState() < 5) {
      console.log("ConcreteObserverA: 低い状態値に反応");
    }
  }
}

class ConcreteObserverB implements Observer {
  update(subject: Subject): void {
    if (subject instanceof ConcreteSubject && (subject.getState() >= 5 || subject.getState() === 0)) {
      console.log("ConcreteObserverB: 高い状態値または0に反応");
    }
  }
}

// 使用例
const subject = new ConcreteSubject();
const observerA = new ConcreteObserverA();
const observerB = new ConcreteObserverB();

subject.attach(observerA);
subject.attach(observerB);

subject.setState(2);
subject.setState(6);

subject.detach(observerA);
subject.setState(4);
```

#### 適用シナリオ
- オブジェクト間の疎結合な関係が必要な場合
- イベント処理システム
- MVC/MVVMアーキテクチャのモデルとビューの関係

### ストラテジー（Strategy）

アルゴリズムのファミリーを定義し、それぞれをカプセル化して交換可能にします。クライアントから独立してアルゴリズムを変更できます。

#### 例

```typescript
// ストラテジーインターフェース
interface Strategy {
  execute(a: number, b: number): number;
}

// 具体的なストラテジー
class AddStrategy implements Strategy {
  execute(a: number, b: number): number {
    return a + b;
  }
}

class SubtractStrategy implements Strategy {
  execute(a: number, b: number): number {
    return a - b;
  }
}

class MultiplyStrategy implements Strategy {
  execute(a: number, b: number): number {
    return a * b;
  }
}

// コンテキスト
class Context {
  private strategy: Strategy;
  
  constructor(strategy: Strategy) {
    this.strategy = strategy;
  }
  
  setStrategy(strategy: Strategy) {
    this.strategy = strategy;
  }
  
  executeStrategy(a: number, b: number): number {
    return this.strategy.execute(a, b);
  }
}

// 使用例
const context = new Context(new AddStrategy());
console.log("10 + 5 = " + context.executeStrategy(10, 5));

context.setStrategy(new SubtractStrategy());
console.log("10 - 5 = " + context.executeStrategy(10, 5));

context.setStrategy(new MultiplyStrategy());
console.log("10 * 5 = " + context.executeStrategy(10, 5));
```

#### 適用シナリオ
- 異なるバリエーションのアルゴリズムを使用したい場合
- 実行時にアルゴリズムを切り替えたい場合
- アルゴリズムの実装詳細をクライアントから隠したい場合
- 条件文の多用を避けたい場合

### コマンド（Command）

リクエストをオブジェクトとしてカプセル化し、クライアントをパラメータ化して、リクエストのキューイングやログ記録、取り消し可能な操作をサポートします。

#### 例

```typescript
// コマンドインターフェース
interface Command {
  execute(): void;
  undo(): void;
}

// レシーバー
class Light {
  turnOn(): void {
    console.log("ライトを点灯");
  }
  
  turnOff(): void {
    console.log("ライトを消灯");
  }
}

// 具体的なコマンド
class LightOnCommand implements Command {
  private light: Light;
  
  constructor(light: Light) {
    this.light = light;
  }
  
  execute(): void {
    this.light.turnOn();
  }
  
  undo(): void {
    this.light.turnOff();
  }
}

class LightOffCommand implements Command {
  private light: Light;
  
  constructor(light: Light) {
    this.light = light;
  }
  
  execute(): void {
    this.light.turnOff();
  }
  
  undo(): void {
    this.light.turnOn();
  }
}

// インボーカー
class RemoteControl {
  private onCommand: Command | null = null;
  private offCommand: Command | null = null;
  private lastCommand: Command | null = null;
  
  setOnCommand(command: Command): void {
    this.onCommand = command;
  }
  
  setOffCommand(command: Command): void {
    this.offCommand = command;
  }
  
  pressOnButton(): void {
    if (this.onCommand) {
      this.onCommand.execute();
      this.lastCommand = this.onCommand;
    }
  }
  
  pressOffButton(): void {
    if (this.offCommand) {
      this.offCommand.execute();
      this.lastCommand = this.offCommand;
    }
  }
  
  pressUndoButton(): void {
    if (this.lastCommand) {
      this.lastCommand.undo();
    }
  }
}

// 使用例
const light = new Light();
const lightOn = new LightOnCommand(light);
const lightOff = new LightOffCommand(light);

const remote = new RemoteControl();
remote.setOnCommand(lightOn);
remote.setOffCommand(lightOff);

remote.pressOnButton(); // "ライトを点灯"
remote.pressOffButton(); // "ライトを消灯"
remote.pressUndoButton(); // "ライトを点灯"
```

#### 適用シナリオ
- アクションを後で実行するためにパラメータ化したい場合
- 操作の履歴、キュー、スケジュール、取り消しが必要な場合
- GUIのボタンやメニュー項目の実装

## パターンの選択と適用

### 適切なパターンの選択

デザインパターンの選択は、解決しようとしている問題に依存します：

1. **問題の性質を理解する**：生成、構造、振る舞いのいずれかの問題か
2. **パターンの意図を理解する**：各パターンがどのような問題を解決するために設計されているか
3. **コンテキストを考慮する**：現在のアーキテクチャやフレームワークとの適合性
4. **シンプルさを優先する**：必要以上に複雑なパターンを適用しない

### パターン適用時の注意点

1. **過剰適用を避ける**：パターンはツールであり、目的ではない
2. **コードの可読性を保つ**：パターンを適用してもコードは理解しやすくあるべき
3. **柔軟性のコスト**：過度の柔軟性は複雑さを増大させる
4. **プロジェクトの規模とニーズに合わせる**：小さなプロジェクトでは複雑なパターンは不要な場合も
5. **チームの理解度を考慮する**：メンバー全員が理解できるパターンを選択する

## アンチパターン

### 1. 避けるべきプラクティス
- パターンの盲目的適用（Golden Hammer）
- 不必要な複雑さの導入
- デザインパターンのための過剰設計
- パターンの不適切な組み合わせ

### 2. 改善パターン
- 実際の問題に基づいたパターン選択
- 必要に応じた段階的なリファクタリング
- チーム内でのパターン知識の共有と標準化

## レビューチェックリスト
- [ ] パターンが解決すべき問題に適合しているか
- [ ] パターンの適用が過剰設計になっていないか
- [ ] パターンの実装が正しく、意図した通りに機能するか
- [ ] コードの可読性と保守性が向上しているか
- [ ] パターンの選択と適用が文書化されているか

## 関連リソース
- [SOLID原則](../solid-principles.md)
- [リファクタリングパターン](../refactoring-patterns.md)
- [アーキテクチャパターン](../../architecture/patterns.md) 