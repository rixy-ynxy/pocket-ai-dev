# フロントエンドパターン (Frontend Patterns)

## 概要

現代的なフロントエンドアプリケーションの設計と実装のための実証済みパターンを定義します。Next.js、React、TypeScript、Tailwind CSSを活用した高品質なユーザーインターフェースの構築方法とベストプラクティスを提供します。

## 基本フロントエンドパターン

### 1. Next.js アプリケーション構造

#### **App Router アーキテクチャ**
```typescript
// Next.js 14 App Router構造
// app/
//   ├── layout.tsx          // ルートレイアウト
//   ├── page.tsx           // ホームページ
//   ├── loading.tsx        // ローディングUI
//   ├── error.tsx          // エラーUI
//   ├── not-found.tsx      // 404ページ
//   └── (routes)/
//       ├── dashboard/
//       │   ├── layout.tsx  // ダッシュボードレイアウト
//       │   ├── page.tsx    // ダッシュボードメイン
//       │   └── analytics/
//       │       └── page.tsx
//       └── api/
//           └── users/
//               └── route.ts // API Route

// ルートレイアウト実装
import { Inter } from 'next/font/google'
import './globals.css'
import { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | アプリケーション名',
    default: 'アプリケーション名'
  },
  description: 'アプリケーションの説明',
  keywords: ['Next.js', 'React', 'TypeScript'],
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" className={inter.className}>
      <body className="min-h-screen bg-gray-50">
        <div className="flex flex-col min-h-screen">
          <header>
            {/* グローバルヘッダー */}
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer>
            {/* グローバルフッター */}
          </footer>
        </div>
      </body>
    </html>
  )
}
```

#### **TypeScript型安全性**
```typescript
// 型定義の基本パターン
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

export interface User extends BaseEntity {
  username: string
  email: string
  full_name?: string
  is_active: boolean
  profile?: UserProfile
}

export interface UserProfile {
  bio?: string
  avatar_url?: string
  location?: string
}

// API レスポンス型
export interface ApiResponse<T> {
  data: T
  status: 'success' | 'error'
  message?: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  has_next: boolean
  has_prev: boolean
}

// コンポーネントProps型
export interface UserCardProps {
  user: User
  onEdit?: (user: User) => void
  onDelete?: (userId: string) => void
  className?: string
}

// Hooks型
export interface UseUsersResult {
  users: User[]
  loading: boolean
  error: string | null
  fetchUsers: () => Promise<void>
  createUser: (userData: Omit<User, keyof BaseEntity>) => Promise<User>
  updateUser: (id: string, userData: Partial<User>) => Promise<User>
  deleteUser: (id: string) => Promise<void>
}
```

### 2. React コンポーネントパターン

