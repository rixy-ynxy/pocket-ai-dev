# SEO・アクセシビリティパターン (SEO & Accessibility Patterns)

## 概要

現代的なWebアプリケーションにおけるSEO最適化とアクセシビリティ確保のための実証済みパターンを定義します。WCAG 2.1準拠、動的メタタグ管理、構造化データ、キーボード操作、スクリーンリーダー対応など、包括的なアクセシブルWebアプリケーションの構築方法とベストプラクティスを提供します。

## SEO最適化パターン

### 1. 動的メタタグ管理パターン

#### **Next.js Head管理**
```typescript
import Head from 'next/head'
import { useRouter } from 'next/router'

interface SEOMetadata {
  title: string
  description: string
  keywords?: string[]
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: 'website' | 'article' | 'book' | 'profile'
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
  canonicalUrl?: string
  noindex?: boolean
  nofollow?: boolean
  author?: string
  publishedTime?: string
  modifiedTime?: string
  section?: string
  tags?: string[]
}

export function SEOHead({ 
  title, 
  description, 
  keywords = [],
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  canonicalUrl,
  noindex = false,
  nofollow = false,
  author,
  publishedTime,
  modifiedTime,
  section,
  tags = []
}: SEOMetadata) {
  const router = useRouter()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'
  const currentUrl = canonicalUrl || `${baseUrl}${router.asPath}`
  
  // デフォルト値設定
  const seoTitle = ogTitle || title
  const seoDescription = ogDescription || description
  const seoImage = ogImage || `${baseUrl}/og-default.png`
  
  return (
    <Head>
      {/* 基本メタタグ */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      {author && <meta name="author" content={author} />}
      
      {/* ロボット制御 */}
      <meta 
        name="robots" 
        content={`${noindex ? 'noindex' : 'index'},${nofollow ? 'nofollow' : 'follow'}`} 
      />
      
      {/* 正規URL */}
      <link rel="canonical" href={currentUrl} />
      
      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content="Your Site Name" />
      <meta property="og:locale" content="ja_JP" />
      
      {/* 記事メタデータ（記事ページの場合） */}
      {ogType === 'article' && (
        <>
          {author && <meta property="article:author" content={author} />}
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {section && <meta property="article:section" content={section} />}
          {tags.map(tag => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />
      
      {/* 構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData({
            title: seoTitle,
            description: seoDescription,
            url: currentUrl,
            image: seoImage,
            author,
            publishedTime,
            modifiedTime,
            ogType
          }))
        }}
      />
    </Head>
  )
}

// 構造化データ生成
function generateStructuredData({
  title,
  description,
  url,
  image,
  author,
  publishedTime,
  modifiedTime,
  ogType
}: {
  title: string
  description: string
  url: string
  image: string
  author?: string
  publishedTime?: string
  modifiedTime?: string
  ogType: string
}) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': ogType === 'article' ? 'Article' : 'WebPage',
    headline: title,
    description: description,
    url: url,
    image: {
      '@type': 'ImageObject',
      url: image
    }
  }

  if (ogType === 'article' && author) {
    return {
      ...baseData,
      author: {
        '@type': 'Person',
        name: author
      },
      datePublished: publishedTime,
      dateModified: modifiedTime || publishedTime,
      publisher: {
        '@type': 'Organization',
        name: 'Your Organization Name',
        logo: {
          '@type': 'ImageObject',
          url: `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`
        }
      }
    }
  }

  return baseData
}

// SEOフック
export function useSEO() {
  const router = useRouter()
  
  const generateBreadcrumbStructuredData = (breadcrumbs: Array<{name: string, url: string}>) => {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    }
  }

  const generateFAQStructuredData = (faqs: Array<{question: string, answer: string}>) => {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    }
  }

  return {
    generateBreadcrumbStructuredData,
    generateFAQStructuredData,
    currentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}${router.asPath}`
  }
}
```

### 2. サイトマップ生成パターン

#### **動的サイトマップ**
```typescript
// pages/sitemap.xml.tsx
import { GetServerSideProps } from 'next'

