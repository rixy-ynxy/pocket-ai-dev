# UIテストパターン

@version[1.0.0]
@owner[test-team]
@category[e2e-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、UIのE2Eテストパターンを定義します。
Playwrightを使用したUIテスト、ページオブジェクト、テストユーティリティなどのパターンを提供します。

## 実装パターン

### 1. ページオブジェクトパターン
```typescript
// page-objects/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Login' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }

  async isLoggedIn() {
    return this.page.url().includes('/dashboard');
  }
}

// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('successful login', async () => {
    await loginPage.login('user@example.com', 'password123');
    await expect(loginPage.isLoggedIn()).resolves.toBe(true);
  });

  test('invalid credentials', async () => {
    await loginPage.login('invalid@example.com', 'wrongpass');
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.getErrorMessage()).resolves.toContain('Invalid credentials');
  });
});
```

### 2. コンポーネントテストパターン
```typescript
// tests/components/Button.spec.ts
import { test, expect } from '@playwright/test';
import { ButtonPage } from '../page-objects/ButtonPage';

test.describe('Button Component', () => {
  let buttonPage: ButtonPage;

  test.beforeEach(async ({ page }) => {
    buttonPage = new ButtonPage(page);
    await buttonPage.goto();
  });

  test('primary button styles', async () => {
    const button = buttonPage.getPrimaryButton();
    await expect(button).toHaveCSS('background-color', 'rgb(59, 130, 246)');
    await expect(button).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('disabled button state', async () => {
    const button = buttonPage.getDisabledButton();
    await expect(button).toBeDisabled();
    await expect(button).toHaveCSS('opacity', '0.5');
  });

  test('button click handler', async () => {
    await buttonPage.clickButton();
    await expect(buttonPage.getClickCount()).resolves.toBe('1');
  });
});

// page-objects/ButtonPage.ts
import { Page, Locator } from '@playwright/test';

export class ButtonPage {
  readonly page: Page;
  readonly primaryButton: Locator;
  readonly disabledButton: Locator;
  readonly clickCounter: Locator;

  constructor(page: Page) {
    this.page = page;
    this.primaryButton = page.getByRole('button', { name: 'Click me' });
    this.disabledButton = page.getByRole('button', { name: 'Disabled' });
    this.clickCounter = page.getByTestId('click-count');
  }

  async goto() {
    await this.page.goto('/components/button');
  }

  getPrimaryButton() {
    return this.primaryButton;
  }

  getDisabledButton() {
    return this.disabledButton;
  }

  async clickButton() {
    await this.primaryButton.click();
  }

  async getClickCount() {
    return this.clickCounter.textContent();
  }
}
```

### 3. フォームテストパターン
```typescript
// tests/forms/Registration.spec.ts
import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../page-objects/RegistrationPage';

test.describe('Registration Form', () => {
  let registrationPage: RegistrationPage;

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page);
    await registrationPage.goto();
  });

  test('form validation', async () => {
    await registrationPage.submitForm();
    await expect(registrationPage.getEmailError()).resolves.toContain('Email is required');
    await expect(registrationPage.getPasswordError()).resolves.toContain('Password is required');
  });

  test('password strength indicator', async () => {
    await registrationPage.typePassword('weak');
    await expect(registrationPage.getStrengthIndicator()).resolves.toContain('Weak');

    await registrationPage.typePassword('StrongP@ssw0rd');
    await expect(registrationPage.getStrengthIndicator()).resolves.toContain('Strong');
  });

  test('successful registration', async () => {
    await registrationPage.fillForm({
      email: 'test@example.com',
      password: 'StrongP@ssw0rd',
      confirmPassword: 'StrongP@ssw0rd',
    });
    await registrationPage.submitForm();
    await expect(registrationPage.getSuccessMessage()).resolves.toContain('Registration successful');
  });
});

// page-objects/RegistrationPage.ts
import { Page, Locator } from '@playwright/test';

interface RegistrationFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export class RegistrationPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly strengthIndicator: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.confirmPasswordInput = page.getByLabel('Confirm Password');
    this.submitButton = page.getByRole('button', { name: 'Register' });
    this.emailError = page.getByTestId('email-error');
    this.passwordError = page.getByTestId('password-error');
    this.strengthIndicator = page.getByTestId('password-strength');
    this.successMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/register');
  }

  async fillForm(data: RegistrationFormData) {
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.confirmPassword);
  }

  async typePassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submitForm() {
    await this.submitButton.click();
  }

  async getEmailError() {
    return this.emailError.textContent();
  }

  async getPasswordError() {
    return this.passwordError.textContent();
  }

  async getStrengthIndicator() {
    return this.strengthIndicator.textContent();
  }

  async getSuccessMessage() {
    return this.successMessage.textContent();
  }
}
```

## 設計原則

### 1. テストの分類
- コンポーネントテスト
- フォームテスト
- ナビゲーションテスト
- インタラクションテスト

### 2. テストの設計
- ページオブジェクトモデル
- テストデータ管理
- アサーション戦略

### 3. テストの保守性
- 再利用可能なユーティリティ
- テストの独立性
- エラーハンドリング

## アンチパターン

### 1. 避けるべきプラクティス
- 不安定なセレクタ
- 不適切な待機戦略
- テストの相互依存

### 2. 改善パターン
- 安定したセレクタ
- 適切な待機戦略
- テストの独立性確保

## レビューチェックリスト
- [ ] テストが安定している
- [ ] セレクタが適切である
- [ ] 待機戦略が適切である
- [ ] エラーメッセージが明確である
- [ ] テストカバレッジが十分である

## 関連パターン
- APIテストパターン（`api_test_patterns.md`）
- 統合テストパターン（`integration_test_patterns.md`）
- テストユーティリティパターン（`test_utility_patterns.md`） 