# Gitフロー運用ルール / Git Flow Rules

@version[1.0.0]
@owner[management-team]
@category[version-control]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要 / Overview
このファイルでは、プロジェクトのGitフロー運用ルールを定義します。
ブランチ戦略、コミットメッセージ形式、マージ戦略などの標準的な運用プロセスを提供します。

## ブランチ構造 / Branch Structure

### 1. メインブランチ / Main Branches
- `main`: 本番環境用コード / Production ready code
  - 常にリリース可能な状態を維持
  - 直接のコミット禁止
  - タグによるバージョン管理

- `develop`: 開発用コード / Latest development code
  - 次回リリースの開発コード
  - 機能追加の統合先
  - CI/CDによる品質担保

### 2. サポートブランチ / Supporting Branches
- `feature/*`: 新機能開発 / New features
  - developから分岐
  - developにマージ
  - 機能単位での分割

- `release/*`: リリース準備 / Release preparation
  - developから分岐
  - mainとdevelopにマージ
  - バージョンタグ付与

- `hotfix/*`: 本番環境の緊急修正 / Production fixes
  - mainから分岐
  - mainとdevelopにマージ
  - パッチバージョンタグ付与

- `bugfix/*`: 開発中のバグ修正 / Development fixes
  - developから分岐
  - developにマージ
  - 開発中の不具合対応

## ブランチ命名規則 / Branch Naming Convention

### 1. 基本形式 / Basic Format
```
feature/[issue-id]-[short-description]
release/v[major].[minor].[patch]
hotfix/[issue-id]-[short-description]
bugfix/[issue-id]-[short-description]
```

### 2. 命名ガイドライン / Naming Guidelines
- issue-id: プロジェクト管理システムのID
- short-description: 英数字とハイフンのみ使用
- version: セマンティックバージョニングに準拠

## ワークフローのルール / Workflow Rules

### 1. 機能開発フロー / Feature Development Flow
```bash
# 開発開始 / Start development
git checkout develop
git pull origin develop
git checkout -b feature/ABC-123-new-feature

# 開発中 / During development
git add .
git commit -m "feat: #ABC-123 implement new feature"
git push origin feature/ABC-123-new-feature

# 開発完了 / Complete development
git checkout develop
git pull origin develop
git merge --no-ff feature/ABC-123-new-feature
git push origin develop
```

### 2. リリースフロー / Release Flow
```bash
# リリース準備開始 / Start release preparation
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# リリース準備完了 / Complete release preparation
git checkout main
git pull origin main
git merge --no-ff release/v1.2.0
git tag -a v1.2.0 -m "Version 1.2.0"
git push origin main --tags

git checkout develop
git merge --no-ff release/v1.2.0
git push origin develop
```

### 3. 緊急修正フロー / Hotfix Flow
```bash
# 緊急修正開始 / Start hotfix
git checkout main
git pull origin main
git checkout -b hotfix/ABC-789-critical-fix

# 緊急修正完了 / Complete hotfix
git checkout main
git merge --no-ff hotfix/ABC-789-critical-fix
git tag -a v1.2.1 -m "Version 1.2.1"
git push origin main --tags

git checkout develop
git merge --no-ff hotfix/ABC-789-critical-fix
git push origin develop
```

## コミットルール / Commit Rules

### 1. コミットメッセージ形式 / Commit Message Format
```
[type]: #[issue-id] [summary]

[details]
```

### 2. コミットタイプ / Commit Types
- `feat`: 新機能 / New feature
- `fix`: バグ修正 / Bug fix
- `docs`: ドキュメント / Documentation
- `style`: フォーマット / Formatting
- `refactor`: リファクタリング / Code restructuring
- `test`: テストコード / Testing
- `chore`: メンテナンス / Maintenance

### 3. コミットメッセージガイドライン / Commit Message Guidelines
- 1行目は50文字以内
- 本文は72文字で改行
- 過去形ではなく現在形を使用
- 変更内容の理由を含める

## プルリクエストルール / Pull Request Rules

### 1. 基本要件 / Basic Requirements
- コードレビュー必須 / Require code review
- 全テスト通過 / Pass all tests
- コーディング規約準拠 / Follow coding standards
- ドキュメント更新 / Update documentation

### 2. レビュープロセス / Review Process
- 最低2名のレビュアー
- CIチェックの完了確認
- コードオーナーの承認
- セキュリティレビュー（必要に応じて）

## 関連ドキュメント / Related Documents
- コードレビュールール（`code_review.md`）
- リリース管理ルール（`release.md`）
- セキュリティチェックリスト（`../checklists/security.md`） 