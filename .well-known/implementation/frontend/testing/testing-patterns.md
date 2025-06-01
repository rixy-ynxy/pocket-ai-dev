# テスト統合パターン (Testing Integration Patterns)

## 概要

現代的なフロントエンドアプリケーションにおける包括的なテスト戦略と実装のための実証済みパターンを定義します。Jest、React Testing Library、Playwright、Cypress を活用した高品質なテストスイートの構築方法とベストプラクティスを提供します。

## 基本テストパターン

### 1. テスト環境セットアップパターン

#### **Jest 設定**
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    // CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // 画像・ファイル
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
    // パスエイリアス
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-markdown|remark-gfm|react-syntax-highlighter)/)'
  ]
}

// jest.setup.js
import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'

// React Testing Library 設定
configure({
  testIdAttribute: 'data-testid',
})

// モック設定
global.fetch = jest.fn()
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Next.js router モック
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Next.js Image モック
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => <img {...props} />,
}))

// Chart.js モック
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}))
```

#### **テストユーティリティ**
```typescript
// test-utils.tsx
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

// カスタムプロバイダー
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  initialEntries?: string[]
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    initialEntries = ['/'],
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </BrowserRouter>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

// モックデータファクトリ
export const mockUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const mockKnowledgeItem = (overrides = {}) => ({
  id: '1',
  title: 'Test Article',
  content: '# Test Content\n\nThis is a test article.',
  excerpt: 'This is a test article.',
  type: 'document' as const,
  status: 'published' as const,
  tags: ['test', 'example'],
  metadata: {},
  view_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'testuser',
  ...overrides,
})

// API モックヘルパー
export function mockApiResponse(data: any, delay = 0) {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    }).then(response => delay > 0 
      ? new Promise(resolve => setTimeout(() => resolve(response), delay))
      : response
    )
  )
}

export function mockApiError(status = 500, message = 'Internal Server Error') {
  return jest.fn().mockRejectedValue(
    new Error(`${status}: ${message}`)
  )
}

// カスタムマッチャー
expect.extend({
  toHaveLoadingState(received: HTMLElement) {
    const hasSpinner = received.querySelector('[data-testid="loading-spinner"]')
    const hasLoadingText = received.textContent?.includes('読み込み中') || 
                           received.textContent?.includes('Loading')
    
    return {
      message: () => `expected element to have loading state`,
      pass: !!(hasSpinner || hasLoadingText),
    }
  },
})
```

### 2. コンポーネントテストパターン

#### **基本コンポーネントテスト**
```typescript
// components/Button/Button.test.tsx
import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils'
import { Button } from './Button'

