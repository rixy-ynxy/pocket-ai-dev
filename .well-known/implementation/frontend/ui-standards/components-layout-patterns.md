# レイアウトパターン

@version[1.0.0]
@owner[ui-team]
@category[ui-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、UIレイアウトの実装パターンを定義します。
レスポンシブデザイン、グリッドシステム、フレックスボックスなどのパターンを提供します。

## 実装パターン

### 1. アプリケーションレイアウトパターン
```typescript
// layouts/AppLayout.tsx
import { FC, ReactNode } from 'react';
import { Header } from '../organisms/Header';
import { Sidebar } from '../organisms/Sidebar';
import { Footer } from '../organisms/Footer';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar className="w-64 hidden md:block" />
        <main className="flex-1 p-6">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};
```

### 2. グリッドレイアウトパターン
```typescript
// layouts/GridLayout.tsx
import { FC, ReactNode } from 'react';
import { cn } from '../utils/cn';

interface GridLayoutProps {
  children: ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
}

export const GridLayout: FC<GridLayoutProps> = ({
  children,
  columns = 3,
  gap = 4,
  className,
}) => {
  return (
    <div
      className={cn(
        'grid',
        `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}`,
        `gap-${gap}`,
        className
      )}
    >
      {children}
    </div>
  );
};

// Example usage:
// components/ProductGrid.tsx
export const ProductGrid: FC<{ products: Product[] }> = ({
  products
}) => {
  return (
    <GridLayout columns={4} gap={6}>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </GridLayout>
  );
};
```

### 3. フレックスレイアウトパターン
```typescript
// layouts/FlexLayout.tsx
import { FC, ReactNode } from 'react';
import { cn } from '../utils/cn';

type FlexDirection = 'row' | 'col';
type FlexAlign = 'start' | 'center' | 'end' | 'between' | 'around';
type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around';

interface FlexLayoutProps {
  children: ReactNode;
  direction?: FlexDirection;
  align?: FlexAlign;
  justify?: FlexJustify;
  wrap?: boolean;
  gap?: number;
  className?: string;
}

export const FlexLayout: FC<FlexLayoutProps> = ({
  children,
  direction = 'row',
  align = 'start',
  justify = 'start',
  wrap = false,
  gap = 4,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex',
        direction === 'col' ? 'flex-col' : 'flex-row',
        {
          'flex-wrap': wrap,
          [`items-${align}`]: align,
          [`justify-${justify}`]: justify,
          [`gap-${gap}`]: gap,
        },
        className
      )}
    >
      {children}
    </div>
  );
};

// Example usage:
// components/CardList.tsx
export const CardList: FC<{ cards: Card[] }> = ({
  cards
}) => {
  return (
    <FlexLayout
      direction="row"
      align="center"
      justify="between"
      wrap
      gap={4}
    >
      {cards.map(card => (
        <Card key={card.id} {...card} />
      ))}
    </FlexLayout>
  );
};
```

### 4. レスポンシブレイアウトパターン
```typescript
// layouts/ResponsiveLayout.tsx
import { FC, ReactNode } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface ResponsiveLayoutProps {
  children: ReactNode;
  mobile: ReactNode;
  tablet?: ReactNode;
  desktop: ReactNode;
}

export const ResponsiveLayout: FC<ResponsiveLayoutProps> = ({
  mobile,
  tablet,
  desktop,
}) => {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  if (isDesktop) return <>{desktop}</>;
  if (isTablet && tablet) return <>{tablet}</>;
  return <>{mobile}</>;
};

// hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query, matches]);

  return matches;
}
```

## 設計原則

### 1. レイアウトの分類
- コンテナレイアウト
- グリッドレイアウト
- フレックスレイアウト
- レスポンシブレイアウト

### 2. レイアウトの設計
- 再利用性
- 柔軟性
- メンテナンス性

### 3. レスポンシブ対応
- ブレークポイント
- モバイルファースト
- コンテンツの適応

## アンチパターン

### 1. 避けるべきプラクティス
- 固定サイズの多用
- 非効率なメディアクエリ
- 過度な入れ子構造

### 2. 改善パターン
- 相対単位の使用
- 効率的なメディアクエリ
- フラットな構造

## レビューチェックリスト
- [ ] レスポンシブデザインが適切に実装されている
- [ ] レイアウトの再利用性が確保されている
- [ ] パフォーマンスが考慮されている
- [ ] アクセシビリティが確保されている
- [ ] ブラウザ互換性が確保されている

## 関連パターン
- コンポーネントパターン（`component_patterns.md`）
- インタラクションパターン（`interaction_patterns.md`）
- アニメーションパターン（`animation_patterns.md`） 