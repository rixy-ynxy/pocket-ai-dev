# ナレッジ管理パターン (Knowledge Management Patterns)

## 概要

エンタープライズ環境におけるナレッジベース管理システムの設計と実装のための実証済みパターンを定義します。React、TypeScript、Next.js を活用した高品質なコンテンツ管理・検索・表示機能の構築方法とベストプラクティスを提供します。

## 基本ナレッジ管理パターン

### 1. コンテンツ型定義パターン

#### **統一データ構造**
```typescript
// 基本エンティティ
interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
  created_by: string
  updated_by?: string
}

// ナレッジアイテム型定義
interface KnowledgeItem extends BaseEntity {
  title: string
  content: string
  excerpt?: string
  type: KnowledgeItemType
  status: KnowledgeStatus
  category_id?: string
  tags: string[]
  metadata: KnowledgeMetadata
  path?: string // 階層パス
  parent_id?: string
  order_index?: number
  view_count: number
  search_vector?: string // 全文検索用
}

// 型定義
type KnowledgeItemType = 
  | 'document' 
  | 'folder' 
  | 'template' 
  | 'faq' 
  | 'reference'
  | 'guide'
  | 'policy'

type KnowledgeStatus = 
  | 'draft' 
  | 'review' 
  | 'published' 
  | 'archived'
  | 'deprecated'

// メタデータ構造
interface KnowledgeMetadata {
  author?: string
  reviewers?: string[]
  version?: string
  language?: string
  priority?: 'low' | 'medium' | 'high'
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  estimated_reading_time?: number // 分
  related_items?: string[]
  external_links?: ExternalLink[]
  attachments?: Attachment[]
  custom_fields?: Record<string, any>
}

interface ExternalLink {
  url: string
  title: string
  description?: string
}

interface Attachment {
  id: string
  filename: string
  size: number
  mime_type: string
  download_url: string
}

// カテゴリ構造
interface KnowledgeCategory extends BaseEntity {
  name: string
  description?: string
  color?: string
  icon?: string
  parent_id?: string
  path: string
  item_count: number
  order_index: number
}
```

### 2. Markdownレンダリングパターン

#### **高度Markdownプロセッサ**
```typescript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownRendererProps {
  content: string
  baseUrl?: string
  onLinkClick?: (url: string) => void
  allowHtml?: boolean
  className?: string
}

export function MarkdownRenderer({
  content,
  baseUrl = '',
  onLinkClick,
  allowHtml = false,
  className = ''
}: MarkdownRendererProps) {
  // カスタムコンポーネント定義
  const components = {
    // コードブロック
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      
      if (!inline && language) {
        return (
          <div className="relative">
            <div className="absolute top-2 right-2 text-xs text-gray-400">
              {language}
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </div>
        )
      }
      
      return (
        <code 
          className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      )
    },

    // 見出し
    h1: ({ children, ...props }: any) => (
      <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 className="text-xl font-medium mt-4 mb-2 text-gray-900" {...props}>
        {children}
      </h3>
    ),

    // リンク
    a: ({ href, children, ...props }: any) => {
      const isExternal = href?.startsWith('http')
      const isInternal = href?.startsWith('/')
      
      const handleClick = (e: React.MouseEvent) => {
        if (onLinkClick && !isExternal) {
          e.preventDefault()
          onLinkClick(href)
        }
      }

      return (
        <a
          href={isInternal ? `${baseUrl}${href}` : href}
          onClick={handleClick}
          className="text-blue-600 hover:text-blue-800 underline"
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          {...props}
        >
          {children}
          {isExternal && (
            <span className="ml-1 text-xs">↗</span>
          )}
        </a>
      )
    },

    // 画像
    img: ({ src, alt, ...props }: any) => (
      <div className="my-4">
        <img
          src={src?.startsWith('/') ? `${baseUrl}${src}` : src}
          alt={alt}
          className="max-w-full h-auto rounded-lg shadow-sm"
          loading="lazy"
          {...props}
        />
        {alt && (
          <p className="text-sm text-gray-600 text-center mt-2 italic">
            {alt}
          </p>
        )}
      </div>
    ),

    // テーブル
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border border-gray-200 rounded-lg" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }: any) => (
      <th className="bg-gray-50 px-4 py-2 text-left font-medium text-gray-900 border-b" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="px-4 py-2 border-b border-gray-100" {...props}>
        {children}
      </td>
    ),

    // 引用
    blockquote: ({ children, ...props }: any) => (
      <blockquote 
        className="border-l-4 border-blue-200 pl-4 py-2 bg-blue-50 my-4 italic"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // リスト
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-inside my-4 space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-inside my-4 space-y-1" {...props}>
        {children}
      </ol>
    ),

    // カスタムディレクティブ
    div: ({ className, children, ...props }: any) => {
      // 警告ボックス
      if (className?.includes('warning')) {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
            <div className="flex items-start">
              <span className="text-yellow-600 mr-2">⚠️</span>
              <div className="text-yellow-800">{children}</div>
            </div>
          </div>
        )
      }
      
      // 情報ボックス
      if (className?.includes('info')) {
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
            <div className="flex items-start">
              <span className="text-blue-600 mr-2">ℹ️</span>
              <div className="text-blue-800">{children}</div>
            </div>
          </div>
        )
      }

      return <div className={className} {...props}>{children}</div>
    }
  }

  return (
    <div className={`prose prose-lg max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          rehypeHighlight,
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }]
        ]}
        components={components}
        disallowedElements={allowHtml ? [] : ['script', 'iframe', 'object']}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// 目次生成
