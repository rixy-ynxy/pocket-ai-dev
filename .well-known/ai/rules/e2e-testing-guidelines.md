# AI向け Playwright E2Eテスト開発ガイドライン

## 1. 基本方針

-   **ユーザーシナリオ中心**: `chat-consultation-docs/wbs/user_scenarios.md` に記載されたユーザーストーリーの受け入れ基準をカバーするテストを作成してください。
-   **テストファースト**: 新機能・変更時は、まず振る舞いを定義するE2Eテストを作成します。
-   **POM (ページオブジェクトモデル)**: UIの構造とテストロジックを分離します。保守性と再利用性を高めるため、必ずPOMに従ってください。
-   **セレクタ**: `data-testid` 属性を最優先で使用し、無い場合は安定したARIAロールや意味的なセレクタを選択します。動的なIDやCSSクラス名は避けてください。
-   **アサーション**: Playwrightの `expect` API を使用し、ユーザーが知覚できる結果（表示、テキスト、URLなど）を検証します。

## 2. ページオブジェクトモデル (POM) ガイドライン

-   **配置場所**: `apps/web/e2e/pageObjects/` 以下に、ページ単位または共通コンポーネント単位でファイルを作成します。
    -   ページ: `ChatPage.ts`, `SettingsPage.ts` など。
    -   共通コンポーネント: `common/Header.ts`, `common/ModalDialog.ts` など。
-   **責務**: 
    -   ページ/コンポーネント内の要素のロケータを定義します。
    -   ユーザーが行う操作をメソッドとしてカプセル化します (例: `fillLoginForm(user, pass)`, `clickSubmitButton()`)。
    -   **アサーションはテストスペックファイル側に記述します。** POM内には含めないでください。
-   **命名規則**: メソッド名は、ユーザーの行動を明確に示す動詞句にします (例: `navigateTo()`, `getMessageText()` )。

## 3. テストケース (`*.spec.ts`) ガイドライン

-   **配置場所**: `apps/web/e2e/specs/` 以下に、機能単位やページ単位でファイルを作成します。
-   **構造 (Given-When-Then スタイルを推奨)**:
    ```typescript
    test('ユーザーがメッセージを送信し、応答を受信できること', async ({ page }) => {
      const chatPage = new ChatPage(page); // POMのインスタンス化

      // Given: 前提条件 - ユーザーがチャットページにいて、エージェントが準備完了
      await chatPage.navigateTo();
      await expect(chatPage.messageInput).toBeVisible();

      // When: 操作 - ユーザーがメッセージを入力して送信
      await chatPage.typeMessage('こんにちは');
      await chatPage.clickSendMessageButton();

      // Then: 期待結果 - ユーザーのメッセージとエージェントの応答がチャット履歴に表示される
      await expect(chatPage.getLastUserMessage()).toHaveText('こんにちは');
      await expect(chatPage.getLastAgentResponse()).not.toBeEmpty(); 
    });
    ```
-   **命名規則**: `test.describe` と `test` のタイトルは、テスト対象の振る舞いが日本語で明確にわかるように記述します。
-   **テストデータ**: 
    -   固定的なテストユーザー情報などは、テストコード内で直接定義するのではなく、別途管理された場所から読み込むことを検討してください（将来的な課題）。
    -   MSW (`apps/web/mocks/handlers.ts`) を活用してAPIレスポンスをモックし、テストの安定性を高め、特定のエラーケースを再現します。
-   **状態管理 (`UserContext` など)**: 
    -   コンテキストの初期化や非同期処理が完了するまで、適切な待機処理（`expect(locator).toBeVisible()` や `page.waitForFunction()` など）を確実に入れてください。
    -   必要に応じて、テスト開始前にローカルストレージやクッキーを設定して、特定のユーザー状態でテストを開始できるようにしてください。

## 4. 非同期処理と待機

-   Playwrightの自動待機を基本としますが、それだけでは不十分な場合があります。
-   **明示的な待機**: 
    -   `expect(locator).toBeVisible()`, `expect(locator).toBeEnabled()` などのアサーション自体が待機として機能します。
    -   特定のAPIレスポンスを待つ場合は `page.waitForResponse()`。
    -   複雑な条件の場合は `page.waitForFunction()`。
-   `page.waitForTimeout()` のような固定時間の待機は、テストの不安定性を招くため、極力避けてください。

## 5. エラーハンドリングと堅牢性

-   Flaky Testを避けるため、安定したセレクタ、十分な待機処理、テスト間の独立性を確保してください。
-   Playwrightのトレース機能 (`trace: 'on-first-retry'`) を活用して、失敗原因を調査してください。

## 6. その他

-   アクセシビリティテスト (`@axe-core/playwright`) の基本的なチェックを主要ページに追加することを推奨します。
-   テスト実行コマンドやレポートについては、`package.json` および `playwright.config.ts` を参照してください。

このガイドラインは、必要に応じて更新されます。不明な点があれば、プロジェクトリードに確認してください。 