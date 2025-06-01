# テスト駆動開発（TDD）ガイドライン

## 基本原則

### 1. Red-Green-Refactorサイクル
1. Red: 失敗するテストを書く
2. Green: テストが通るように最小限の実装を行う
3. Refactor: コードをリファクタリングする

### 2. テストの優先順位
1. 単体テスト（Unit Tests）
2. 統合テスト（Integration Tests）
3. E2Eテスト（End-to-End Tests）

## フロントエンドテスト戦略

### 1. コンポーネントテスト
```typescript
// 基本的なコンポーネントテストの例
describe('Component', () => {
  it('初期状態を正しく表示する', () => {
    render(<Component />);
    expect(screen.getByText('期待される文字列')).toBeInTheDocument();
  });

  it('ユーザーインタラクションに正しく反応する', async () => {
    const { user } = renderWithUser(<Component />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('更新後の文字列')).toBeInTheDocument();
  });
});
```

### 2. カスタムフック
```typescript
// カスタムフックのテスト例
describe('useCustomHook', () => {
  it('初期状態を返す', () => {
    const { result } = renderHook(() => useCustomHook());
    expect(result.current).toBe(expectedValue);
  });

  it('状態を更新する', () => {
    const { result } = renderHook(() => useCustomHook());
    act(() => {
      result.current.update(newValue);
    });
    expect(result.current.value).toBe(newValue);
  });
});
```

### 3. ストア/状態管理
```typescript
// Reduxストアのテスト例
describe('slice', () => {
  it('初期状態を持つ', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('状態を更新する', () => {
    const actual = reducer(initialState, action);
    expect(actual).toEqual(expectedState);
  });
});
```

## テストユーティリティ

### 1. 共通レンダリング関数
```typescript
// src/shared/utils/test-utils.tsx
export const renderWithUser = (ui: React.ReactElement) => {
  const utils = render(ui);
  const user = userEvent.setup();
  return { ...utils, user };
};
```

### 2. モックデータ生成
```typescript
// src/shared/utils/test-data.ts
export const createMockUser = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});
```

## ベストプラクティス

### 1. テストの構造
- 各テストファイルは対応するコンポーネント/機能と同じディレクトリ構造に配置
- テストファイルは`.test.ts(x)`または`.spec.ts(x)`の拡張子を使用
- `__tests__`ディレクトリを使用する場合は機能ごとにグループ化

### 2. テストの命名
- テスト名は「何をテストするか」を明確に示す
- Given-When-Then形式を推奨
```typescript
it('ボタンがクリックされたとき、カウンターが増加する', async () => {
  // Given
  const { user } = renderWithUser(<Counter />);
  
  // When
  await user.click(screen.getByRole('button'));
  
  // Then
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

### 3. アサーション
- 可能な限り具体的なアサーションを使用
- ユーザーの視点からテストを書く
- アクセシビリティを考慮したセレクターを使用

## テストカバレッジ

### 1. カバレッジ目標
- ステートメントカバレッジ: 80%以上
- ブランチカバレッジ: 80%以上
- 関数カバレッジ: 90%以上

### 2. カバレッジレポート
```bash
# カバレッジレポートの生成
npm test -- --coverage
```

## CI/CD統合

### 1. プルリクエスト時のチェック
- すべてのテストが成功すること
- カバレッジ基準を満たすこと
- コードスタイルガイドに準拠すること

### 2. 自動テスト実行
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm test
```
