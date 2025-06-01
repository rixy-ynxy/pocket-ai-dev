# UIコンポーネントパターン - Feature Sliced Design

@version[1.0.0]
@owner[ui-team]
@category[ui-patterns]
@priority[high]
@lastUpdated[2024-03-16]
@status[active]

## 概要
このファイルでは、Feature Sliced Design (FSD)アーキテクチャに基づくUIコンポーネントの実装パターンを定義します。
FSDの層構造に従ったコンポーネントの分類、責務の分離、再利用性に関するルールを提供します。

## FSDレイヤー構造

```
src/
├── shared/       # 共通の基盤コンポーネント
├── entities/     # ビジネスエンティティ関連UI
├── features/     # 特定の機能単位のUI
├── widgets/      # 複数の機能を組み合わせた独立したUI
└── pages/        # アプリケーションのページ
```

## 実装パターン

### 1. 共通UIコンポーネントパターン (shared)
```typescript
// shared/ui/Button/Button.tsx
import { ButtonHTMLAttributes, FC } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button: FC<ButtonProps> = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) => {
  return (
    <button
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
};
```

### 2. エンティティコンポーネントパターン (entities)
```typescript
// entities/product/ui/ProductCard/ProductCard.tsx
import { FC } from 'react';
import { Product } from '../../model/types';
import { formatPrice } from '../../lib/formatters';
import { Button } from '../../../../shared/ui/Button';
import { Card, CardContent, CardFooter } from '../../../../shared/ui/Card';
import { useAddToCart } from '../../../cart/api/addToCart';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
}

export const ProductCard: FC<ProductCardProps> = ({ 
  product,
  onAddToCart
}) => {
  const { addToCart, isLoading } = useAddToCart();
  
  const handleAddToCart = () => {
    addToCart(product.id);
    onAddToCart?.(product.id);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="pt-4 flex-grow">
        <img 
          src={product.imageSrc} 
          alt={product.name}
          className="w-full h-40 object-cover rounded-md mb-4"
        />
        <h3 className="font-semibold text-lg">{product.name}</h3>
        <p className="text-muted-foreground line-clamp-2 text-sm mt-2">
          {product.description}
        </p>
        <p className="font-bold text-lg mt-2">
          {formatPrice(product.price)}
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleAddToCart} 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  );
};
```

### 3. 機能コンポーネントパターン (features)
```typescript
// features/search/ui/SearchForm/SearchForm.tsx
import { FC, FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '../../../../shared/ui/Input';
import { Button } from '../../../../shared/ui/Button';
import { Search } from 'lucide-react';
import { useSearchFilters } from '../../model/useSearchFilters';

interface SearchFormProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export const SearchForm: FC<SearchFormProps> = ({
  onSearch,
  placeholder = "Search products..."
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(() => 
    searchParams.get('query') || ''
  );
  const { addRecentSearch } = useSearchFilters();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Update URL params
    if (inputValue) {
      searchParams.set('query', inputValue);
    } else {
      searchParams.delete('query');
    }
    setSearchParams(searchParams);
    
    // Save to recent searches
    if (inputValue) {
      addRecentSearch(inputValue);
    }
    
    // Call optional handler
    onSearch?.(inputValue);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm items-center space-x-2"
    >
      <Input
        type="search"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button type="submit" size="sm">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
};
```

### 4. ウィジェットコンポーネントパターン (widgets)
```typescript
// widgets/ProductCatalog/ui/ProductCatalog.tsx
import { FC, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductGrid } from './ProductGrid';
import { ProductFilters } from './ProductFilters';
import { SearchForm } from '../../../features/search/ui/SearchForm';
import { NoResults } from './NoResults';
import { ProductSorting } from './ProductSorting';
import { useProducts } from '../../../entities/product/api/products';
import { Skeleton } from '../../../shared/ui/Skeleton';

export const ProductCatalog: FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('query') || '';
  const category = searchParams.get('category') || undefined;
  const sort = searchParams.get('sort') || 'popular';
  
  const { products, isLoading, error, refetch } = useProducts({
    query,
    category,
    sort
  });
  
  useEffect(() => {
    refetch();
  }, [query, category, sort, refetch]);
  
  if (error) {
    return (
      <div className="p-4 text-destructive">
        Failed to load products. Please try again.
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <SearchForm />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <ProductFilters />
        </div>
        
        <div className="md:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <p>{products?.length || 0} products found</p>
            <ProductSorting />
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          ) : products?.length ? (
            <ProductGrid products={products} />
          ) : (
            <NoResults query={query} />
          )}
        </div>
      </div>
    </div>
  );
};
```

## FSDの設計原則

### 1. コンポーネントの分類と責務
- **shared/ui**: 最も汎用的で再利用可能なUIコンポーネント。ビジネスロジックを含まない
- **entities/[entity]/ui**: ビジネスエンティティを表示するためのコンポーネント
- **features/[feature]/ui**: 特定の機能を実装するためのコンポーネント
- **widgets/[widget]/ui**: 複数の機能を組み合わせた独立した複合UI
- **pages/[page]/ui**: 特定のURLに対応するページコンポーネント

### 2. 依存関係の方向
- 上位レイヤーは下位レイヤーに依存可能（pages → widgets → features → entities → shared）
- 下位レイヤーは上位レイヤーに依存不可
- 同一レイヤー内での水平方向の依存は原則として避ける

### 3. スライスの独立性
- 各スライス（feature, entity, widget）はできる限り独立して機能する
- スライス間通信は明示的なイベント/APIを通じて行う
- スライス内のファイル構造を統一する（ui, model, api, lib, config）

## ファイル構造パターン

各コンポーネントは以下の構造に従います：

```
ComponentName/
├── index.ts               # Public API
├── ComponentName.tsx      # 実装
├── ComponentName.test.tsx # テスト
└── ComponentName.module.css   # スタイル (オプション)
```

## アンチパターン

### 1. 避けるべきプラクティス
- レイヤーをまたいだ逆方向の依存関係
- スライス間での直接的な依存
- ビジネスロジックをUIコンポーネントに埋め込む
- 特定のコンテキストに依存する実装をsharedレイヤーに配置

### 2. 改善パターン
- 明確なコンポーネントの責務分離
- データフェッチングと表示の分離
- プロパティの適切な受け渡し
- コンポーネントの適切な粒度の維持

## レビューチェックリスト
- [ ] FSDレイヤー構造に準拠している
- [ ] 適切なレイヤーに配置されている
- [ ] 依存関係が正しい方向を向いている
- [ ] TypeScriptの型が適切に定義されている
- [ ] UIとビジネスロジックが適切に分離されている
- [ ] テストが実装されている

## 関連パターン
- レイアウトパターン
- ステート管理パターン
- データフェッチングパターン 