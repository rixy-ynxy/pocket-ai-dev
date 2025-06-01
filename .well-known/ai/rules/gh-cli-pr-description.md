# GitHub CLI で **変更レポート (Markdown) を Pull Request Description に取り込む** 手順

> **主題**: 変更内容をまとめた **Markdown レポート** (例: `ai-agent-docs/00-report/YYYY-MM-DD-change.md`) をそのまま Pull Request の説明欄へ反映させるワークフローを標準化する。

---

## 1. 前提条件

1. GitHub CLI (`gh`) がインストール済み (`brew install gh` など)。
2. `gh auth login` で対象リポジトリに対する認証が完了している。
3. 差し込みたい Markdown ファイルがリポジトリにコミットされている（例: `ai-agent-docs/00-report/2025-05-15-ts-fix-and-test-plan.md`）。

## 2. PR 作成時に Markdown を body として指定

```bash
# 例: 既に作業ブランチでコミット & push 済みの場合
$ gh pr create \
  --head chore/ts-fix-and-test-plan \
  --base main \
  --title "chore: TypeScript fixes & repo restructure" \
  --body-file ai-agent-docs/00-report/2025-05-15-ts-fix-and-test-plan.md
```

### オプション解説
| オプション | 意味 |
| ----------- | ---- |
| `--head` | PR の送信元ブランチ |
| `--base` | マージ先ブランチ (通常 `main` or `develop`) |
| `--title` | PR タイトル |
| `--body-file` | 説明文として読み込むローカルファイルパス |

## 3. 既存 PR の Description を上書きする場合

```bash
# PR 番号 92 の場合
$ gh pr edit 92 \
  --body-file ai-agent-docs/00-report/2025-05-15-ts-fix-and-test-plan.md
```

`--body` でも書き換え可能だが、`--body-file` を使うと Markdown フォーマットを崩さずに差し替えられる。

## 4. ベストプラクティス

1. **ドキュメントはリポジトリにコミットする**  
   → PR Merge で常に履歴が残り、ナレッジベースとして再利用できる。
2. **レポート系ファイルは `ai-agent-docs/00-report/` や `docs/` にまとめる**  
   → CI で PDF 化 or GitHub Pages 公開も容易。
3. **PR ごとにテンプレート化**  
   → `gh pr create` には `-t`/`-F` オプションで issue/PR テンプレも利用可能。
4. **レポートの配置ルール**  
   → 長文レポートは ai-agent-docs/00-report/ 配下に
      YYYY-MM-DD-<change-name>.md 形式でコミットし、
      同じファイルを --body-file で指定する。

## 5. エラー時の確認ポイント

| 症状 | チェック項目 |
| ---- | ------------ |
| `gh: command not found` | GitHub CLI のインストール |
| `authentication failed` | `gh auth login` 実行済みか |
| `no such file` | `--body-file` へ渡すパスが正しいか |
| PR が更新されない | キャッシュ。ブラウザをリロード or `gh pr view 92 -w` で確認 |

## 6. 手順まとめ（Quick Reference）

```bash
# 0. 変更レポートを所定ディレクトリで作成
$ vim ai-agent-docs/00-report/2025-05-20-new-feature.md

# 1. ブランチを切る
$ git checkout -b feat/new-feature

# 2. コード & レポートをコミット
$ git add .
$ git commit -m "feat: implement new feature + add report"

# 3. リモートへプッシュ
$ git push -u origin feat/new-feature

# 4. Pull Request を作成し、Markdown を本文として指定
$ gh pr create \
  --head feat/new-feature \
  --base main \
  --title "feat: add new feature" \
  --body-file ai-agent-docs/00-report/2025-05-20-new-feature.md

# 5. レポート更新時（追コミット後）に PR 説明を上書き
$ git add ai-agent-docs/00-report/2025-05-20-new-feature.md
$ git commit -m "docs(report): update after review"
$ git push
$ gh pr edit <PR_NUMBER> --body-file ai-agent-docs/00-report/2025-05-20-new-feature.md
```

---

これら手順を他リポジトリでも流用することで、長文の説明を PR に貼り付ける運用を統一できます。 