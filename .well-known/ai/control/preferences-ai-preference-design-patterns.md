# パターン設定

このガイドラインは、プロジェクトで推奨されるパターンを定義します。

## 1. アーキテクチャパターン

### クリーンアーキテクチャ
- 依存関係の方向
- レイヤーの責任分離
- インターフェースの活用
- テスタビリティの確保

### DDDパターン
- 集約の設計
- リポジトリの実装
- ドメインサービス
- ファクトリー

## 2. 設計パターン

### 生成パターン
- Factory Method
- Abstract Factory
- Builder
- Singleton（必要な場合のみ）

### 構造パターン
- Adapter
- Bridge
- Composite
- Decorator

### 振る舞いパターン
- Strategy
- Observer
- Command
- Template Method

## 3. 実装パターン

### データアクセス
- Repository
- Unit of Work
- Query Object
- Active Record

### ビジネスロジック
- Service Layer
- Domain Model
- Transaction Script
- Table Module

## 4. テストパターン

### 単体テスト
- Arrange-Act-Assert
- Test Data Builder
- Mock Object
- Test Double

### 統合テスト
- End-to-End
- API Testing
- Database Testing
- UI Testing

## 5. 柔軟性

- コンテキストに応じた選択
- シンプルさの重視
- オーバーエンジニアリングの回避
- 段階的な改善 