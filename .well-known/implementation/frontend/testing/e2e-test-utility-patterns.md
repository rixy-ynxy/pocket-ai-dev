# テストユーティリティパターン

@version[1.0.0]
@owner[test-team]
@category[e2e-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、E2Eテストで使用するユーティリティパターンを定義します。
テストデータの生成、待機処理、アサーション、ログ出力などの共通機能を提供します。

## 実装パターン

### 1. テストデータ生成パターン
```typescript
// utils/test-data.ts
import { faker } from '@faker-js/faker';
import { User, Order, Product } from '../types';

export class TestDataGenerator {
  static createUser(): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        country: faker.location.country(),
        postalCode: faker.location.zipCode(),
      },
      phone: faker.phone.number(),
    };
  }

  static createProduct(): Product {
    return {
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price()),
      category: faker.commerce.department(),
      stock: faker.number.int({ min: 1, max: 100 }),
    };
  }

  static createOrder(userId: string, products: Product[]): Order {
    return {
      id: faker.string.uuid(),
      userId,
      items: products.map(product => ({
        productId: product.id,
        quantity: faker.number.int({ min: 1, max: 5 }),
        price: product.price,
      })),
      status: 'pending',
      total: products.reduce((sum, product) => sum + product.price, 0),
      createdAt: new Date().toISOString(),
    };
  }
}
```

### 2. 待機処理パターン
```typescript
// utils/wait.ts
export class WaitUtils {
  static async waitForCondition(
    condition: () => Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      message?: string;
    } = {}
  ): Promise<void> {
    const {
      timeout = 5000,
      interval = 100,
      message = 'Condition not met',
    } = options;

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Timeout: ${message}`);
  }

  static async waitForResponse<T>(
    request: Promise<T>,
    options: {
      timeout?: number;
      retries?: number;
      backoff?: number;
    } = {}
  ): Promise<T> {
    const {
      timeout = 5000,
      retries = 3,
      backoff = 1000,
    } = options;

    let lastError: Error | null = null;
    for (let i = 0; i < retries; i++) {
      try {
        const result = await Promise.race([
          request,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          ),
        ]);
        return result as T;
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve =>
          setTimeout(resolve, backoff * Math.pow(2, i))
        );
      }
    }
    throw lastError;
  }
}
```

### 3. アサーションパターン
```typescript
// utils/assertions.ts
import { expect } from '@playwright/test';

export class CustomAssertions {
  static async assertEventually(
    assertion: () => Promise<void>,
    options: {
      timeout?: number;
      interval?: number;
      message?: string;
    } = {}
  ): Promise<void> {
    const {
      timeout = 5000,
      interval = 100,
      message = 'Assertion failed',
    } = options;

    await WaitUtils.waitForCondition(
      async () => {
        try {
          await assertion();
          return true;
        } catch {
          return false;
        }
      },
      { timeout, interval, message }
    );
  }

  static async assertResponseStatus(
    response: { status: number },
    expectedStatus: number | number[]
  ): Promise<void> {
    const statusList = Array.isArray(expectedStatus)
      ? expectedStatus
      : [expectedStatus];
    expect(statusList).toContain(response.status);
  }

  static async assertDataConsistency<T>(
    actual: T,
    expected: Partial<T>
  ): Promise<void> {
    Object.entries(expected).forEach(([key, value]) => {
      expect(actual).toHaveProperty(key, value);
    });
  }
}
```

### 4. ログ出力パターン
```typescript
// utils/logger.ts
import winston from 'winston';

export class TestLogger {
  private static instance: winston.Logger;

  static getInstance(): winston.Logger {
    if (!TestLogger.instance) {
      TestLogger.instance = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new winston.transports.File({
            filename: 'logs/test-error.log',
            level: 'error',
          }),
          new winston.transports.File({
            filename: 'logs/test.log',
          }),
        ],
      });

      if (process.env.NODE_ENV !== 'production') {
        TestLogger.instance.add(
          new winston.transports.Console({
            format: winston.format.simple(),
          })
        );
      }
    }

    return TestLogger.instance;
  }

  static log(
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    TestLogger.getInstance().log(level, message, metadata);
  }

  static error(message: string, error?: Error): void {
    TestLogger.getInstance().error(message, {
      error: error?.message,
      stack: error?.stack,
    });
  }
}
```

## 設計原則

### 1. ユーティリティの分類
- テストデータ生成
- 待機処理
- アサーション
- ログ出力

### 2. 設計の考慮点
- 再利用性
- 柔軟性
- エラーハンドリング
- パフォーマンス

### 3. 保守性
- モジュール化
- 適切なエラーメッセージ
- ドキュメンテーション

## アンチパターン

### 1. 避けるべきプラクティス
- ハードコードされたテストデータ
- 不適切な待機時間
- 不明確なエラーメッセージ

### 2. 改善パターン
- 動的なテストデータ生成
- 適切な待機戦略
- 明確なエラーメッセージ

## レビューチェックリスト
- [ ] ユーティリティが適切に分類されている
- [ ] エラーハンドリングが実装されている
- [ ] パフォーマンスが考慮されている
- [ ] ドキュメントが整備されている
- [ ] テストカバレッジが十分である

## 関連パターン
- UIテストパターン（`ui_test_patterns.md`）
- APIテストパターン（`api_test_patterns.md`）
- 統合テストパターン（`integration_test_patterns.md`） 