#### **関数コンポーネント設計**
```typescript
import { useState, useEffect, useCallback } from 'react'
import { User, PaginatedResponse } from '@/types'

// カスタムフック
export function useUsers(initialPage: number = 1, perPage: number = 10) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: initialPage,
    per_page: perPage,
    total: 0,
    has_next: false,
    has_prev: false
  })

  const fetchUsers = useCallback(async (page: number = pagination.page) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/users?page=${page}&per_page=${perPage}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data: PaginatedResponse<User> = await response.json()
      
      setUsers(data.items)
      setPagination({
        page: data.page,
        per_page: data.per_page,
        total: data.total,
        has_next: data.has_next,
        has_prev: data.has_prev
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, perPage])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const goToPage = useCallback((page: number) => {
    fetchUsers(page)
  }, [fetchUsers])

  return {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    goToPage
  }
}

// レスポンシブコンポーネント
interface UserListProps {
  className?: string
  onUserSelect?: (user: User) => void
}

export function UserList({ className = '', onUserSelect }: UserListProps) {
  const { users, loading, error, pagination, goToPage } = useUsers()

  if (loading) {
    return <UserListSkeleton />
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          リトライ
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* レスポンシブグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <UserCard 
            key={user.id} 
            user={user} 
            onClick={() => onUserSelect?.(user)}
          />
        ))}
      </div>
      
      {/* ページネーション */}
      <Pagination 
        {...pagination}
        onPageChange={goToPage}
      />
    </div>
  )
}

// ユーザーカードコンポーネント
interface UserCardProps {
  user: User
  onClick?: () => void
  className?: string
}

export function UserCard({ user, onClick, className = '' }: UserCardProps) {
  return (
    <div 
      className={`
        p-6 bg-white rounded-lg shadow-sm border border-gray-200
        hover:shadow-md transition-shadow duration-200
        ${onClick ? 'cursor-pointer hover:border-gray-300' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        {/* アバター */}
        <div className="flex-shrink-0">
          {user.profile?.avatar_url ? (
            <img 
              src={user.profile.avatar_url} 
              alt={user.full_name || user.username}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium">
                {(user.full_name || user.username).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* ユーザー情報 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {user.full_name || user.username}
          </h3>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          {user.profile?.location && (
            <p className="text-xs text-gray-400">{user.profile.location}</p>
          )}
        </div>
        
        {/* ステータス */}
        <div className="flex-shrink-0">
          <span className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            ${user.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
            }
          `}>
            {user.is_active ? 'アクティブ' : '非アクティブ'}
          </span>
        </div>
      </div>
    </div>
  )
}
```

### 3. Tailwind CSS スタイリングパターン

#### **デザインシステム統合**
```typescript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ]
}

// スタイルユーティリティ
export const buttonVariants = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'hover:bg-gray-100 text-gray-700',
} as const

export const inputVariants = {
  default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
  error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
  success: 'border-green-300 focus:border-green-500 focus:ring-green-500',
} as const

// ユーティリティコンポーネント
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  className = '',
  children,
  ...props 
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <button
      className={`
        inline-flex items-center justify-center
        font-medium rounded-md
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${buttonVariants[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
```

## 高度フロントエンドパターン

### 1. 状態管理パターン

#### **React Context + Reducer**
```typescript
import { createContext, useContext, useReducer, ReactNode } from 'react'

// 状態型定義
interface AppState {
  user: User | null
  notifications: Notification[]
  theme: 'light' | 'dark'
  sidebarOpen: boolean
}

// アクション型定義
type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_SIDEBAR' }

// リデューサー
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload }
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      }
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      }
    
    case 'TOGGLE_THEME':
      return {
        ...state,
        theme: state.theme === 'light' ? 'dark' : 'light'
      }
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen }
    
    default:
      return state
  }
}

// コンテキスト作成
const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | null>(null)

// プロバイダーコンポーネント
interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, {
    user: null,
    notifications: [],
    theme: 'light',
    sidebarOpen: false
  })

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

// カスタムフック
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

// 便利なフック
export function useNotifications() {
  const { state, dispatch } = useApp()
  
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { ...notification, id }
    })
    
    // 自動削除（5秒後）
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
    }, 5000)
  }, [dispatch])
  
  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }, [dispatch])
  
  return {
    notifications: state.notifications,
    addNotification,
    removeNotification
  }
}
```

### 2. フォーム処理パターン

#### **React Hook Form統合**
```typescript
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// バリデーションスキーマ
const userFormSchema = z.object({
  username: z
    .string()
    .min(3, 'ユーザー名は3文字以上である必要があります')
    .max(50, 'ユーザー名は50文字以下である必要があります'),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください'),
  full_name: z
    .string()
    .min(1, '氏名を入力してください')
    .optional(),
  bio: z
    .string()
    .max(500, '自己紹介は500文字以下である必要があります')
    .optional(),
})

type UserFormData = z.infer<typeof userFormSchema>

// フォームコンポーネント
interface UserFormProps {
  initialData?: Partial<UserFormData>
  onSubmit: (data: UserFormData) => Promise<void>
  onCancel?: () => void
}