interface SitemapEntry {
  url: string
  lastModified?: string
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export default function Sitemap() {
  // This component will never be rendered
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'
  
  // 静的ページ
  const staticPages: SitemapEntry[] = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.8
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.6
    }
  ]

  // 動的ページ（ナレッジベース）
  const knowledgeItems = await fetchKnowledgeItems()
  const knowledgePages: SitemapEntry[] = knowledgeItems.map(item => ({
    url: `${baseUrl}/knowledge/${item.id}`,
    lastModified: item.updated_at,
    changeFrequency: 'weekly',
    priority: 0.7
  }))

  // カテゴリページ
  const categories = await fetchCategories()
  const categoryPages: SitemapEntry[] = categories.map(category => ({
    url: `${baseUrl}/knowledge/category/${category.slug}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: 0.6
  }))

  const allPages = [...staticPages, ...knowledgePages, ...categoryPages]

  const sitemap = generateSitemapXML(allPages)

  res.setHeader('Content-Type', 'text/xml')
  res.write(sitemap)
  res.end()

  return {
    props: {}
  }
}

function generateSitemapXML(pages: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(page => `
  <url>
    <loc>${page.url}</loc>
    ${page.lastModified ? `<lastmod>${page.lastModified}</lastmod>` : ''}
    ${page.changeFrequency ? `<changefreq>${page.changeFrequency}</changefreq>` : ''}
    ${page.priority ? `<priority>${page.priority}</priority>` : ''}
  </url>`).join('')}
</urlset>`
}

async function fetchKnowledgeItems() {
  // API からナレッジアイテムを取得
  try {
    const response = await fetch(`${process.env.API_BASE_URL}/api/v1/knowledge/items?status=published`)
    return response.json()
  } catch (error) {
    console.error('Failed to fetch knowledge items for sitemap:', error)
    return []
  }
}

async function fetchCategories() {
  // API からカテゴリを取得
  try {
    const response = await fetch(`${process.env.API_BASE_URL}/api/v1/knowledge/categories`)
    return response.json()
  } catch (error) {
    console.error('Failed to fetch categories for sitemap:', error)
    return []
  }
}
```

### 3. Performance最適化パターン

#### **Core Web Vitals最適化**
```typescript
// lib/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

interface Metric {
  name: string
  value: number
  delta: number
  entries: any[]
  id: string
}

export function measureWebVitals() {
  getCLS(onPerfEntry)
  getFID(onPerfEntry)
  getFCP(onPerfEntry)
  getLCP(onPerfEntry)
  getTTFB(onPerfEntry)
}

function onPerfEntry(metric: Metric) {
  // Analytics に送信
  if (process.env.NODE_ENV === 'production') {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true
      })
    }

    // カスタムアナリティクス
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        id: metric.id,
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    }).catch(console.error)
  }

  // 開発環境でのログ
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric)
  }
}

// パフォーマンス監視コンポーネント
export function PerformanceMonitor({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    measureWebVitals()
  }, [])

  return <>{children}</>
}

// 画像最適化パターン
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  ...props
}: {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
  [key: string]: any
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R7W5xky06 ..."
      quality={90}
      {...props}
    />
  )
}
```

## アクセシビリティパターン

### 1. WCAG 2.1準拠パターン

#### **アクセシブルフォーム**
```typescript
import { useState, useId } from 'react'

interface FormFieldProps {
  label: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search'
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  autoComplete?: string
  'aria-describedby'?: string
}

export function AccessibleFormField({
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  required = false,
  disabled = false,
  placeholder,
  autoComplete,
  'aria-describedby': ariaDescribedBy,
}: FormFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  
  // aria-describedby の構築
  const describedBy = [
    hint && hintId,
    error && errorId,
    ariaDescribedBy
  ].filter(Boolean).join(' ')

  return (
    <div className="form-field">
      <label 
        htmlFor={id}
        className={`form-label ${required ? 'required' : ''}`}
      >
        {label}
        {required && (
          <span className="required-indicator" aria-label="必須">
            *
          </span>
        )}
      </label>
      
      {hint && (
        <div id={hintId} className="form-hint">
          {hint}
        </div>
      )}
      
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`form-input ${error ? 'error' : ''}`}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy || undefined}
      />
      
      {error && (
        <div 
          id={errorId} 
          className="form-error" 
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  )
}

