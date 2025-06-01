# AIエージェント設定ディレクトリ

@version[1.0.0]
@owner[ai-team]
@lastUpdated[2025-03-24]
@category[documentation]
@status[active]

## 目的

このディレクトリには、AIエージェントの動作を制御するための設定ファイルが含まれています。これらの設定は、AIエージェントの振る舞い、機能、制約を定義し、一貫性のある予測可能な動作を確保します。

## 主要ファイル

- `main.yaml` - AIエージェントの基本設定と参照優先順位
- `agents-cursor.yaml` - Cursor AIエージェント固有の設定
- `agents-windsurf.yaml` - Windsurf AIエージェント固有の設定
- `agents-common.yaml` - 複数AIエージェント共通設定
- `code-awareness-analysis-rules.yaml` - コード分析のためのルール設定
- `code-awareness-implementation-facts.yaml` - 実装事実の検証と活用のためのルール
- `planning-planning-constraints.yaml` - AIエージェントの計画立案に関する制約条件
- `adaptivity-flexibility.yaml` - AIエージェントの柔軟性レベル設定

## サブディレクトリ

- `cursor/` - Cursor AIエージェント固有の設定ファイル

## 使用方法

AIエージェントは、これらの設定ファイルを参照して動作します。設定を変更することで、AIエージェントの振る舞いをカスタマイズできます。設定ファイルの変更は、AIエージェントの再起動後に反映されます。

## メタデータ形式

各設定ファイルには、以下のようなメタデータヘッダーが含まれています：

```yaml
# @version[1.0.0]
# @owner[ai-team]
# @lastUpdated[YYYY-MM-DD]
# @purpose[設定の目的]
# @category[configuration]
# @status[active]
```

このメタデータは、設定ファイルの管理と追跡を容易にします。