describe('Button', () => {
  it('renders with correct text', () => {
    renderWithProviders(<Button>Click me</Button>)
    
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    renderWithProviders(
      <Button onClick={handleClick}>Click me</Button>
    )
    
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    renderWithProviders(
      <Button loading>Loading button</Button>
    )
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('applies variant styles correctly', () => {
    const { rerender } = renderWithProviders(
      <Button variant="primary">Primary</Button>
    )
    
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600')
    
    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200')
  })

  it('is accessible', () => {
    renderWithProviders(
      <Button aria-label="Close dialog">×</Button>
    )
    
    const button = screen.getByRole('button', { name: /close dialog/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAccessibleName('Close dialog')
  })
})
```

#### **複合コンポーネントテスト**
```typescript
// components/SearchBar/SearchBar.test.tsx
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils'
import { SearchBar } from './SearchBar'

describe('SearchBar', () => {
  it('performs search on input change', async () => {
    const user = userEvent.setup()
    const mockOnSearch = jest.fn()
    
    renderWithProviders(
      <SearchBar onSearch={mockOnSearch} placeholder="Search..." />
    )
    
    const input = screen.getByPlaceholderText(/search/i)
    await user.type(input, 'test query')
    
    // デバウンス待機
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test query')
    }, { timeout: 1000 })
  })

  it('shows search suggestions', async () => {
    const user = userEvent.setup()
    const suggestions = ['React', 'TypeScript', 'Testing']
    
    renderWithProviders(
      <SearchBar suggestions={suggestions} />
    )
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'rea')
    
    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument()
    })
  })

  it('navigates suggestions with keyboard', async () => {
    const user = userEvent.setup()
    const suggestions = ['Apple', 'Banana', 'Cherry']
    
    renderWithProviders(
      <SearchBar suggestions={suggestions} />
    )
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'a')
    
    // 下矢印キーで移動
    await user.keyboard('{ArrowDown}')
    expect(screen.getByText('Apple')).toHaveClass('highlighted')
    
    await user.keyboard('{ArrowDown}')
    expect(screen.getByText('Banana')).toHaveClass('highlighted')
    
    // Enter で選択
    await user.keyboard('{Enter}')
    expect(input).toHaveValue('Banana')
  })

  it('clears search on escape key', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(<SearchBar />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'test')
    await user.keyboard('{Escape}')
    
    expect(input).toHaveValue('')
  })
})
```

### 3. React Hooks テストパターン

#### **カスタムフックテスト**
```typescript
// hooks/useKnowledgeSearch.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient, renderWithProviders } from '@/test-utils'
import { useKnowledgeSearch } from './useKnowledgeSearch'

const mockItems = [
  { id: '1', title: 'React Basics', content: 'Learn React fundamentals', tags: ['react'] },
  { id: '2', title: 'TypeScript Guide', content: 'TypeScript best practices', tags: ['typescript'] },
  { id: '3', title: 'Testing Tutorial', content: 'How to test React apps', tags: ['testing', 'react'] },
]

describe('useKnowledgeSearch', () => {
  it('initializes with empty results', () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockItems))
    
    expect(result.current.results).toEqual([])
    expect(result.current.isSearching).toBe(false)
  })

  it('performs text search', async () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockItems))
    
    act(() => {
      result.current.updateFilters({ query: 'React' })
    })
    
    await waitFor(() => {
      expect(result.current.results).toHaveLength(2)
      expect(result.current.results[0].item.title).toContain('React')
    })
  })

  it('filters by tags', async () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockItems))
    
    act(() => {
      result.current.updateFilters({ tags: ['typescript'] })
    })
    
    await waitFor(() => {
      expect(result.current.results).toHaveLength(1)
      expect(result.current.results[0].item.title).toBe('TypeScript Guide')
    })
  })

  it('sorts results correctly', async () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockItems))
    
    act(() => {
      result.current.updateFilters({ 
        sortBy: 'title',
        sortOrder: 'asc'
      })
    })
    
    await waitFor(() => {
      const titles = result.current.results.map(r => r.item.title)
      expect(titles).toEqual(['React Basics', 'Testing Tutorial', 'TypeScript Guide'])
    })
  })

  it('resets search correctly', async () => {
    const { result } = renderHook(() => useKnowledgeSearch(mockItems))
    
    act(() => {
      result.current.updateFilters({ query: 'React', tags: ['react'] })
    })
    
    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })
    
    act(() => {
      result.current.resetSearch()
    })
    
    await waitFor(() => {
      expect(result.current.filters.query).toBeUndefined()
      expect(result.current.filters.tags).toBeUndefined()
    })
  })
})
```

#### **非同期フックテスト**
```typescript
// hooks/useApiData.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useApiData } from './useApiData'