export function generateTableOfContents(content: string): TocItem[] {
  const headings = content.match(/^#{1,6}\s+.+$/gm) || []
  
  return headings.map((heading, index) => {
    const level = heading.match(/^#+/)?.[0].length || 1
    const text = heading.replace(/^#+\s+/, '')
    const id = text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-')
    
    return {
      id,
      text,
      level,
      index
    }
  })
}

interface TocItem {
  id: string
  text: string
  level: number
  index: number
}

export function TableOfContents({ items }: { items: TocItem[] }) {
  return (
    <nav className="space-y-1">
      <h3 className="font-medium text-gray-900 mb-3">目次</h3>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`
            block text-sm hover:text-blue-600
            ${item.level === 1 ? 'font-medium text-gray-900' : ''}
            ${item.level === 2 ? 'pl-4 text-gray-700' : ''}
            ${item.level >= 3 ? `pl-${(item.level - 1) * 4} text-gray-600` : ''}
          `}
        >
          {item.text}
        </a>
      ))}
    </nav>
  )
}
```

### 3. 検索・フィルタリングパターン

#### **統合検索システム**
```typescript
import Fuse from 'fuse.js'
import { useMemo, useState, useEffect, useCallback } from 'react'

// 検索設定
interface SearchConfig {
  threshold?: number // 0.6 = 60% 一致
  keys: Array<{
    name: string
    weight: number
  }>
  includeScore?: boolean
  includeMatches?: boolean
}

// 検索フィルター
interface SearchFilters {
  query?: string
  categories?: string[]
  tags?: string[]
  types?: KnowledgeItemType[]
  status?: KnowledgeStatus[]
  dateRange?: {
    start: string
    end: string
  }
  author?: string
  sortBy?: 'relevance' | 'title' | 'created_at' | 'updated_at' | 'view_count'
  sortOrder?: 'asc' | 'desc'
}

// 検索結果
interface SearchResult<T> {
  item: T
  score?: number
  matches?: Array<{
    key: string
    value: string
    indices: Array<[number, number]>
  }>
}

