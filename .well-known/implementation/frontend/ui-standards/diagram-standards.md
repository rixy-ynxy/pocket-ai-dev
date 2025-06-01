# 図表作成標準ガイドライン

## 概要

プロジェクトドキュメントにおける図表作成の標準化とベストプラクティスを定義します。
mermaid の運用性の問題を解決するため、保守性の高い代替手法を提供します。

**重要**: PlantUML は依存関係管理の複雑さとJava要件により廃止しました。

## 1. Draw.io（推奨）

### 特徴
- 🎨 視覚的に美しいダイアグラム
- 🔧 VS Code Extension でプレビュー・編集可能
- 📝 Git でバージョン管理可能（XML/SVG形式）
- 🤝 チーム共同編集対応
- 📦 豊富なテンプレート・アイコンライブラリ
- ⚡ 依存関係なし（Java不要）

### セットアップ

1. **VS Code Extension のインストール**
```bash
code --install-extension hediet.vscode-drawio
```

2. **ファイル作成**
```bash
# .drawio 形式（編集用）
touch diagrams/architecture.drawio

# .drawio.svg 形式（表示用）
# Draw.io で作成後、SVG export
```

3. **Markdown での埋め込み**
```markdown
<!-- 推奨：SVG形式で埋め込み -->
![システム全体アーキテクチャ](./diagrams/system-architecture.drawio.svg)

<!-- 高詳細な図の場合 -->
<img src="./diagrams/detailed-flow.drawio.svg" alt="詳細フロー図" width="100%" onclick="window.open(this.src)">
```

### ファイル命名規則
```
diagrams/
├── system-architecture.drawio      # 編集用ファイル
├── system-architecture.drawio.svg  # 表示用SVG
├── database-schema.drawio
├── database-schema.drawio.svg
├── deployment-flow.drawio
└── deployment-flow.drawio.svg
```

### 使用例

```xml
<!-- architecture.drawio の中身例 -->
<mxfile host="65bd71144e">
  <diagram id="system-overview" name="System Overview">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10">
      <!-- アーキテクチャコンポーネント定義 -->
    </mxGraphModel>
  </diagram>
</mxfile>
```

## 2. アスキーアート（超軽量）

### 特徴
- 📝 プレーンテキスト、どこでも表示可能
- ⚡ 超軽量、高速
- 🛠️ 手軽に編集可能
- 📊 シンプルな図に最適
- 🚫 外部依存関係なし

### ツール

1. **手動作成**
```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │────│   Backend       │
│   (Framework)   │    │   (API)         │
└─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│     Browser     │    │    Database     │
│     Users       │    │                 │
└─────────────────┘    └─────────────────┘
```

2. **Graph-Easy ツール使用**
```bash
# インストール
cpan Graph::Easy

# 使用例
echo "Frontend -> Backend -> Database" | graph-easy
```