// APIモック
const mockFetch = jest.fn()
global.fetch = mockFetch

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useApiData', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('fetches data successfully', async () => {
    const mockData = { items: [{ id: 1, name: 'Test' }] }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const { result } = renderHook(
      () => useApiData('/api/test'),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('handles fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(
      () => useApiData('/api/test'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeTruthy()
  })

  it('retries on failure when enabled', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('First attempt'))
      .mockRejectedValueOnce(new Error('Second attempt'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

    const { result } = renderHook(
      () => useApiData('/api/test', { retryCount: 3 }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({ success: true })
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})
```

## 統合テストパターン

### 1. API統合テスト

#### **RESTful API テスト**
```typescript
// api/knowledge.test.ts
import { setupServer } from 'msw/node'
import { rest } from 'msw'
import { KnowledgeService } from './knowledge'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('KnowledgeService', () => {
  const service = new KnowledgeService('/api/v1')

  it('fetches knowledge items', async () => {
    const mockItems = [
      { id: '1', title: 'Test Item', content: 'Test content' }
    ]

    server.use(
      rest.get('/api/v1/knowledge/items', (req, res, ctx) => {
        return res(ctx.json({ items: mockItems }))
      })
    )

    const result = await service.getItems()
    
    expect(result.items).toEqual(mockItems)
  })

  it('handles search parameters', async () => {
    server.use(
      rest.get('/api/v1/knowledge/items', (req, res, ctx) => {
        const query = req.url.searchParams.get('search')
        const category = req.url.searchParams.get('category')
        
        expect(query).toBe('react')
        expect(category).toBe('tutorial')
        
        return res(ctx.json({ items: [] }))
      })
    )

    await service.getItems({ search: 'react', category: 'tutorial' })
  })

  it('handles API errors gracefully', async () => {
    server.use(
      rest.get('/api/v1/knowledge/items', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Internal server error' }))
      })
    )

    await expect(service.getItems()).rejects.toThrow('500')
  })

  it('creates new knowledge item', async () => {
    const newItem = {
      title: 'New Item',
      content: 'New content',
      type: 'document' as const
    }

    const createdItem = { ...newItem, id: '2', created_at: '2024-01-01T00:00:00Z' }

    server.use(
      rest.post('/api/v1/knowledge/items', async (req, res, ctx) => {
        const body = await req.json()
        
        expect(body).toMatchObject(newItem)
        
        return res(ctx.status(201), ctx.json(createdItem))
      })
    )

    const result = await service.createItem(newItem)
    
    expect(result).toEqual(createdItem)
  })

  it('validates request data', async () => {
    const invalidItem = {
      title: '', // 必須フィールドが空
      content: 'Content'
    }

    server.use(
      rest.post('/api/v1/knowledge/items', (req, res, ctx) => {
        return res(
          ctx.status(400),
          ctx.json({
            error: 'Validation error',
            details: { title: ['Title is required'] }
          })
        )
      })
    )

    await expect(service.createItem(invalidItem)).rejects.toThrow('400')
  })
})
```

#### **GraphQL API テスト**
```typescript
// api/graphql.test.ts
import { createTestClient } from 'apollo-server-testing'
import { gql } from '@apollo/client'
import { server } from '../server/apollo-server'

const { query, mutate } = createTestClient(server)

describe('GraphQL API', () => {
  it('fetches knowledge items', async () => {
    const GET_KNOWLEDGE_ITEMS = gql`
      query GetKnowledgeItems($filter: KnowledgeFilter) {
        knowledgeItems(filter: $filter) {
          id
          title
          content
          tags
          createdAt
        }
      }
    `

    const { data } = await query({
      query: GET_KNOWLEDGE_ITEMS,
      variables: {
        filter: { status: 'published' }
      }
    })

    expect(data.knowledgeItems).toBeDefined()
    expect(Array.isArray(data.knowledgeItems)).toBe(true)
  })

  it('creates knowledge item', async () => {
    const CREATE_KNOWLEDGE_ITEM = gql`
      mutation CreateKnowledgeItem($input: CreateKnowledgeItemInput!) {
        createKnowledgeItem(input: $input) {
          id
          title
          content
          status
        }
      }
    `

    const { data } = await mutate({
      mutation: CREATE_KNOWLEDGE_ITEM,
      variables: {
        input: {
          title: 'Test Item',
          content: 'Test content',
          type: 'DOCUMENT'
        }
      }
    })

    expect(data.createKnowledgeItem).toBeDefined()
    expect(data.createKnowledgeItem.title).toBe('Test Item')
  })

  it('handles validation errors', async () => {
    const CREATE_KNOWLEDGE_ITEM = gql`
      mutation CreateKnowledgeItem($input: CreateKnowledgeItemInput!) {
        createKnowledgeItem(input: $input) {
          id
          title
        }
      }
    `

    const { errors } = await mutate({
      mutation: CREATE_KNOWLEDGE_ITEM,
      variables: {
        input: {
          title: '', // 無効なデータ
          content: 'Content'
        }
      }
    })

    expect(errors).toBeDefined()
    expect(errors[0].message).toContain('title')
  })
})
```

### 2. ページ・フィーチャーテスト

#### **完全フィーチャーテスト**
```typescript
// features/knowledge-management.test.tsx
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { renderWithProviders, mockKnowledgeItem } from '@/test-utils'
import { KnowledgeListPage } from '@/pages/KnowledgeListPage'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Knowledge Management Feature', () => {
  const mockItems = [
    mockKnowledgeItem({ id: '1', title: 'React Basics', tags: ['react', 'tutorial'] }),
    mockKnowledgeItem({ id: '2', title: 'TypeScript Guide', tags: ['typescript', 'guide'] }),
    mockKnowledgeItem({ id: '3', title: 'Testing Best Practices', tags: ['testing', 'best-practices'] }),
  ]

  beforeEach(() => {
    server.use(
      rest.get('/api/v1/knowledge/items', (req, res, ctx) => {
        return res(ctx.json({ items: mockItems }))
      }),
      rest.get('/api/v1/knowledge/categories', (req, res, ctx) => {
        return res(ctx.json([
          { id: '1', name: 'Tutorial', item_count: 2 },
          { id: '2', name: 'Guide', item_count: 1 }
        ]))
      })
    )
  })

  it('displays knowledge items list', async () => {
    renderWithProviders(<KnowledgeListPage />)

    // ローディング状態確認
    expect(screen.getByText(/読み込み中/i)).toBeInTheDocument()

    // データ表示確認
    await waitFor(() => {
      expect(screen.getByText('React Basics')).toBeInTheDocument()
    })

    expect(screen.getByText('TypeScript Guide')).toBeInTheDocument()
    expect(screen.getByText('Testing Best Practices')).toBeInTheDocument()
  })

  it('filters items by search query', async () => {
    const user = userEvent.setup()
    renderWithProviders(<KnowledgeListPage />)

    await waitFor(() => {
      expect(screen.getByText('React Basics')).toBeInTheDocument()
    })

    // 検索実行
    const searchInput = screen.getByRole('textbox', { name: /search/i })
    await user.type(searchInput, 'React')

    // フィルタ結果確認
    await waitFor(() => {
      expect(screen.getByText('React Basics')).toBeInTheDocument()
      expect(screen.queryByText('TypeScript Guide')).not.toBeInTheDocument()
    })
  })

  it('filters items by category', async () => {
    const user = userEvent.setup()
    renderWithProviders(<KnowledgeListPage />)

    await waitFor(() => {
      expect(screen.getByText('Tutorial')).toBeInTheDocument()
    })

    // カテゴリクリック
    await user.click(screen.getByText('Tutorial'))

    // フィルタ適用確認
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tutorial/i })).toHaveClass('active')
    })
  })

  it('navigates to item detail on click', async () => {
    const user = userEvent.setup()
    const mockPush = jest.fn()
    
    jest.mock('next/router', () => ({
      useRouter: () => ({
        push: mockPush,
      }),
    }))

    renderWithProviders(<KnowledgeListPage />)

    await waitFor(() => {
      expect(screen.getByText('React Basics')).toBeInTheDocument()
    })

    // アイテムクリック
    await user.click(screen.getByText('React Basics'))

    expect(mockPush).toHaveBeenCalledWith('/knowledge/1')
  })

  it('handles error states gracefully', async () => {
    server.use(
      rest.get('/api/v1/knowledge/items', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }))
      })
    )

    renderWithProviders(<KnowledgeListPage />)

    await waitFor(() => {
      expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument()
    })

    // リトライボタン確認
    expect(screen.getByRole('button', { name: /再試行/i })).toBeInTheDocument()
  })

  it('supports pagination', async () => {
    const user = userEvent.setup()
    
    // 大量データのモック
    const manyItems = Array.from({ length: 25 }, (_, i) => 
      mockKnowledgeItem({ 
        id: `${i + 1}`, 
        title: `Item ${i + 1}` 
      })
    )

    server.use(
      rest.get('/api/v1/knowledge/items', (req, res, ctx) => {
        const page = parseInt(req.url.searchParams.get('page') || '1')
        const perPage = parseInt(req.url.searchParams.get('per_page') || '10')
        const start = (page - 1) * perPage
        const end = start + perPage

        return res(ctx.json({
          items: manyItems.slice(start, end),
          total: manyItems.length,
          page,
          per_page: perPage,
          has_next: end < manyItems.length,
          has_prev: page > 1
        }))
      })
    )

    renderWithProviders(<KnowledgeListPage />)

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument()
    })

    // ページ2に移動
    const nextButton = screen.getByRole('button', { name: /次のページ/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Item 11')).toBeInTheDocument()
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
    })
  })
})
```

## E2Eテストパターン

### 1. Playwright E2Eテスト

#### **基本E2E設定**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
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
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
```

