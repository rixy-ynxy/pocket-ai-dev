# APIテストパターン

@version[1.0.0]
@owner[test-team]
@category[e2e-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、APIのE2Eテストパターンを定義します。
Playwrightを使用したAPIテスト、リクエスト/レスポンスの検証、認証などのパターンを提供します。

## 実装パターン

### 1. APIクライアントパターン
```typescript
// api/ApiClient.ts
import { APIRequestContext } from '@playwright/test';

export class ApiClient {
  private request: APIRequestContext;
  private baseUrl: string;
  private authToken?: string;

  constructor(request: APIRequestContext, baseUrl: string) {
    this.request = request;
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  async get<T>(path: string) {
    const response = await this.request.get(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
    });
    return {
      status: response.status(),
      data: await response.json() as T,
    };
  }

  async post<T>(path: string, data: any) {
    const response = await this.request.post(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
      data,
    });
    return {
      status: response.status(),
      data: await response.json() as T,
    };
  }

  async put<T>(path: string, data: any) {
    const response = await this.request.put(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
      data,
    });
    return {
      status: response.status(),
      data: await response.json() as T,
    };
  }

  async delete(path: string) {
    const response = await this.request.delete(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
    });
    return {
      status: response.status(),
    };
  }
}
```

### 2. APIテストパターン
```typescript
// tests/api/orders.spec.ts
import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';
import { OrderData, CreateOrderRequest } from '../../types/api';

test.describe('Orders API', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request, process.env.API_BASE_URL);
    // 認証トークンの設定
    const auth = await apiClient.post('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
    apiClient.setAuthToken(auth.data.token);
  });

  test('create order', async () => {
    const orderData: CreateOrderRequest = {
      items: [
        { productId: '1', quantity: 2 },
        { productId: '2', quantity: 1 },
      ],
      shippingAddress: {
        street: '123 Main St',
        city: 'Test City',
        country: 'Test Country',
        postalCode: '12345',
      },
    };

    const response = await apiClient.post<OrderData>('/orders', orderData);
    expect(response.status).toBe(201);
    expect(response.data.status).toBe('pending');
    expect(response.data.items).toHaveLength(2);
  });

  test('get order details', async () => {
    // 注文の作成
    const createResponse = await apiClient.post<OrderData>('/orders', {
      items: [{ productId: '1', quantity: 1 }],
      shippingAddress: {
        street: '123 Main St',
        city: 'Test City',
        country: 'Test Country',
        postalCode: '12345',
      },
    });

    // 注文の取得
    const orderId = createResponse.data.id;
    const response = await apiClient.get<OrderData>(`/orders/${orderId}`);
    expect(response.status).toBe(200);
    expect(response.data.id).toBe(orderId);
  });

  test('update order status', async () => {
    // 注文の作成
    const createResponse = await apiClient.post<OrderData>('/orders', {
      items: [{ productId: '1', quantity: 1 }],
      shippingAddress: {
        street: '123 Main St',
        city: 'Test City',
        country: 'Test Country',
        postalCode: '12345',
      },
    });

    // 注文ステータスの更新
    const orderId = createResponse.data.id;
    const response = await apiClient.put<OrderData>(`/orders/${orderId}`, {
      status: 'processing',
    });
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('processing');
  });

  test('delete order', async () => {
    // 注文の作成
    const createResponse = await apiClient.post<OrderData>('/orders', {
      items: [{ productId: '1', quantity: 1 }],
      shippingAddress: {
        street: '123 Main St',
        city: 'Test City',
        country: 'Test Country',
        postalCode: '12345',
      },
    });

    // 注文の削除
    const orderId = createResponse.data.id;
    const response = await apiClient.delete(`/orders/${orderId}`);
    expect(response.status).toBe(204);

    // 削除された注文の取得を試みる
    const getResponse = await apiClient.get(`/orders/${orderId}`);
    expect(getResponse.status).toBe(404);
  });
});
```

### 3. APIスキーマ検証パターン
```typescript
// tests/api/schema.spec.ts
import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';
import { z } from 'zod';

// APIレスポンススキーマの定義
const OrderSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
    price: z.number(),
  })),
  total: z.number(),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    country: z.string(),
    postalCode: z.string(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

test.describe('API Schema Validation', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request, process.env.API_BASE_URL);
    const auth = await apiClient.post('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
    apiClient.setAuthToken(auth.data.token);
  });

  test('order response schema', async () => {
    // 注文の作成
    const response = await apiClient.post('/orders', {
      items: [{ productId: '1', quantity: 1 }],
      shippingAddress: {
        street: '123 Main St',
        city: 'Test City',
        country: 'Test Country',
        postalCode: '12345',
      },
    });

    // スキーマ検証
    expect(() => OrderSchema.parse(response.data)).not.toThrow();
  });

  test('orders list response schema', async () => {
    const response = await apiClient.get('/orders');
    const OrdersListSchema = z.array(OrderSchema);
    expect(() => OrdersListSchema.parse(response.data)).not.toThrow();
  });
});
```

## 設計原則

### 1. テストの分類
- エンドポイントテスト
- スキーマ検証
- 認証/認可テスト
- エラーハンドリング

### 2. テストの設計
- APIクライアントの抽象化
- テストデータの管理
- スキーマ定義

### 3. テストの保守性
- 再利用可能なユーティリティ
- 環境設定の管理
- エラーハンドリング

## アンチパターン

### 1. 避けるべきプラクティス
- ハードコードされた認証情報
- 不適切なエラーハンドリング
- テストの相互依存

### 2. 改善パターン
- 環境変数による設定管理
- 適切なエラーハンドリング
- テストの独立性確保

## レビューチェックリスト
- [ ] エンドポイントが適切にテストされている
- [ ] スキーマ検証が実装されている
- [ ] エラーケースが考慮されている
- [ ] 認証が適切に処理されている
- [ ] テストカバレッジが十分である

## 関連パターン
- UIテストパターン（`ui_test_patterns.md`）
- 統合テストパターン（`integration_test_patterns.md`）
- テストユーティリティパターン（`test_utility_patterns.md`）