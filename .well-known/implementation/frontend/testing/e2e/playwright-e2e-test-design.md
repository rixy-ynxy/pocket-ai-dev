# Playwright E2Eテスト設計書 (改訂版)

## 1. はじめに

### 1.1. 本ドキュメントの目的と位置づけ
このドキュメントは、雑談・悩み相談機能のフロントエンドアプリケーション (`apps/web`) に対するPlaywrightを用いたエンドツーエンド（E2E）テストの設計方針、戦略、および実践的ガイドラインを定義します。
主な目的は以下の通りです。
-   ユーザー中心の主要機能が、実際のユーザーシナリオに沿って期待通りに動作することを保証する。
-   開発サイクルの早い段階でリグレッションを検出し、アプリケーションの品質を一貫して維持する。
-   手動テストの負荷を軽減し、迅速なフィードバックループを実現することで、開発の効率とアジリティを向上させる。
-   E2Eテストを「動く仕様書（リビングドキュメント）」として活用し、開発チーム内の共通理解を促進する。

### 1.2. E2Eテストとテスト駆動開発（ATDD/BDD）の思想
本ドキュメントで示すE2Eテスト戦略は、テスト駆動開発（TDD）の思想、特に受け入れテスト駆動開発（ATDD）やビヘイビア駆動開発（BDD）の原則を強く意識しています。
-   **テストファースト**: 新機能開発や既存機能の変更時には、まずユーザーの視点から期待される振る舞いをE2Eテストケースとして定義します。このテストは、開発のゴール（受け入れ基準）となります。
-   **振る舞いベース**: テストは、システム内部の実装詳細ではなく、ユーザーが観測可能なシステムの振る舞いに焦点を当てます。
-   **共通言語**: テストシナリオは、開発者、QA、プロダクトオーナー（PO）など、関係者全員が理解できる言葉で記述されることを目指します（例: Gherkin構文の精神を取り入れる）。

このアプローチにより、要求仕様と実装の間のギャップを減らし、真に価値のある機能を効率的に提供することを目指します。

## 2. E2Eテスト戦略

### 2.1. ユーザーシナリオベースドテスティング
E2Eテストの核心は、実際のユーザーがアプリケーションをどのように利用するかというシナリオに基づいてテストを設計することです。
-   **`user_scenarios.md` との連携**: `chat-consultation-docs/wbs/user_scenarios.md` に記載されたユーザーストーリーや主要なユースケースは、E2Eテストシナリオの主要なインプットとなります。各ユーザーストーリーの受け入れ基準がE2Eテストによって検証されるべきです。
-   **主要なユーザージャーニーの特定**: 個々の機能テストだけでなく、複数の機能やページを横断するエンドツーエンドのユーザージャーニー（例：ユーザー登録から初回チャット開始まで、会話履歴の確認から特定の発言の検索までなど）を特定し、それらをカバーするテストシナリオを優先的に作成します。
-   **ペルソナの活用**: 可能であれば、定義されたユーザーペルソナの行動様式や目的を考慮し、テストシナリオに深みを持たせます。

### 2.2. E2Eテストにおけるテスト駆動のアプローチ
-   **受け入れ基準としてのテスト**: 新しい機能や改善を実装する前に、その機能が満たすべき受け入れ基準をE2Eテストとして記述します。このテストは初期には失敗しますが、開発を進めることで成功に変わります。
-   **リファクタリングのセーフティネット**: 既存のコードをリファクタリングする際には、対応するE2Eテストが変更前後でパスし続けることを確認することで、デグレードを防ぎます。
-   **リビングドキュメント**: Playwrightのテストコードとテストレポートは、アプリケーションの現在の振る舞いを正確に反映する「動く仕様書」として機能します。仕様書と実装の乖離を防ぎ、常に最新の状態を保ちます。
-   **コミュニケーションの促進**: 具体的なテストシナリオは、機能要件や期待される振る舞いについて、開発者、QA、PO間の共通理解を形成するための強力なコミュニケーションツールとなります。

### 2.3. テストの種類とレベル
-   **UI中心のE2Eテスト**: 主にユーザーインターフェースを通じた操作をシミュレートし、実際のユーザー体験に近い形でシステムの統合的な動作を検証します。
-   **リグレッションテスト**: 機能改修、バグ修正、依存関係の更新後などに実行し、既存機能への意図しない影響（デグレード）がないことを確認します。CI/CDパイプラインの中核をなします。
-   **スモークテスト**: 主要なユーザージャーニーや基幹機能が最低限動作することを確認する、短時間で実行可能なテストセット。デプロイ直後の健全性確認などに用います。