#### **E2Eテスト実装**
```typescript
// e2e/knowledge-management.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Knowledge Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/knowledge')
  })

  test('full user journey - browse, search, and view', async ({ page }) => {
    // ページロード確認
    await expect(page.locator('h1')).toContainText('ナレッジベース')

    // アイテム一覧表示確認
    await expect(page.locator('[data-testid="knowledge-item"]')).toHaveCount(3)

    // 検索機能テスト
    await page.fill('[data-testid="search-input"]', 'React')
    await page.keyboard.press('Enter')

    // 検索結果確認
    await expect(page.locator('[data-testid="knowledge-item"]')).toHaveCount(1)
    await expect(page.locator('text=React Basics')).toBeVisible()

    // 詳細ページに移動
    await page.click('[data-testid="knowledge-item"]:first-child')
    
    // 詳細ページ確認
    await expect(page.locator('h1')).toContainText('React Basics')
    await expect(page.locator('[data-testid="markdown-content"]')).toBeVisible()

    // パンくずリスト確認
    await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('ホーム')
    await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('React Basics')
  })

  test('responsive design on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    // モバイルメニュー確認
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
    
    // メニューオープン
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()

    // レスポンシブレイアウト確認
    await expect(page.locator('[data-testid="knowledge-item"]')).toHaveCSS('flex-direction', 'column')
  })

  test('keyboard navigation', async ({ page }) => {
    // Tab キーでナビゲーション
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="knowledge-item"]:first-child')).toBeFocused()

    // Enter キーで選択
    await page.keyboard.press('Enter')
    await expect(page.locator('h1')).toContainText('React Basics')
  })

  test('error handling and recovery', async ({ page }) => {
    // ネットワークエラーシミュレーション
    await page.route('/api/v1/knowledge/items', route => {
      route.fulfill({ status: 500, body: 'Server Error' })
    })

    await page.reload()

    // エラー状態確認
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()

    // リトライ機能確認
    await page.route('/api/v1/knowledge/items', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] })
      })
    })

    await page.click('[data-testid="retry-button"]')
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
  })

  test('performance and accessibility', async ({ page }) => {
    // パフォーマンス測定
    const performanceMetrics = await page.evaluate(() => {
      return {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      }
    })

    expect(performanceMetrics.loadTime).toBeLessThan(3000)
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000)

    // アクセシビリティチェック
    await expect(page.locator('h1')).toHaveAttribute('role', 'heading')
    await expect(page.locator('[data-testid="search-input"]')).toHaveAttribute('aria-label')
    
    // フォーカス可能要素の確認
    const focusableElements = await page.locator('button, a, input, [tabindex]:not([tabindex="-1"])').count()
    expect(focusableElements).toBeGreaterThan(0)
  })
})
```

