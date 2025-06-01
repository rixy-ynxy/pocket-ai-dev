# Cursor Rules - 統合ルール管理

このディレクトリには、AIアシスタント（Claude Sonnet）の動作を制御するカスタムルール定義が含まれています。

## 🛠️ 利用可能なルール

### 1. **git-add-commit-push-pr-gh.mdc**
**機能**: Git操作とPull Request作成の自動化
**特徴**:
- プロジェクトのブランチ戦略を自動判定
- mainが本番運用の場合は`develop`、シンプル運用の場合は`main`を自動選択
- PR作成時の包括的な説明テンプレート

**使用方法**: 
```bash
# AI判定でPR作成（推奨）
@git-add-commit-push-pr-gh.mdc をお任せで
```

### 2. **report-generation-guideline.mdc**
**機能**: AI作業レポートの自動生成
**特徴**:
- システム日時の自動取得（MMDDファイル名形式）
- プロジェクト構造の自動判定
- タスク管理チェックリストとの連携
- 時系列詳細記録と技術判断の文書化

**使用方法**:
```bash
# レポート作成指示
@report-generation-guideline.mdc でレポート作成お願いします
```

### 3. **meeting-minutes-prepocessing-guideline.mdc**
**機能**: 超長文テキストの議事録化
**特徴**:
- 音声書き起こしの構造化
- トピック抽出とタスク分離
- アクションアイテムの自動抽出
- タイムスタンプ付きセグメンテーション

**使用方法**:
```bash
# 議事録作成指示
@meeting-minutes-prepocessing-guideline.mdc で議事録作成
```

## 🔧 ルール統合設定

### ファイル構造規則
すべてのルールファイルは以下のYAML frontmatterを含む：
```yaml
---
description: ルールの説明
globs: 
alwaysApply: false
---
```

### プロジェクト検出ロジック
1. **ブランチ戦略**: `develop`/`main`の自動判定
2. **保存場所**: `corporate-cms-docs/reports/` → `reports/` の優先順位
3. **ドキュメント構造**: プロジェクト固有パスの自動検出

### 共通AIツール
- `edit_file`, `search_replace`: ファイル編集
- `run_terminal_cmd`: コマンド実行  
- `read_file`, `list_dir`: ファイル探索
- `grep_search`, `file_search`: 検索機能

## 🚀 推奨ワークフロー

### 開発作業後の標準フロー
1. **作業完了** → レポート作成
2. **Git操作** → 自動ブランチ判定でPR作成
3. **会議議事録** → 長文テキスト構造化

### カスタマイズ
各ルールファイルは独立して動作し、プロジェクト固有の設定は自動判定されます。手動設定が必要な場合のみ、AIがユーザーに確認を求めます。

---

**最終更新**: 2024年5月24日  
**管理者**: AI Assistant (Claude Sonnet)  
**利用プロジェクト**: Corporate CMS v4, その他汎用プロジェクト 