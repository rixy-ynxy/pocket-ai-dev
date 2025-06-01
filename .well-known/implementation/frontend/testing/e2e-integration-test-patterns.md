# 統合テストパターン

@version[1.0.0]
@owner[test-team]
@category[e2e-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、E2Eテストにおける統合テストパターンを定義します。
複数のサービス間の連携、データフローの検証、およびエンドツーエンドのシナリオテストのパターンを提供します。

## 実装パターン

### 1. サービス統合テストパターン
```typescript
// tests/integration/order-payment.spec.ts
import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';
import { OrderService } from '../../services/OrderService';
import { PaymentService } from '../../services/PaymentService';
import { InventoryService } from '../../services/InventoryService';

test.describe('Order-Payment Integration', () => {
  let apiClient: ApiClient;
  let orderService: OrderService;
  let paymentService: PaymentService;
  let inventoryService: InventoryService;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request, process.env.API_BASE_URL);
    orderService = new OrderService(apiClient);
    paymentService = new PaymentService(apiClient);
    inventoryService = new InventoryService(apiClient);

    // 認証設定
    await apiClient.authenticate();
  });

  test('complete order flow', async () => {
    // 在庫確認
    const inventory = await inventoryService.checkStock('product-1');
    expect(inventory.available).toBeGreaterThan(0);

    // 注文作成
    const order = await orderService.createOrder({
      items: [{ productId: 'product-1', quantity: 1 }],
      shippingAddress: {
        street: '123 Main St',
        city: 'Test City',
        country: 'Test Country',
        postalCode: '12345',
      },
    });
    expect(order.status).toBe('pending');

    // 支払い処理
    const payment = await paymentService.processPayment({
      orderId: order.id,
      amount: order.total,
      method: 'credit_card',
      cardDetails: {
        number: '4111111111111111',
        expiry: '12/25',
        cvv: '123',
      },
    });
    expect(payment.status).toBe('completed');

    // 注文ステータス確認
    const updatedOrder = await orderService.getOrder(order.id);
    expect(updatedOrder.status).toBe('processing');

    // 在庫更新確認
    const updatedInventory = await inventoryService.checkStock('product-1');
    expect(updatedInventory.available).toBe(inventory.available - 1);
  });
});
```

### 2. データフロー検証パターン
```typescript
// tests/integration/data-flow.spec.ts
import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';
import { DataFlowService } from '../../services/DataFlowService';

test.describe('Data Flow Integration', () => {
  let apiClient: ApiClient;
  let dataFlowService: DataFlowService;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request, process.env.API_BASE_URL);
    dataFlowService = new DataFlowService(apiClient);
    await apiClient.authenticate();
  });

  test('verify data consistency across services', async () => {
    // ユーザーデータ作成
    const user = await dataFlowService.createUser({
      email: 'test@example.com',
      name: 'Test User',
    });

    // プロファイル更新
    await dataFlowService.updateProfile(user.id, {
      address: '123 Main St',
      phone: '1234567890',
    });

    // 各サービスでのデータ整合性確認
    const userData = await dataFlowService.getUserData(user.id);
    const profileData = await dataFlowService.getProfileData(user.id);
    const analyticsData = await dataFlowService.getAnalyticsData(user.id);

    expect(userData.email).toBe('test@example.com');
    expect(profileData.address).toBe('123 Main St');
    expect(analyticsData.lastUpdated).toBeDefined();
  });
});
```

### 3. イベント駆動テストパターン
```typescript
// tests/integration/event-driven.spec.ts
import { test, expect } from '@playwright/test';
import { ApiClient } from '../../api/ApiClient';
import { EventService } from '../../services/EventService';
import { sleep } from '../../utils/test-helpers';

test.describe('Event-Driven Integration', () => {
  let apiClient: ApiClient;
  let eventService: EventService;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request, process.env.API_BASE_URL);
    eventService = new EventService(apiClient);
    await apiClient.authenticate();
  });

  test('verify event propagation', async () => {
    // イベント発行
    const event = await eventService.publishEvent('user.created', {
      userId: '123',
      email: 'test@example.com',
    });

    // イベント処理の完了を待機
    await sleep(1000);

    // イベント処理結果の検証
    const notifications = await eventService.getNotifications('user.123');
    expect(notifications).toContainEqual(
      expect.objectContaining({
        type: 'welcome_email',
        status: 'sent',
      })
    );

    const analytics = await eventService.getAnalytics('user.123');
    expect(analytics.events).toContainEqual(
      expect.objectContaining({
        type: 'user_created',
        processed: true,
      })
    );
  });
});
```

## 設計原則

### 1. テストの分類
- サービス統合テスト
- データフロー検証
- イベント駆動テスト
- エンドツーエンドシナリオ

### 2. テストの設計
- サービス抽象化
- データ整合性検証
- イベント処理の検証

### 3. テストの保守性
- 再利用可能なサービスクラス
- 適切な待機戦略
- クリーンアップ処理

## アンチパターン

### 1. 避けるべきプラクティス
- 不適切な待機時間
- テストデータの未クリーンアップ
- 不安定なテスト環境

### 2. 改善パターン
- 適切な待機戦略の実装
- テストデータの適切な管理
- 環境の安定化

## レビューチェックリスト
- [ ] サービス間の連携が適切にテストされている
- [ ] データの整合性が検証されている
- [ ] イベントの伝播が確認されている
- [ ] エラーケースが考慮されている
- [ ] クリーンアップが適切に実装されている

## 関連パターン
- UIテストパターン（`ui_test_patterns.md`）
- APIテストパターン（`api_test_patterns.md`）
- テストユーティリティパターン（`test_utility_patterns.md`）