### 2.4. テスト自動化の方針
-   Playwrightを使用してE2Eテストケースを記述し、自動実行します。
-   開発者のローカル環境での実行、およびCI/CDパイプライン（例: GitHub Actions）への組み込みを必須とします。プルリクエスト作成時やマージ前、定期実行（夜間など）を通じて継続的なフィードバックを得ます。

## 3. テスト設計の詳細

### 3.1. ページオブジェクトモデル (POM)
POMは、UIの構造とテストロジックを分離し、テストコードの可読性、保守性、再利用性を高めるための重要な設計パターンです。
-   **設計原則**:
    -   **責務分離**: ページオブジェクトは、特定のページやコンポーネントの要素のロケータと、それらに対するユーザー操作（メソッド）のみをカプセル化します。テストのアサーションはテストケース側に記述します。
    -   **可読性**: メソッド名は、ユーザーの操作や目的を直感的に理解できるように命名します（例: `loginWithCredentials(user, pass)`, `searchForItem(itemName)`）。
    -   **保守性**: UIの変更があった場合、影響を受けるのは対応するページオブジェクトのみで、テストケースの修正を最小限に抑えます。
    -   **DRY (Don't Repeat Yourself)**: 共通の操作や要素アクセスは、ページオブジェクト内で共通化します。
-   **クラス構成**:
    -   **ページクラス**: アプリケーションの各主要ページ（例: `WelcomePage`, `ChatPage`, `SettingsPage`）に対応します。URL遷移やページ固有の要素、操作を持ちます。
    -   **コンポーネントクラス**: ページ内で再利用されるUI部品（例: `NavigationBar`, `MessageInputArea`, `UserProfileForm`）に対応します。特定のDOM構造を持ち、そのコンポーネント固有の操作を提供します。ページクラスはこれらのコンポーネントクラスを内包できます。
-   **POMのディレクトリ構造 (推奨):**
    ```
    apps/web/e2e/
    ├── pageObjects/
    │   ├── common/         // アプリケーション共通のコンポーネント (例: Header, Footer, Modal)
    │   │   ├── Header.ts
    │   │   └── ModalDialog.ts
    │   ├── WelcomePage.ts
    │   ├── ChatPage.ts
    │   ├── HistoryPage.ts
    │   ├── ProfilePage.ts
    │   └── SettingsPage.ts
    ├── specs/              // テストスペックファイル (テストケース)
    │   ├── welcome.spec.ts // ウェルカムページのシナリオ
    │   ├── chat.spec.ts    // チャット機能のシナリオ
    │   └── ...
    ├── utils/              // テストユーティリティ (ヘルパー関数、カスタムマッチャー等)
    │   └── testHelpers.ts
    └── playwright.config.ts
    ```
-   **状態を持つコンポーネントの操作**:
    -   アコーディオン、タブ、ドロップダウンなどの状態を持つコンポーネントは、その状態を変更する操作（例: `openAccordion()`, `selectTab(tabName)`）と、現在の状態を検証するためのゲッター（例: `isAccordionOpen()`, `getSelectedTab()`）をページオブジェクトに用意します。

### 3.2. テストデータの管理
信頼性が高く保守しやすいE2Eテストのためには、テストデータの戦略的な管理が不可欠です。
-   **データの種類**:
    -   **固定データ**: テストの前提条件として固定的に使用されるデータ（例: 特定の権限を持つテストユーザーの認証情報、マスターデータの一部）。これらは設定ファイルや専用のフィクスチャモジュールで管理します。
    -   **動的データ**: テスト実行中に生成・使用されるデータ（例: ユニークなチャットメッセージ、タイムスタンプ）。テストコード内で生成するか、ヘルパー関数を利用します。
-   **テストユーザー**:
    -   **役割ベース**: 異なる役割や権限を持つテストユーザーを複数用意します（例: 一般ユーザー、管理者ユーザー）。
    -   **状態ベース**: 特定の状態を持つユーザー（例: プロフィール未設定ユーザー、多数の会話履歴を持つユーザー）。
    -   ユーザー情報は安全な場所に保管し、テスト実行時に動的に読み込むか、環境変数経由で渡します。
-   **APIモック戦略 (MSW - Mock Service Worker の活用)**:
    -   **目的**: バックエンドAPIの不安定さや外部依存からテストを分離し、テストの安定性と実行速度を向上させる。特定のシナリオ（エラーケース、エッジケース）を確実に再現する。
    -   **モック対象**:
        -   不安定な外部API。
        -   開発中または未実装のAPI。
        -   特定のレスポンス（エラー、空データ、大量データ）をシミュレートしたい場合。
    -   **MSWの導入**: ブラウザレベルおよびNode.js環境（Playwrightのテストランナー）でネットワークリクエストをインターセプトし、モックレスポンスを返します。
        -   `apps/web/mocks/handlers.ts`: モックハンドラを定義。
        -   `apps/web/mocks/browser.ts`, `apps/web/mocks/server.ts`: MSWのセットアップ。
        -   テストケースや`test.beforeEach`内で、特定のシナリオに応じたハンドラの上書き（`server.use(...)`）も可能です。
    -   **注意点**: モックは実際のAPI仕様と同期が取れている必要があります。過度なモックは、実際のシステム間連携の問題を見逃すリスクがあるため、バランスが重要です。エンドツーエンドでのAPI連携テストも別途必要です。
-   **データのクリーンアップ**:
    -   テストによって作成されたデータ（例: 新規ユーザー、チャット履歴）は、テストの独立性を保つために、各テストの後（`afterEach`）またはテストスイートの後（`afterAll`）にクリーンアップすることが理想です。
    -   クリーンアップが難しい場合は、テストごとにユニークな識別子を持つデータを使用するなどの対策を検討します。

### 3.3. 状態管理と初期化 (特に `UserContext` 関連)
フロントエンドアプリケーションの状態、特にグローバルなコンテキスト（例: `UserContext`）は、E2Eテストの安定性に大きく影響します。
-   **課題認識**: `UserContext` の初期化が非同期で行われる場合や、特定のユーザーインタラクションに依存する場合、テスト開始時に期待する状態になっていない可能性があります。これにより、「要素が見つからない」「プロパティがnull」といったエラーが発生しやすくなります。
-   **対策と指針**:
    -   **明示的な待機**: `UserContext` の初期化完了を示す何らかの兆候（例: 特定の要素が表示される、ローディングスピナーが消える、コンテキスト内の特定の値がセットされる）をページオブジェクトやテストヘルパーで待ち合わせるようにします。Playwrightの自動待機だけでは不十分な場合があります。
    -   **テスト用初期化フック/ルート**: アプリケーション側に、テスト実行時に特定の状態（例: ログイン済み、特定のプロファイル情報をロード済み）で開始できるようなテスト専用の初期化ルートやメカニズムを設けることを検討します。これにより、各テストの前提条件を迅速かつ確実に満たすことができます。
        -   例: `page.goto('/?test_user=testuser1&initial_profile=loaded')` のようなクエリパラメータで初期状態を制御。
    -   **ローカルストレージ/セッションストレージの操作**: 認証トークンやユーザー設定がローカルストレージなどに保存される場合、`test.beforeEach` で `page.context().addCookies([...])` や `page.evaluate()` を使用してこれらの値を事前に設定することで、ログイン処理などをスキップできます。ただし、これにより実際のユーザーフローから乖離するリスクも考慮します。
    -   **状態のモック**: `UserContext` 自体や、それが依存するAPI呼び出しをMSWでモックし、テストに必要なプロファイル情報を直接提供することも有効です。

### 3.4. テストケースの設計
-   **粒度**: 各テストケースは、1つの明確なユーザーの目標や受け入れ基準を検証するようにします。複数のアサーションを含んでも良いですが、それらは単一のシナリオに関連するべきです。
-   **命名規則**:
    -   BDDスタイルを意識し、テスト対象の振る舞いが明確にわかるように記述します。
    -   例: `[ユーザー種別]が[ある状況]のとき、[ある操作]をすると、[期待される結果]が得られる`
        -   `chat_whenNewUserStartsConversation_thenChatInterfaceAppearsAndAgentGreets`
        -   `profile_whenUpdatingNicknameWithValidInput_thenSuccessMessageIsShownAndDataIsPersisted`
    -   Playwrightの`test.describe(description, callback)`と`test(title, callback)`を適切に使い、グループ化します。
-   **アサーション**: Playwrightの`expect` APIを最大限に活用します。
    -   `expect(locator).toBeVisible()`, `expect(page).toHaveURL()`, `expect(locator).toHaveText()` など。
    -   カスタムマッチャーやテストヘルパー関数を作成して、複雑なアサーションを簡潔に記述することも検討します。
    -   **重要**: アサーションは、ユーザーが知覚できる結果に対して行うことを基本とします（UIの表示、テキスト内容、URLなど）。
-   **タグ付けと優先度**:
    -   **タグ**: `@smoke`, `@regression`, `@user-story-ID` (例: `@US123`), `@feature-chat`, `@critical-path` などを利用し、テスト実行スコープを柔軟に制御します。
    -   **優先度**: P0 (最重要、スモークテスト候補), P1 (重要、主要機能), P2 (その他) のように定義し、リソースが限られる場合の実行順序や対象選定に役立てます。
-   **Given-When-Then (GWT) スタイルの導入検討**:
    -   テストケースの構造をGWTで記述することで、前提条件(Given)、操作(When)、期待結果(Then)が明確になり、シナリオの可読性が向上します。Playwrightのテスト記述自体はGherkinを直接サポートしませんが、コメントやテストケースの構成でこの精神を反映させることができます。
    ```typescript
    test('should allow user to send a message and receive a response', async ({ page }) => {
      const chatPage = new ChatPage(page);

      // Given: User is on the chat page and agent is ready
      await chatPage.navigateTo();
      await expect(chatPage.messageInput).toBeVisible();

      // When: User types a message and sends it
      await chatPage.typeMessage('Hello, agent!');
      await chatPage.clickSendMessage();

      // Then: User's message and agent's response appear in the chat history
      await expect(chatPage.getLastUserMessage()).toHaveText('Hello, agent!');
      await expect(chatPage.getLastAgentResponse()).not.toBeEmpty(); // より具体的なアサーションが望ましい
    });
    ```

## 4. 高度なテストテクニック

### 4.1. 非同期処理のテスト
現代のWebアプリケーションは非同期処理に大きく依存しており、E2Eテストではこれらを適切に扱う必要があります。
-   **Playwrightの自動待機**: Playwrightは多くの場合、要素が表示される、操作可能になる、などを自動的に待機します。しかし、これだけでは不十分な場合があります。
-   **カスタム待機条件**:
    -   `page.waitForFunction()`: 特定のJavaScript表現が真になるまで待機します。DOMの状態やグローバル変数の変化を待つのに有効です。
    -   `page.waitForSelector(selector, { state: 'attached' | 'detached' | 'visible' | 'hidden' })`: より詳細な状態指定。
    -   `page.waitForResponse()`: 特定のAPIレスポンスを待機します。MSWを使用している場合でも、モックされたレスポンスを待つことができます。
    -   `page.waitForLoadState('networkidle')`: ネットワークアクティビティが落ち着くまで待機しますが、使い方に注意が必要です（SPAでは期待通りに動作しないことも）。
-   **ポーリング**: 特定の条件が満たされるまで、短い間隔でチェックを繰り返すカスタムヘルパー関数を作成することが有効な場合があります。
-   **リアルタイム機能（チャットなど）**: WebSocketなどを使用するリアルタイム機能では、メッセージの受信などを確実にとらえるために、より高度な待機処理やイベントフックが必要になることがあります。レスポンスタイムに幅があることも考慮します。

### 4.2. エラーハンドリングとテストの堅牢性
-   **アプリケーションのエラーケース**:
    -   APIエラー時（500エラー、403エラーなど）のUI表示やエラーメッセージの検証。
    -   フォームバリデーションエラーの検証。
    -   ネットワーク接続断などのエッジケース（可能であれば）。
-   **テストの安定性向上 (Flaky Test対策)**:
    -   **原因特定**: Flaky TestはE2Eテストの信頼性を大きく損ないます。原因（タイミング問題、環境依存、テストデータ競合など）を徹底的に調査します。Playwrightのトレース機能が役立ちます。
    -   **適切な待機処理**: 最も一般的な原因は待機不足です。上記「非同期処理のテスト」を参照し、適切な待機を実装します。
    -   **要素の特定**: 動的なIDや変わりやすいセレクタを避け、`data-testid`のようなテスト専用属性や、より安定したセレクタ（ARIAロールなど）を使用します。
    -   **テストの独立性**: 各テストケースが独立して実行できるようにし、他のテストの状態に依存しないようにします。`test.beforeEach`でのクリーンアップや初期化を徹底します。
    -   **Playwrightのリトライ**: `playwright.config.ts`で`retries`を設定することで、失敗したテストを自動的にリトライさせることができます。CI環境では1〜2回のリトライを設定することが一般的ですが、根本的なFlakyの原因解決が優先です。

### 4.3. アクセシビリティ (a11y) テスト
アプリケーションがすべてのユーザーにとって利用しやすいことを保証するために、基本的なアクセシビリティチェックをE2Eテストに組み込むことを推奨します。
-   **`@axe-core/playwright` の活用**: Deque Systemsの`axe-core`ライブラリとPlaywrightのインテグレーションを使用します。
    ```typescript
    import { test, expect } from '@playwright/test';
    import AxeBuilder from '@axe-core/playwright';

    test('homepage should not have a11y violations', async ({ page }) => {
      await page.goto('/');
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
    ```
-   **対象範囲**: 主要ページや共通コンポーネントに対して定期的に実行します。
-   **注意点**: 自動テストで検出できるのは一部の機械的に判断可能な問題です。手動でのアクセシビリティ評価も重要です。

## 5. テスト環境と実行

### 5.1. 対象ブラウザ
-   Chromium (主要開発・テストターゲット)
-   Firefox
-   WebKit (Safari)
    `playwright.config.ts`の`projects`で設定し、主要なテストは全ブラウザで実行、または定期的にクロスブラウザテストを実施します。

### 5.2. 実行環境
-   **ローカル開発環境**: 開発者がコード変更時に随時実行。
-   **CI環境 (GitHub Actionsなど)**: プルリクエスト時、マージ時、定期実行（夜間バッチなど）。

### 5.3. テスト実行コマンド
`package.json`の`scripts`に定義します。
-   `yarn test:e2e`: 全てのE2Eテストを実行。
-   `yarn test:e2e --spec=chat.spec.ts`: 特定のスペックファイルを実行。
-   `yarn test:e2e --grep=@smoke`: 特定のタグを持つテストを実行。
-   `yarn test:e2e --headed`: ヘッダーモードで実行（ローカルデバッグ用）。
-   `yarn test:e2e --ui`: Playwright UIモードで実行（テストの対話的デバッグ）。

### 5.4. テストレポート
-   **Playwright HTML Reporter**: `playwright-report/index.html` に生成されます。テスト結果、ステップ、エラー詳細、スクリーンショット、トレース、ビデオ（失敗時）などを確認できます。
-   **CI環境**: テスト結果のサマリーをビルドログに出力。失敗時には通知（Slack連携など）を設定します。アーティファクトとしてHTMLレポートを保存します。
-   `test:e2e`スクリプトを修正し、JSONレポーターも有効化することで、結果を機械処理しやすくすることも検討します（例: カスタムダッシュボードへの連携）。
    ```jsonc
    // package.json (scripts)
    "test:e2e": "playwright test --reporter=html,json --output=playwright-report/results.json,line"
    ```
    現在の設定 `playwright test --reporter=json,line > playwright-report/results.json` は、標準出力をリダイレクトしており、複数のレポーター出力を適切に扱うには `--output` オプションか、`playwright.config.ts` での `reporter` 設定が推奨されます。

## 6. Playwright設定 (`playwright.config.ts`) のポイント
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e/specs', // テストスペックファイルの場所
  fullyParallel: true, // テストの並列実行を有効化
  forbidOnly: !!process.env.CI, // CI環境では test.only を禁止
  retries: process.env.CI ? 2 : 0, // CI環境では2回リトライ
  workers: process.env.CI ? 1 : undefined, // CI環境でのワーカー数 (リソースに応じて調整)
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report/html' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'] // コンソール出力用
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000', // ベースURL
    trace: 'on-first-retry', // 最初の失敗リトライ時にトレースを記録
    screenshot: 'only-on-failure', // 失敗時のみスクリーンショット
    video: 'retain-on-failure', // 失敗時のみビデオを保存
    headless: !(process.env.PLAYWRIGHT_HEADED === 'true'), // 環境変数でヘッドレスモードを制御
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  // webServer: { // ローカルテスト時に開発サーバーを自動起動する場合
  //   command: 'yarn dev:log', // or appropriate command to start dev server
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   stdout: 'pipe',
  //   stderr: 'pipe',
  //   timeout: 120 * 1000,
  // },
});
```
**注意**: `webServer`設定は、`dev:log` がバックグラウンドで適切に動作し、Playwrightが起動を検知できるか確認が必要です。`yarn dev:log` の出力先 `dev-server.log` をPlaywrightが監視するわけではないため、標準出力/エラー出力への変更や、URLへの疎通確認 (`url`オプション) が重要になります。

## 7. 保守と改善
-   **継続的リファクタリング**: テストコードとページオブジェクトは、アプリケーションコードと同様にリファクタリングの対象です。可読性、保守性を維持・向上させるために定期的に見直します。
-   **変更への追従**: アプリケーションの機能変更やUIの変更があった場合、速やかにE2Eテストを更新します。テスト駆動アプローチでは、これが自然なプロセスの一部となります。
-   **テスト実行時間の監視**: テストスイート全体の実行時間を監視し、許容できないほど長くなる場合は、テストケースの見直し、実行環境の最適化（並列実行ワーカー数の調整など）、不要なテストの削除などを検討します。
-   **Flaky Testの撲滅**: Flaky TestはCI/CDプロセスの信頼性を著しく低下させます。発見次第、最優先で原因を特定し修正します。

---
以上 