// 高度検索フック
export function useKnowledgeSearch(items: KnowledgeItem[]) {
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance',
    sortOrder: 'desc'
  })
  const [results, setResults] = useState<SearchResult<KnowledgeItem>[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Fuse.js 設定
  const searchConfig: SearchConfig = {
    threshold: 0.6,
    includeScore: true,
    includeMatches: true,
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'content', weight: 0.3 },
      { name: 'excerpt', weight: 0.2 },
      { name: 'tags', weight: 0.1 }
    ]
  }

  // 検索インデックス
  const searchIndex = useMemo(() => {
    return new Fuse(items, searchConfig)
  }, [items])

  // 検索実行
  const performSearch = useCallback(async () => {
    setIsSearching(true)
    
    try {
      let filteredResults: SearchResult<KnowledgeItem>[]

      // テキスト検索
      if (filters.query && filters.query.trim()) {
        const fuseResults = searchIndex.search(filters.query)
        filteredResults = fuseResults.map(result => ({
          item: result.item,
          score: result.score,
          matches: result.matches
        }))
      } else {
        filteredResults = items.map(item => ({ item }))
      }

      // フィルター適用
      if (filters.categories?.length) {
        filteredResults = filteredResults.filter(result => 
          filters.categories!.includes(result.item.category_id || '')
        )
      }

      if (filters.tags?.length) {
        filteredResults = filteredResults.filter(result =>
          filters.tags!.some(tag => result.item.tags.includes(tag))
        )
      }

      if (filters.types?.length) {
        filteredResults = filteredResults.filter(result =>
          filters.types!.includes(result.item.type)
        )
      }

      if (filters.status?.length) {
        filteredResults = filteredResults.filter(result =>
          filters.status!.includes(result.item.status)
        )
      }

      if (filters.dateRange) {
        const start = new Date(filters.dateRange.start)
        const end = new Date(filters.dateRange.end)
        filteredResults = filteredResults.filter(result => {
          const date = new Date(result.item.created_at)
          return date >= start && date <= end
        })
      }

      if (filters.author) {
        filteredResults = filteredResults.filter(result =>
          result.item.created_by.includes(filters.author!)
        )
      }

      // ソート
      filteredResults.sort((a, b) => {
        const order = filters.sortOrder === 'asc' ? 1 : -1
        
        switch (filters.sortBy) {
          case 'relevance':
            return ((a.score || 0) - (b.score || 0)) * order
          case 'title':
            return a.item.title.localeCompare(b.item.title) * order
          case 'created_at':
            return (new Date(a.item.created_at).getTime() - new Date(b.item.created_at).getTime()) * order
          case 'updated_at':
            return (new Date(a.item.updated_at).getTime() - new Date(b.item.updated_at).getTime()) * order
          case 'view_count':
            return (a.item.view_count - b.item.view_count) * order
          default:
            return 0
        }
      })

      setResults(filteredResults)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [filters, items, searchIndex])

  // フィルター変更時に検索実行
  useEffect(() => {
    const debounceTimer = setTimeout(performSearch, 300)
    return () => clearTimeout(debounceTimer)
  }, [performSearch])

  // フィルター更新関数
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // 検索リセット
  const resetSearch = useCallback(() => {
    setFilters({
      sortBy: 'relevance',
      sortOrder: 'desc'
    })
  }, [])

  return {
    filters,
    results,
    isSearching,
    updateFilters,
    resetSearch,
    performSearch
  }
}

// 検索UI コンポーネント
interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSubmit?: (query: string) => void
}

export function SearchBar({ value, onChange, placeholder = '検索...', onSubmit }: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(value)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </form>
  )
}

// 検索ハイライト
export function HighlightedText({ text, highlights }: { text: string; highlights?: Array<[number, number]> }) {
  if (!highlights?.length) {
    return <span>{text}</span>
  }

  const parts: Array<{ text: string; highlighted: boolean }> = []
  let lastIndex = 0

  highlights.forEach(([start, end]) => {
    // ハイライト前のテキスト
    if (start > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, start),
        highlighted: false
      })
    }

    // ハイライト部分
    parts.push({
      text: text.slice(start, end + 1),
      highlighted: true
    })

    lastIndex = end + 1
  })

  // 残りのテキスト
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      highlighted: false
    })
  }

  return (
    <span>
      {parts.map((part, index) => (
        <span
          key={index}
          className={part.highlighted ? 'bg-yellow-200 font-medium' : ''}
        >
          {part.text}
        </span>
      ))}
    </span>
  )
}
```

### 4. 階層管理パターン

#### **ツリー構造管理**
```typescript
import { useMemo, useState, useCallback } from 'react'

// ツリーノード型
interface TreeNode<T = any> {
  id: string
  data: T
  children: TreeNode<T>[]
  parent?: TreeNode<T>
  level: number
  path: string[]
  expanded?: boolean
}