### 2. Visual Regression テスト

#### **スクリーンショット比較**
```typescript
// e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test('knowledge list page layout', async ({ page }) => {
    await page.goto('/knowledge')
    await page.waitForLoadState('networkidle')

    // フルページスクリーンショット
    await expect(page).toHaveScreenshot('knowledge-list-full.png')

    // 特定要素のスクリーンショット
    await expect(page.locator('[data-testid="knowledge-items-grid"]')).toHaveScreenshot('knowledge-grid.png')
  })

  test('knowledge detail page layout', async ({ page }) => {
    await page.goto('/knowledge/1')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('knowledge-detail-full.png')

    // Markdownコンテンツ
    await expect(page.locator('[data-testid="markdown-content"]')).toHaveScreenshot('markdown-content.png')
  })

  test('responsive layouts', async ({ page }) => {
    // デスクトップ
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/knowledge')
    await expect(page).toHaveScreenshot('desktop-layout.png')

    // タブレット
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page).toHaveScreenshot('tablet-layout.png')

    // モバイル
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page).toHaveScreenshot('mobile-layout.png')
  })

  test('dark mode theme', async ({ page }) => {
    await page.goto('/knowledge')
    
    // ダークモード切り替え
    await page.click('[data-testid="theme-toggle"]')
    await page.waitForTimeout(500) // テーマ切り替えアニメーション待機

    await expect(page).toHaveScreenshot('dark-mode.png')
  })
})
```