export function UserForm({ initialData, onSubmit, onCancel }: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    reset
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData
  })

  const handleFormSubmit = async (data: UserFormData) => {
    try {
      await onSubmit(data)
      reset()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* ユーザー名 */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          ユーザー名 *
        </label>
        <input
          {...register('username')}
          type="text"
          className={`
            mt-1 block w-full rounded-md shadow-sm
            ${errors.username 
              ? inputVariants.error 
              : inputVariants.default
            }
          `}
        />
        {errors.username && (
          <p className="mt-1 text-sm text-red-600">
            {errors.username.message}
          </p>
        )}
      </div>

      {/* メールアドレス */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          メールアドレス *
        </label>
        <input
          {...register('email')}
          type="email"
          className={`
            mt-1 block w-full rounded-md shadow-sm
            ${errors.email 
              ? inputVariants.error 
              : inputVariants.default
            }
          `}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* 氏名 */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          氏名
        </label>
        <input
          {...register('full_name')}
          type="text"
          className={`
            mt-1 block w-full rounded-md shadow-sm
            ${errors.full_name 
              ? inputVariants.error 
              : inputVariants.default
            }
          `}
        />
        {errors.full_name && (
          <p className="mt-1 text-sm text-red-600">
            {errors.full_name.message}
          </p>
        )}
      </div>

      {/* 自己紹介 */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          自己紹介
        </label>
        <Controller
          name="bio"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              rows={4}
              className={`
                mt-1 block w-full rounded-md shadow-sm
                ${errors.bio 
                  ? inputVariants.error 
                  : inputVariants.default
                }
              `}
            />
          )}
        />
        {errors.bio && (
          <p className="mt-1 text-sm text-red-600">
            {errors.bio.message}
          </p>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onCancel}
          >
            キャンセル
          </Button>
        )}
        <Button 
          type="submit" 
          loading={isSubmitting}
        >
          保存
        </Button>
      </div>
    </form>
  )
}
```

### 3. API統合パターン

#### **型安全なAPIクライアント**
```typescript
// APIクライアント基底クラス
class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new ApiError(response.status, error.message || 'Request failed')
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }
}

// APIエラークラス
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// API サービス層
class UserService {
  constructor(private client: ApiClient) {}

  async getUsers(params?: {
    page?: number
    per_page?: number
    search?: string
  }): Promise<PaginatedResponse<User>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())
    if (params?.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    const endpoint = `/users${query ? `?${query}` : ''}`
    
    return this.client.get<PaginatedResponse<User>>(endpoint)
  }

  async getUser(id: string): Promise<User> {
    return this.client.get<User>(`/users/${id}`)
  }

  async createUser(userData: Omit<User, keyof BaseEntity>): Promise<User> {
    return this.client.post<User>('/users', userData)
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    return this.client.put<User>(`/users/${id}`, userData)
  }

  async deleteUser(id: string): Promise<void> {
    return this.client.delete<void>(`/users/${id}`)
  }
}

// React Query統合
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const apiClient = new ApiClient('/api/v1')
const userService = new UserService(apiClient)

// ユーザー一覧取得フック
export function useUsers(params?: Parameters<typeof userService.getUsers>[0]) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userService.getUsers(params),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  })
}

// ユーザー作成フック
export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      // キャッシュ無効化
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
```

## パフォーマンス最適化パターン

### 1. コンポーネント最適化

#### **メモ化とレンダリング最適化**
```typescript
import { memo, useMemo, useCallback } from 'react'

// メモ化されたコンポーネント
export const UserCard = memo<UserCardProps>(({ user, onEdit, onDelete }) => {
  // 重い計算のメモ化
  const userStats = useMemo(() => {
    return calculateUserStats(user)
  }, [user])

  // コールバックのメモ化
  const handleEdit = useCallback(() => {
    onEdit?.(user)
  }, [onEdit, user])

  const handleDelete = useCallback(() => {
    onDelete?.(user.id)
  }, [onDelete, user.id])

  return (
    <div className="user-card">
      {/* コンポーネント内容 */}
    </div>
  )
})