// ツリーフック
export function useTreeData<T extends { id: string; parent_id?: string }>(
  items: T[]
) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // フラットデータからツリー構造を構築
  const treeData = useMemo(() => {
    const nodeMap = new Map<string, TreeNode<T>>()
    const rootNodes: TreeNode<T>[] = []

    // 初期ノード作成
    items.forEach(item => {
      nodeMap.set(item.id, {
        id: item.id,
        data: item,
        children: [],
        level: 0,
        path: [],
        expanded: expandedNodes.has(item.id)
      })
    })

    // 親子関係構築
    items.forEach(item => {
      const node = nodeMap.get(item.id)!
      
      if (item.parent_id) {
        const parent = nodeMap.get(item.parent_id)
        if (parent) {
          parent.children.push(node)
          node.parent = parent
          node.level = parent.level + 1
          node.path = [...parent.path, parent.id]
        }
      } else {
        rootNodes.push(node)
      }
    })

    // ソート（order_index または title でソート）
    const sortNodes = (nodes: TreeNode<T>[]) => {
      nodes.sort((a, b) => {
        const aOrder = (a.data as any).order_index ?? 999
        const bOrder = (b.data as any).order_index ?? 999
        if (aOrder !== bOrder) return aOrder - bOrder
        
        const aTitle = (a.data as any).title || ''
        const bTitle = (b.data as any).title || ''
        return aTitle.localeCompare(bTitle)
      })
      
      nodes.forEach(node => sortNodes(node.children))
    }

    sortNodes(rootNodes)
    return rootNodes
  }, [items, expandedNodes])

  // ノード展開/折りたたみ
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  // 全展開/全折りたたみ
  const expandAll = useCallback(() => {
    setExpandedNodes(new Set(items.map(item => item.id)))
  }, [items])

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set())
  }, [])

  // パス取得
  const getNodePath = useCallback((nodeId: string): TreeNode<T>[] => {
    const findPath = (nodes: TreeNode<T>[], targetId: string, path: TreeNode<T>[] = []): TreeNode<T>[] | null => {
      for (const node of nodes) {
        const currentPath = [...path, node]
        if (node.id === targetId) {
          return currentPath
        }
        
        const result = findPath(node.children, targetId, currentPath)
        if (result) return result
      }
      return null
    }

    return findPath(treeData, nodeId) || []
  }, [treeData])

  return {
    treeData,
    expandedNodes,
    toggleNode,
    expandAll,
    collapseAll,
    getNodePath
  }
}

// ツリービューコンポーネント
interface TreeViewProps<T> {
  nodes: TreeNode<T>[]
  onNodeClick?: (node: TreeNode<T>) => void
  onNodeSelect?: (node: TreeNode<T>) => void
  selectedNodeId?: string
  renderNode: (node: TreeNode<T>) => React.ReactNode
  renderIcon?: (node: TreeNode<T>) => React.ReactNode
  className?: string
}

export function TreeView<T>({
  nodes,
  onNodeClick,
  onNodeSelect,
  selectedNodeId,
  renderNode,
  renderIcon,
  className = ''
}: TreeViewProps<T>) {
  const renderTreeNode = (node: TreeNode<T>) => {
    const hasChildren = node.children.length > 0
    const isSelected = selectedNodeId === node.id
    const isExpanded = node.expanded

    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer
            ${isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : ''}
          `}
          style={{ paddingLeft: `${node.level * 20 + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              onNodeClick?.(node)
            }
            onNodeSelect?.(node)
          }}
        >
          {/* 展開/折りたたみアイコン */}
          <div className="w-4 h-4 mr-2 flex items-center justify-center">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onNodeClick?.(node)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* カスタムアイコン */}
          {renderIcon?.(node)}

          {/* ノード内容 */}
          <div className="flex-1 min-w-0">
            {renderNode(node)}
          </div>
        </div>

        {/* 子ノード */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`tree-view ${className}`}>
      {nodes.map(node => renderTreeNode(node))}
    </div>
  )
}

// パンくずリスト
interface BreadcrumbProps<T> {
  path: TreeNode<T>[]
  onNodeClick?: (node: TreeNode<T>) => void
  renderNode: (node: TreeNode<T>) => React.ReactNode
}