// アクセシブルセレクト
interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface AccessibleSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
}

export function AccessibleSelect({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  required = false,
  disabled = false,
  placeholder = '選択してください'
}: AccessibleSelectProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  
  const describedBy = [
    hint && hintId,
    error && errorId
  ].filter(Boolean).join(' ')

  return (
    <div className="form-field">
      <label htmlFor={id} className={`form-label ${required ? 'required' : ''}`}>
        {label}
        {required && <span className="required-indicator" aria-label="必須">*</span>}
      </label>
      
      {hint && (
        <div id={hintId} className="form-hint">
          {hint}
        </div>
      )}
      
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`form-select ${error ? 'error' : ''}`}
        required={required}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy || undefined}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map(option => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <div 
          id={errorId} 
          className="form-error" 
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  )
}
```

### 2. キーボードナビゲーションパターン

#### **キーボード対応コンポーネント**
```typescript
import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface DropdownMenuProps {
  trigger: React.ReactNode
  items: Array<{
    id: string
    label: string
    onClick: () => void
    disabled?: boolean
    separator?: boolean
  }>
  className?: string
}

export function AccessibleDropdownMenu({ trigger, items, className = '' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // 有効なアイテムのインデックス
  const enabledItems = items.filter(item => !item.disabled && !item.separator)
  const enabledIndices = items
    .map((item, index) => (!item.disabled && !item.separator ? index : -1))
    .filter(index => index !== -1)

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault()
        setIsOpen(true)
        setFocusedIndex(0)
        break
      case 'ArrowUp':
        e.preventDefault()
        setIsOpen(true)
        setFocusedIndex(enabledIndices.length - 1)
        break
    }
  }

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setFocusedIndex(-1)
        triggerRef.current?.focus()
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => {
          const currentEnabledIndex = enabledIndices.indexOf(prev)
          const nextIndex = currentEnabledIndex < enabledIndices.length - 1 
            ? currentEnabledIndex + 1 
            : 0
          return enabledIndices[nextIndex]
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => {
          const currentEnabledIndex = enabledIndices.indexOf(prev)
          const prevIndex = currentEnabledIndex > 0 
            ? currentEnabledIndex - 1 
            : enabledIndices.length - 1
          return enabledIndices[prevIndex]
        })
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(enabledIndices[0])
        break
      case 'End':
        e.preventDefault()
        setFocusedIndex(enabledIndices[enabledIndices.length - 1])
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0) {
          const item = items[focusedIndex]
          if (!item.disabled && !item.separator) {
            item.onClick()
            setIsOpen(false)
            setFocusedIndex(-1)
            triggerRef.current?.focus()
          }
        }
        break
    }
  }

  // フォーカス管理
  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.focus()
    }
  }, [isOpen, focusedIndex])

  // 外部クリック処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`dropdown-menu ${className}`} ref={menuRef}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="dropdown-trigger"
      >
        {trigger}
      </button>
      
      {isOpen && (
        <div
          role="menu"
          className="dropdown-menu-content"
          onKeyDown={handleMenuKeyDown}
          tabIndex={-1}
        >
          {items.map((item, index) => {
            if (item.separator) {
              return (
                <div 
                  key={`separator-${index}`}
                  className="dropdown-separator"
                  role="separator"
                />
              )
            }

            return (
              <button
                key={item.id}
                ref={el => itemRefs.current[index] = el}
                role="menuitem"
                className={`dropdown-item ${item.disabled ? 'disabled' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick()
                    setIsOpen(false)
                    setFocusedIndex(-1)
                    triggerRef.current?.focus()
                  }
                }}
                tabIndex={-1}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// タブリスト（タブインターフェース）
interface TabItem {
  id: string
  label: string
  content: React.ReactNode
  disabled?: boolean
}

interface AccessibleTabsProps {
  tabs: TabItem[]
  defaultActiveTab?: string
  onTabChange?: (tabId: string) => void
  className?: string
}

export function AccessibleTabs({ 
  tabs, 
  defaultActiveTab,
  onTabChange,
  className = '' 
}: AccessibleTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultActiveTab || tabs[0]?.id)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        const prevIndex = index > 0 ? index - 1 : tabs.length - 1
        tabRefs.current[prevIndex]?.focus()
        break
      case 'ArrowRight':
        e.preventDefault()
        const nextIndex = index < tabs.length - 1 ? index + 1 : 0
        tabRefs.current[nextIndex]?.focus()
        break
      case 'Home':
        e.preventDefault()
        tabRefs.current[0]?.focus()
        break
      case 'End':
        e.preventDefault()
        tabRefs.current[tabs.length - 1]?.focus()
        break
    }
  }

  const selectTab = (tabId: string) => {
    setActiveTab(tabId)
    onTabChange?.(tabId)
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={`tabs ${className}`}>
      <div role="tablist" className="tab-list">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={el => tabRefs.current[index] = el}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            disabled={tab.disabled}
            className={`tab ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
            onClick={() => !tab.disabled && selectTab(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, index)}
            tabIndex={activeTab === tab.id ? 0 : -1}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="tab-panel"
        tabIndex={0}
      >
        {activeTabContent}
      </div>
    </div>
  )
}
```

### 3. スクリーンリーダー対応パターン

#### **ARIAライブリージョン**
```typescript
import { useState, useEffect, useRef } from 'react'

// アナウンサー（スクリーンリーダー用）
interface AnnouncerProps {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive'
  atomic?: boolean
}

export function Announcer({ 
  children, 
  politeness = 'polite', 
  atomic = true 
}: AnnouncerProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  )
}

// 動的アナウンス
export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState('')
  const timeoutRef = useRef<NodeJS.Timeout>()

  const announce = (message: string, delay = 100) => {
    // 既存のタイムアウトをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 少し遅延させてスクリーンリーダーが確実に読み上げるようにする
    timeoutRef.current = setTimeout(() => {
      setAnnouncement(message)
      
      // メッセージをクリア（再度同じメッセージでもアナウンスされるように）
      setTimeout(() => setAnnouncement(''), 1000)
    }, delay)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    announce,
    announcement
  }
}

// ローディング状態のアクセシブル表示
interface AccessibleLoadingProps {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
  'aria-describedby'?: string
}

export function AccessibleLoading({
  loading,
  children,
  loadingText = '読み込み中...',
  'aria-describedby': ariaDescribedBy
}: AccessibleLoadingProps) {
  const loadingId = useId()
  
  return (
    <div>
      {loading && (
        <div
          id={loadingId}
          role="status"
          aria-live="polite"
          className="loading-indicator"
        >
          <span className="sr-only">{loadingText}</span>
          <div className="spinner" aria-hidden="true" />
        </div>
      )}
      
      <div
        aria-busy={loading}
        aria-describedby={loading ? loadingId : ariaDescribedBy}
      >
        {children}
      </div>
    </div>
  )
}

// アクセシブルモーダル
interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
  initialFocus?: React.RefObject<HTMLElement>
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  closeOnEscape = true,
  closeOnBackdrop = true,
  initialFocus
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // フォーカス管理
  useEffect(() => {
    if (isOpen) {
      // 現在のフォーカス要素を保存
      previousActiveElement.current = document.activeElement as HTMLElement
      
      // モーダル内にフォーカスを移動
      if (initialFocus?.current) {
        initialFocus.current.focus()
      } else {
        modalRef.current?.focus()
      }
    } else {
      // モーダルが閉じられたら元の要素にフォーカスを戻す
      previousActiveElement.current?.focus()
    }
  }, [isOpen, initialFocus])

  // キーボードイベント
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose()
      }
      
      // フォーカストラップ
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        
        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0] as HTMLElement
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
          
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault()
              lastElement.focus()
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault()
              firstElement.focus()
            }
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, closeOnEscape])

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div
        className="modal-backdrop"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-content"
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="モーダルを閉じる"
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
```

### 4. カラーアクセシビリティパターン

#### **コントラスト確保**
```css
/* アクセシブルカラーパレット */
:root {
  /* WCAG AA準拠カラー（4.5:1以上のコントラスト比） */
  --color-primary: #0066cc; /* 青 - 白背景で4.79:1 */
  --color-primary-dark: #004499; /* 濃い青 - 白背景で7.21:1 */
  --color-secondary: #6b7280; /* グレー - 白背景で5.12:1 */
  --color-success: #059669; /* 緑 - 白背景で4.56:1 */
  --color-warning: #d97706; /* オレンジ - 白背景で4.54:1 */
  --color-error: #dc2626; /* 赤 - 白背景で5.98:1 */
  
  /* テキストカラー */
  --color-text-primary: #111827; /* 黒 - 白背景で14.88:1 */
  --color-text-secondary: #374151; /* ダークグレー - 白背景で9.67:1 */
  --color-text-muted: #6b7280; /* グレー - 白背景で5.12:1 */
  
  /* 背景カラー */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-muted: #f3f4f6;
  
  /* ボーダーカラー */
  --color-border: #d1d5db; /* 白背景で1.78:1 - 装飾用 */
  --color-border-focus: #2563eb; /* フォーカス時 - 白背景で5.54:1 */
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #3b82f6; /* 明るい青 - 黒背景で4.81:1 */
    --color-primary-dark: #1d4ed8; /* 青 - 黒背景で3.12:1 */
    --color-secondary: #9ca3af; /* 明るいグレー - 黒背景で5.89:1 */
    --color-success: #10b981; /* 明るい緑 - 黒背景で5.47:1 */
    --color-warning: #f59e0b; /* 明るいオレンジ - 黒背景で7.14:1 */
    --color-error: #ef4444; /* 明るい赤 - 黒背景で4.56:1 */
    
    --color-text-primary: #f9fafb; /* 白 - 黒背景で15.12:1 */
    --color-text-secondary: #e5e7eb; /* 明るいグレー - 黒背景で11.36:1 */
    --color-text-muted: #9ca3af; /* グレー - 黒背景で5.89:1 */
    
    --color-bg-primary: #111827;
    --color-bg-secondary: #1f2937;
    --color-bg-muted: #374151;
    
    --color-border: #4b5563;
    --color-border-focus: #60a5fa;
  }
}