// 仮想化リスト
import { FixedSizeList as List } from 'react-window'

interface VirtualizedUserListProps {
  users: User[]
  onUserSelect: (user: User) => void
}

export function VirtualizedUserList({ users, onUserSelect }: VirtualizedUserListProps) {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const user = users[index]
    
    return (
      <div style={style}>
        <UserCard 
          user={user} 
          onEdit={() => onUserSelect(user)}
        />
      </div>
    )
  }, [users, onUserSelect])

  return (
    <List
      height={600}
      itemCount={users.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

### 2. 遅延読み込み

#### **動的インポートとSuspense**
```typescript
import { Suspense, lazy } from 'react'

// 動的インポート
const AdminPanel = lazy(() => import('./AdminPanel'))
const UserDashboard = lazy(() => import('./UserDashboard'))
const AnalyticsPage = lazy(() => import('./AnalyticsPage'))

// ローディングコンポーネント
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

// App Router でのSuspense使用
export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dashboard-layout">
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </div>
  )
}

// 画像の遅延読み込み
import Image from 'next/image'

interface OptimizedImageProps {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
}

export function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  priority = false 
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      className="rounded-lg object-cover"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyydOnN5lZrfb0YvS8pLedxZZsieHW3MXEN3Y2dtZ+b4gR+lHXTHrLLYg1CqGM0Z2CW7FTDBSNt+mHSy/pQf//Z"
    />
  )
}
```

## テストパターン

### 1. コンポーネントテスト

#### **Jest + React Testing Library**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserForm } from './UserForm'

// テストユーティリティ
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

// コンポーネントテスト
describe('UserForm', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render form fields correctly', () => {
    renderWithProviders(
      <UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )

    expect(screen.getByLabelText(/ユーザー名/)).toBeInTheDocument()
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument()
    expect(screen.getByLabelText(/氏名/)).toBeInTheDocument()
    expect(screen.getByLabelText(/自己紹介/)).toBeInTheDocument()
  })

  it('should show validation errors for invalid input', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(
      <UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )

    const usernameInput = screen.getByLabelText(/ユーザー名/)
    const emailInput = screen.getByLabelText(/メールアドレス/)
    const submitButton = screen.getByRole('button', { name: /保存/ })

    // 無効な値を入力
    await user.type(usernameInput, 'ab') // 3文字未満
    await user.type(emailInput, 'invalid-email') // 無効なメール
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/ユーザー名は3文字以上である必要があります/)).toBeInTheDocument()
      expect(screen.getByText(/有効なメールアドレスを入力してください/)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should submit form with valid data', async () => {
    const user = userEvent.setup()
    
    renderWithProviders(
      <UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )

    const usernameInput = screen.getByLabelText(/ユーザー名/)
    const emailInput = screen.getByLabelText(/メールアドレス/)
    const submitButton = screen.getByRole('button', { name: /保存/ })

    // 有効な値を入力
    await user.type(usernameInput, 'testuser')
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        full_name: '',
        bio: '',
      })
    })
  })
})

// カスタムフックテスト
import { renderHook, waitFor } from '@testing-library/react'
import { useUsers } from './useUsers'

describe('useUsers', () => {
  it('should fetch users successfully', async () => {
    const { result } = renderHook(() => useUsers())

    // 初期状態
    expect(result.current.loading).toBe(true)
    expect(result.current.users).toEqual([])

    // データ取得完了を待機
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.users.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })
})
```

## まとめ

フロントエンドパターンの適切な実装により、保守性が高く、パフォーマンスに優れ、ユーザーフレンドリーなWebアプリケーションを構築できます。Next.js、React、TypeScript、Tailwind CSSの組み合わせは、現代的なフロントエンド開発の標準的なアプローチとして推奨されます。継続的なテストとパフォーマンス監視により、品質の高いユーザーエクスペリエンスを提供することが重要です。 