export function Breadcrumb<T>({ path, onNodeClick, renderNode }: BreadcrumbProps<T>) {
  if (path.length === 0) return null

  return (
    <nav className="flex items-center space-x-2 text-sm">
      {path.map((node, index) => (
        <div key={node.id} className="flex items-center">
          {index > 0 && (
            <svg className="w-4 h-4 mx-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
          
          <button
            onClick={() => onNodeClick?.(node)}
            className={`
              hover:text-blue-600 transition-colors
              ${index === path.length - 1 
                ? 'text-gray-900 font-medium cursor-default' 
                : 'text-blue-600'
              }
            `}
            disabled={index === path.length - 1}
          >
            {renderNode(node)}
          </button>
        </div>
      ))}
    </nav>
  )
}
```

## 高度ナレッジ管理パターン

### 1. バージョン管理パターン

#### **コンテンツバージョニング**
```typescript
interface KnowledgeVersion {
  id: string
  item_id: string
  version: string
  title: string
  content: string
  changelog?: string
  created_by: string
  created_at: string
  is_current: boolean
  parent_version?: string
}

interface VersionDiff {
  type: 'added' | 'removed' | 'modified'
  path: string
  oldValue?: any
  newValue?: any
  line?: number
}

export function useVersioning(itemId: string) {
  const [versions, setVersions] = useState<KnowledgeVersion[]>([])
  const [currentVersion, setCurrentVersion] = useState<KnowledgeVersion | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchVersions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/knowledge/${itemId}/versions`)
      const data = await response.json()
      setVersions(data)
      setCurrentVersion(data.find((v: KnowledgeVersion) => v.is_current) || null)
    } catch (error) {
      console.error('Failed to fetch versions:', error)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  const createVersion = useCallback(async (versionData: Partial<KnowledgeVersion>) => {
    try {
      const response = await fetch(`/api/v1/knowledge/${itemId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versionData)
      })
      const newVersion = await response.json()
      setVersions(prev => [newVersion, ...prev])
      setCurrentVersion(newVersion)
      return newVersion
    } catch (error) {
      console.error('Failed to create version:', error)
      throw error
    }
  }, [itemId])

  const compareVersions = useCallback(async (fromVersion: string, toVersion: string): Promise<VersionDiff[]> => {
    try {
      const response = await fetch(`/api/v1/knowledge/${itemId}/versions/compare?from=${fromVersion}&to=${toVersion}`)
      return response.json()
    } catch (error) {
      console.error('Failed to compare versions:', error)
      return []
    }
  }, [itemId])

  const restoreVersion = useCallback(async (versionId: string) => {
    try {
      const response = await fetch(`/api/v1/knowledge/${itemId}/versions/${versionId}/restore`, {
        method: 'POST'
      })
      const restoredVersion = await response.json()
      await fetchVersions() // リフレッシュ
      return restoredVersion
    } catch (error) {
      console.error('Failed to restore version:', error)
      throw error
    }
  }, [itemId, fetchVersions])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  return {
    versions,
    currentVersion,
    loading,
    createVersion,
    compareVersions,
    restoreVersion,
    refetch: fetchVersions
  }
}

