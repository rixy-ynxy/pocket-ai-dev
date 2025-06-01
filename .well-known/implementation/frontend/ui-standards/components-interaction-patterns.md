# インタラクションパターン

@version[1.0.0]
@owner[ui-team]
@category[ui-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、UIインタラクションの実装パターンを定義します。
フォーム、モーダル、ドラッグ&ドロップなどのユーザーインタラクションパターンを提供します。

## 実装パターン

### 1. フォームインタラクションパターン
```typescript
// hooks/useForm.ts
import { useState, useCallback, FormEvent } from 'react';
import { z } from 'zod';

interface UseFormProps<T> {
  initialValues: T;
  validationSchema: z.ZodType<T>;
  onSubmit: (values: T) => Promise<void>;
}

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
}: UseFormProps<T>) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
  });

  const handleChange = useCallback((
    name: keyof T,
    value: any
  ) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, [name]: value },
      touched: { ...prev.touched, [name]: true },
    }));
  }, []);

  const handleBlur = useCallback((name: keyof T) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [name]: true },
    }));
  }, []);

  const validate = useCallback(() => {
    try {
      validationSchema.parse(state.values);
      setState(prev => ({ ...prev, errors: {} }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.path[0]]: curr.message,
          }),
          {}
        );
        setState(prev => ({ ...prev, errors }));
      }
      return false;
    }
  }, [state.values, validationSchema]);

  const handleSubmit = useCallback(async (
    e: FormEvent
  ) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isSubmitting: true }));

    if (validate()) {
      try {
        await onSubmit(state.values);
      } catch (error) {
        console.error('Form submission failed:', error);
      }
    }

    setState(prev => ({ ...prev, isSubmitting: false }));
  }, [state.values, validate, onSubmit]);

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}

// Example usage:
// components/LoginForm.tsx
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginForm: FC = () => {
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useForm<LoginFormValues>({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      // Handle login
    },
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="email"
          name="email"
          value={values.email}
          onChange={e => handleChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          error={touched.email ? errors.email : undefined}
        />
      </div>
      <div>
        <Input
          type="password"
          name="password"
          value={values.password}
          onChange={e => handleChange('password', e.target.value)}
          onBlur={() => handleBlur('password')}
          error={touched.password ? errors.password : undefined}
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
};
```

### 2. モーダルインタラクションパターン
```typescript
// hooks/useModal.ts
import {
  useState,
  useCallback,
  createContext,
  useContext,
  FC,
  ReactNode,
} from 'react';

interface ModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: FC<{ children: ReactNode }> = ({
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  return (
    <ModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

// components/Modal.tsx
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface ModalProps {
  children: ReactNode;
  title: string;
}

export const Modal: FC<ModalProps> = ({ children, title }) => {
  const { isOpen, closeModal } = useModal();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeModal}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  {title}
                </Dialog.Title>
                <div className="mt-2">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
```

### 3. ドラッグ&ドロップパターン
```typescript
// hooks/useDraggable.ts
import { useState, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableProps {
  initialPosition?: Position;
}

export function useDraggable({
  initialPosition = { x: 0, y: 0 },
}: UseDraggableProps = {}) {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((
    e: React.MouseEvent
  ) => {
    setIsDragging(true);
    const startX = e.pageX - position.x;
    const startY = e.pageY - position.y;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.pageX - startX,
        y: e.pageY - startY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [position]);

  return {
    position,
    isDragging,
    handleMouseDown,
  };
}

// Example usage:
// components/DraggableElement.tsx
interface DraggableElementProps {
  children: ReactNode;
}

export const DraggableElement: FC<DraggableElementProps> = ({
  children
}) => {
  const { position, isDragging, handleMouseDown } = useDraggable();

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
};
```

## 設計原則

### 1. インタラクションの分類
- フォーム操作
- モーダル/ダイアログ
- ドラッグ&ドロップ
- ジェスチャー

### 2. インタラクションの設計
- 直感的な操作
- フィードバックの提供
- エラー処理

### 3. アクセシビリティ
- キーボード操作
- スクリーンリーダー対応
- WAI-ARIA対応

## アンチパターン

### 1. 避けるべきプラクティス
- 不適切なフィードバック
- 過度な制御
- アクセシビリティの無視

### 2. 改善パターン
- 適切なフィードバック
- 適度な制御
- アクセシビリティの確保

## レビューチェックリスト
- [ ] インタラクションが直感的である
- [ ] フィードバックが適切である
- [ ] エラー処理が適切である
- [ ] アクセシビリティが確保されている
- [ ] パフォーマンスが考慮されている

## 関連パターン
- コンポーネントパターン（`component_patterns.md`）
- レイアウトパターン（`layout_patterns.md`）
- アニメーションパターン（`animation_patterns.md`）