/* ハイコントラストモード対応 */
@media (prefers-contrast: high) {
  :root {
    --color-primary: #0000ff;
    --color-text-primary: #000000;
    --color-bg-primary: #ffffff;
    --color-border: #000000;
  }
}

/* 動きの軽減対応 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* フォーカスインジケーター */
.focus-visible:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

/* スクリーンリーダー専用テキスト */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ハイコントラストリンク */
.link-accessible {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.link-accessible:hover,
.link-accessible:focus {
  color: var(--color-primary-dark);
  text-decoration-thickness: 2px;
}

/* アクセシブルボタン */
.btn-accessible {
  min-height: 44px; /* タッチターゲットサイズ */
  min-width: 44px;
  padding: 8px 16px;
  border: 2px solid transparent;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-accessible:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

.btn-accessible:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

## まとめ

SEO・アクセシビリティパターンの適切な実装により、すべてのユーザーにとって使いやすく、検索エンジンにも最適化されたWebアプリケーションを構築できます。WCAG 2.1準拠、動的メタタグ管理、構造化データ、キーボード操作対応、スクリーンリーダー対応など、包括的なアクセシビリティとSEO最適化の実現が可能です。これらのパターンにより、インクルーシブで発見されやすいWebアプリケーションの開発が効率的に行えます。 