// バージョン比較表示
export function VersionComparison({ diff }: { diff: VersionDiff[] }) {
  return (
    <div className="space-y-2">
      {diff.map((change, index) => (
        <div
          key={index}
          className={`
            p-3 rounded border-l-4
            ${change.type === 'added' ? 'bg-green-50 border-green-400' : ''}
            ${change.type === 'removed' ? 'bg-red-50 border-red-400' : ''}
            ${change.type === 'modified' ? 'bg-yellow-50 border-yellow-400' : ''}
          `}
        >
          <div className="font-medium text-sm">
            {change.type === 'added' && '+ 追加'}
            {change.type === 'removed' && '- 削除'}
            {change.type === 'modified' && '~ 変更'}
            <span className="ml-2 text-gray-600">{change.path}</span>
          </div>
          
          {change.type === 'modified' && (
            <div className="mt-2 space-y-1">
              <div className="text-sm">
                <span className="text-red-600">- </span>
                <span className="bg-red-100 px-1">{change.oldValue}</span>
              </div>
              <div className="text-sm">
                <span className="text-green-600">+ </span>
                <span className="bg-green-100 px-1">{change.newValue}</span>
              </div>
            </div>
          )}
          
          {change.type === 'added' && (
            <div className="mt-2 text-sm">
              <span className="text-green-600">+ </span>
              <span className="bg-green-100 px-1">{change.newValue}</span>
            </div>
          )}
          
          {change.type === 'removed' && (
            <div className="mt-2 text-sm">
              <span className="text-red-600">- </span>
              <span className="bg-red-100 px-1">{change.oldValue}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

### 2. コラボレーションパターン

#### **リアルタイム共同編集**
```typescript
import { useWebSocket } from './useWebSocket'

interface EditSession {
  id: string
  item_id: string
  user_id: string
  username: string
  cursor_position?: number
  last_activity: string
  status: 'active' | 'idle' | 'disconnected'
}

interface EditOperation {
  type: 'insert' | 'delete' | 'retain'
  position: number
  content?: string
  length?: number
  user_id: string
  timestamp: number
}

export function useCollaborativeEditing(itemId: string, userId: string) {
  const [content, setContent] = useState('')
  const [sessions, setSessions] = useState<EditSession[]>([])
  const [operations, setOperations] = useState<EditOperation[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const { sendMessage, connectionState } = useWebSocket({
    url: `ws://localhost:8000/ws/knowledge/${itemId}/edit`,
    onConnect: () => {
      setIsConnected(true)
      sendMessage({
        type: 'join_session',
        data: { user_id: userId, item_id: itemId }
      })
    },
    onDisconnect: () => {
      setIsConnected(false)
    },
    onMessage: (message) => {
      switch (message.type) {
        case 'session_update':
          setSessions(message.data.sessions)
          break
        case 'content_update':
          applyOperation(message.data.operation)
          break
        case 'cursor_update':
          updateCursorPosition(message.data)
          break
      }
    }
  })

  // 操作適用
  const applyOperation = useCallback((operation: EditOperation) => {
    setContent(prevContent => {
      let newContent = prevContent
      
      switch (operation.type) {
        case 'insert':
          newContent = 
            prevContent.slice(0, operation.position) +
            operation.content +
            prevContent.slice(operation.position)
          break
        case 'delete':
          newContent = 
            prevContent.slice(0, operation.position) +
            prevContent.slice(operation.position + (operation.length || 0))
          break
      }
      
      return newContent
    })

    setOperations(prev => [...prev, operation])
  }, [])

  // コンテンツ変更
  const handleContentChange = useCallback((newContent: string, position: number) => {
    const operation: EditOperation = {
      type: 'insert', // 実際は diff で決定
      position,
      content: newContent,
      user_id: userId,
      timestamp: Date.now()
    }

    sendMessage({
      type: 'content_change',
      data: { operation }
    })

    setContent(newContent)
  }, [sendMessage, userId])

  // カーソル位置更新
  const updateCursorPosition = useCallback((data: { user_id: string; position: number }) => {
    setSessions(prev => prev.map(session => 
      session.user_id === data.user_id
        ? { ...session, cursor_position: data.position }
        : session
    ))
  }, [])

  // カーソル位置送信
  const sendCursorPosition = useCallback((position: number) => {
    sendMessage({
      type: 'cursor_position',
      data: { user_id: userId, position }
    })
  }, [sendMessage, userId])

  return {
    content,
    sessions,
    operations,
    isConnected,
    handleContentChange,
    sendCursorPosition
  }
}

// 共同編集者表示
export function CollaborativeIndicators({ sessions }: { sessions: EditSession[] }) {
  const activeSessions = sessions.filter(s => s.status === 'active')

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600">編集中:</span>
      <div className="flex -space-x-2">
        {activeSessions.map(session => (
          <div
            key={session.id}
            className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
            title={session.username}
          >
            {session.username.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## まとめ

ナレッジ管理パターンの適切な実装により、スケーラブルで使いやすいコンテンツ管理システムを構築できます。Markdown レンダリング、高度検索、階層管理、バージョン管理、リアルタイム共同編集など、現代的なナレッジベースに必要な機能を効率的に実装することが可能です。TypeScript による型安全性の確保と、React hooks による状態管理パターンにより、保守性と拡張性を兼ね備えたシステムの開発が実現できます。 