## パフォーマンステストパターン

### 1. ロードテスト

#### **負荷テスト**
```typescript
// performance/load-test.ts
import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('page load performance', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/knowledge')
    
    // Core Web Vitals 測定
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const metrics = {}
          
          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              metrics.lcp = entry.startTime
            }
            if (entry.entryType === 'first-input') {
              metrics.fid = entry.processingStart - entry.startTime
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              metrics.cls = (metrics.cls || 0) + entry.value
            }
          })
          
          resolve(metrics)
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
        
        // タイムアウト
        setTimeout(() => resolve({}), 5000)
      })
    })

    const loadTime = Date.now() - startTime

    // パフォーマンス基準
    expect(loadTime).toBeLessThan(3000)
    if (metrics.lcp) expect(metrics.lcp).toBeLessThan(2500)
    if (metrics.fid) expect(metrics.fid).toBeLessThan(100)
    if (metrics.cls) expect(metrics.cls).toBeLessThan(0.1)
  })

  test('memory usage monitoring', async ({ page, context }) => {
    // メモリ使用量測定開始
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    // 大量データ操作
    await page.goto('/knowledge')
    
    for (let i = 0; i < 10; i++) {
      await page.fill('[data-testid="search-input"]', `test query ${i}`)
      await page.waitForTimeout(100)
    }

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    // メモリリーク検出
    const memoryIncrease = finalMemory - initialMemory
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB以下
  })
})
```

## まとめ

テスト統合パターンの適切な実装により、高品質で信頼性の高いフロントエンドアプリケーションを開発できます。ユニットテスト、統合テスト、E2Eテスト、パフォーマンステストの組み合わせにより、包括的なテストカバレッジを実現し、バグの早期発見と品質向上を図ることが可能です。Jest、React Testing Library、Playwright を活用した実証済みパターンにより、効率的なテストスイートの構築と継続的な品質改善が実現できます。 