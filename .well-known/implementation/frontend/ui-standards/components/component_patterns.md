# UIコンポーネントパターン

@version[1.0.0]
@owner[ui-team]
@category[ui-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、UIコンポーネントの実装パターンを定義します。
アトミックデザインに基づくコンポーネントの分類、再利用性、保守性を考慮したパターンを提供します。

## 実装パターン

### 1. アトミックコンポーネントパターン
```typescript
// atoms/Button.tsx
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

### 2. モレキュールコンポーネントパターン
```typescript
// molecules/SearchInput.tsx
import { FC, InputHTMLAttributes } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Search } from 'lucide-react';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onSearch: (value: string) => void;
}

export const SearchInput: FC<SearchInputProps> = ({
  onSearch,
  ...props
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem('search') as HTMLInputElement;
    onSearch(input.value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm items-center space-x-2"
    >
      <Input
        type="search"
        name="search"
        placeholder="Search..."
        className="flex-1"
        {...props}
      />
      <Button type="submit" size="sm">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
};
```

### 3. オーガニズムコンポーネントパターン
```typescript
// organisms/DataTable.tsx
import {
  FC,
  useCallback,
  useState,
  useEffect,
} from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../atoms/Table';
import { Pagination } from '../molecules/Pagination';
import { SearchInput } from '../molecules/SearchInput';
import { Button } from '../atoms/Button';
import { SortAsc, SortDesc } from 'lucide-react';

interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  searchable?: boolean;
  onSearch?: (value: string) => void;
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 10,
  searchable = false,
  onSearch,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = useCallback((key: keyof T) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc'
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const sortedData = useCallback(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const paginatedData = useCallback(() => {
    const sorted = sortedData();
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  return (
    <div className="space-y-4">
      {searchable && (
        <SearchInput
          onSearch={value => onSearch?.(value)}
          className="max-w-sm"
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(column => (
              <TableHead
                key={String(column.key)}
                className={column.sortable ? 'cursor-pointer' : ''}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center space-x-2">
                  <span>{column.header}</span>
                  {column.sortable && sortConfig?.key === column.key && (
                    {
                      asc: <SortAsc className="h-4 w-4" />,
                      desc: <SortDesc className="h-4 w-4" />,
                    }[sortConfig.direction]
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData().map((item, index) => (
            <TableRow key={index}>
              {columns.map(column => (
                <TableCell key={String(column.key)}>
                  {column.render
                    ? column.render(item[column.key], item)
                    : String(item[column.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        total={data.length}
        pageSize={pageSize}
        currentPage={page}
        onPageChange={setPage}
      />
    </div>
  );
}
```

## 設計原則

### 1. コンポーネントの分類
- アトミックデザインの原則
- 責務の明確化
- 再利用性の確保

### 2. コンポーネントの設計
- 単一責任の原則
- Props インターフェースの設計
- 型安全性の確保

### 3. パフォーマンス
- メモ化の適切な使用
- レンダリングの最適化
- バンドルサイズの考慮

## アンチパターン

### 1. 避けるべきプラクティス
- 過度な状態管理
- 不適切なProps伝播
- 不要なレンダリング

### 2. 改善パターン
- 適切な状態管理
- コンポーネントの分割
- パフォーマンスの最適化

## レビューチェックリスト
- [ ] アトミックデザインの原則に従っている
- [ ] TypeScriptの型が適切に定義されている
- [ ] パフォーマンスが考慮されている
- [ ] アクセシビリティが確保されている
- [ ] テストが実装されている

## 関連パターン
- レイアウトパターン（`layout_patterns.md`）
- インタラクションパターン（`interaction_patterns.md`）
- アニメーションパターン（`animation_patterns.md`） 