3. **オンラインツール**
- [ASCIIFlow](http://asciiflow.com/) - GUI編集
- [Textik](https://textik.com/) - ブラウザベース

### VS Code での編集

```json
// .vscode/settings.json
{
  "editor.fontFamily": "'Source Code Pro', 'Courier New', monospace",
  "editor.renderWhitespace": "all"
}
```

## 3. SVG（高カスタマイズ）

### 特徴
- 🎨 完全にカスタマイズ可能
- 📱 レスポンシブ対応
- ⚡ 軽量、高速読み込み
- 🔧 VS Code でプレビュー可能

### 作成方法

1. **手動作成**
```svg
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
  <!-- フロントエンド -->
  <rect x="20" y="50" width="100" height="60" 
        fill="#e1f5fe" stroke="#0277bd" stroke-width="2"/>
  <text x="70" y="85" text-anchor="middle" 
        font-family="Arial" font-size="12">Frontend</text>
  
  <!-- 矢印 -->
  <line x1="120" y1="80" x2="160" y2="80" 
        stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>
  
  <!-- バックエンド -->
  <rect x="180" y="50" width="100" height="60" 
        fill="#f3e5f5" stroke="#7b1fa2" stroke-width="2"/>
  <text x="230" y="85" text-anchor="middle" 
        font-family="Arial" font-size="12">Backend</text>
  
  <!-- 矢印マーカー定義 -->
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
            refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#333"/>
    </marker>
  </defs>
</svg>
```

2. **Inkscape 等のツール使用**
```bash
# macOS
brew install inkscape

# 作成後、SVGとして保存
```

## 4. 使い分けガイドライン

| 図の種類 | 推奨手法 | 理由 |
|----------|----------|------|
| **システム全体アーキテクチャ** | Draw.io | 視覚的美しさ、詳細表現 |
| **簡単なフロー図** | アスキーアート | 軽量、手軽 |
| **データベーススキーマ** | Draw.io | 詳細な関係表現 |
| **デプロイメント図** | Draw.io | インフラ詳細表現 |
| **簡単な構成図** | アスキーアート | README等に埋め込み |
| **カスタムアイコン図** | SVG | 完全制御、軽量 |

## 5. プロジェクト設定

### ディレクトリ構造

```
project-docs/
├── diagrams/                    # 図表ファイル
│   ├── draw-io/                # Draw.io ファイル
│   │   ├── system-architecture.drawio
│   │   ├── system-architecture.drawio.svg
│   │   └── database-schema.drawio
│   ├── examples/               # 図表例（Markdown形式）
│   │   ├── system-overview.md  # アスキーアート例
│   │   └── simple-architecture.md # アスキーアート例
│   └── ascii/                  # アスキーアート
│       └── simple-flows.txt
├── .vscode/
│   ├── extensions.json         # 推奨拡張機能
│   └── settings.json           # エディタ設定
└── docs/
    └── diagram-standards.md    # このファイル
```

### VS Code設定ファイル

```json
// .vscode/extensions.json
{
  "recommendations": [
    "hediet.vscode-drawio",          // Draw.io
    "shd101wyy.markdown-preview-enhanced", // Markdown拡張プレビュー
    "yzhang.markdown-all-in-one",    // Markdown編集支援
    "davidanson.vscode-markdownlint" // Markdown lint
  ]
}
```

```json
// .vscode/settings.json
{
  "markdown-preview-enhanced.enableTypographer": true,
  "drawio.theme": "dark",
  "files.associations": {
    "*.drawio": "drawio"
  }
}
```

## 6. 移行戦略

### Phase 1: 新規図表（即座）
- すべての新規図表は Draw.io またはアスキーアートを使用
- mermaid と PlantUML の新規作成を禁止

### Phase 2: 既存図表の段階的移行（1-2ヶ月）
- 重要度の高い図表から順次移行
- 移行優先順位：
  1. システムアーキテクチャ図
  2. データベース設計図
  3. デプロイメント図
  4. API設計図

### Phase 3: レガシー図表廃止（3ヶ月後）
- すべての mermaid・PlantUML 図表を代替手法に移行完了
- 関連設定・依存関係を削除

## 7. ベストプラクティス

### 共通ルール
1. **ファイル命名**: `kebab-case` を使用
2. **バージョン管理**: 編集用ファイルと表示用ファイル両方をコミット
3. **ALTテキスト**: すべての図表に適切な代替テキストを設定
4. **レスポンシブ**: モバイル環境での表示を考慮
5. **依存関係最小化**: 外部ツール依存を避ける

### 図表品質
1. **一貫性**: 色使い、フォント、スタイルを統一
2. **可読性**: 適切なコントラスト比を維持
3. **更新性**: 変更が容易な構造で作成
4. **文書化**: 図表の意図・更新履歴を記録

### パフォーマンス
1. **ファイルサイズ**: SVG は 500KB 以下を目標
2. **キャッシュ**: 適切なキャッシュヘッダーを設定
3. **圧縮**: SVG の最適化ツールを使用

---

この標準ガイドラインに従って、保守性と運用性を向上させた図表管理を実現します。 