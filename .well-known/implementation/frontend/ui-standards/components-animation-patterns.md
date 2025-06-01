# アニメーションパターン

@version[1.0.0]
@owner[ui-team]
@category[ui-patterns]
@priority[high]
@lastUpdated[2024-01-26]
@status[active]

## 概要
このファイルでは、UIアニメーションの実装パターンを定義します。
トランジション、キーフレーム、スプリングアニメーションなどのパターンを提供します。

## 実装パターン

### 1. トランジションアニメーションパターン
```typescript
// hooks/useTransition.ts
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UseTransitionProps {
  duration?: number;
  delay?: number;
  ease?: string;
}

export function useTransition({
  duration = 0.3,
  delay = 0,
  ease = 'easeInOut',
}: UseTransitionProps = {}) {
  const [isVisible, setIsVisible] = useState(false);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(prev => !prev), []);

  const variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration, delay, ease },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: { duration, ease },
    },
  };

  return {
    isVisible,
    show,
    hide,
    toggle,
    variants,
  };
}

// Example usage:
// components/FadeTransition.tsx
interface FadeTransitionProps {
  children: ReactNode;
}

export const FadeTransition: FC<FadeTransitionProps> = ({
  children
}) => {
  const { isVisible, variants } = useTransition();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

### 2. キーフレームアニメーションパターン
```typescript
// hooks/useKeyframes.ts
import { useCallback } from 'react';
import { motion } from 'framer-motion';

interface UseKeyframesProps {
  duration?: number;
  repeat?: number;
}

export function useKeyframes({
  duration = 2,
  repeat = Infinity,
}: UseKeyframesProps = {}) {
  const pulse = {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration,
      repeat,
      ease: 'easeInOut',
    },
  };

  const bounce = {
    y: [0, -20, 0],
    transition: {
      duration,
      repeat,
      ease: 'easeInOut',
    },
  };

  const rotate = {
    rotate: [0, 360],
    transition: {
      duration,
      repeat,
      ease: 'linear',
    },
  };

  return {
    pulse,
    bounce,
    rotate,
  };
}

// Example usage:
// components/LoadingSpinner.tsx
export const LoadingSpinner: FC = () => {
  const { rotate } = useKeyframes({
    duration: 1,
    repeat: Infinity,
  });

  return (
    <motion.div
      className="w-8 h-8 border-4 border-primary rounded-full border-t-transparent"
      animate={rotate}
    />
  );
};
```

### 3. スプリングアニメーションパターン
```typescript
// hooks/useSpring.ts
import { useSpring, animated } from '@react-spring/web';

interface UseSpringAnimationProps {
  tension?: number;
  friction?: number;
  mass?: number;
}

export function useSpringAnimation({
  tension = 170,
  friction = 26,
  mass = 1,
}: UseSpringAnimationProps = {}) {
  const [springs, api] = useSpring(() => ({
    from: { scale: 1, opacity: 1 },
    config: { tension, friction, mass },
  }));

  const hover = () => {
    api.start({
      scale: 1.1,
      opacity: 0.8,
    });
  };

  const unhover = () => {
    api.start({
      scale: 1,
      opacity: 1,
    });
  };

  return {
    springs,
    hover,
    unhover,
  };
}

// Example usage:
// components/SpringButton.tsx
interface SpringButtonProps {
  children: ReactNode;
  onClick?: () => void;
}

export const SpringButton: FC<SpringButtonProps> = ({
  children,
  onClick,
}) => {
  const { springs, hover, unhover } = useSpringAnimation();

  return (
    <animated.button
      style={springs}
      onMouseEnter={hover}
      onMouseLeave={unhover}
      onClick={onClick}
      className="px-4 py-2 bg-primary text-white rounded-md"
    >
      {children}
    </animated.button>
  );
};
```

### 4. ジェスチャーアニメーションパターン
```typescript
// hooks/useGesture.ts
import { useGesture } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';

interface UseGestureAnimationProps {
  initialScale?: number;
  maxScale?: number;
}

export function useGestureAnimation({
  initialScale = 1,
  maxScale = 2,
}: UseGestureAnimationProps = {}) {
  const [{ scale, x, y }, api] = useSpring(() => ({
    scale: initialScale,
    x: 0,
    y: 0,
  }));

  const bind = useGesture({
    onDrag: ({ offset: [x, y] }) => {
      api.start({ x, y });
    },
    onPinch: ({ offset: [d] }) => {
      api.start({ scale: Math.min(maxScale, initialScale + d / 100) });
    },
  });

  return {
    bind,
    style: { scale, x, y },
  };
}

// Example usage:
// components/GestureImage.tsx
interface GestureImageProps {
  src: string;
  alt: string;
}

export const GestureImage: FC<GestureImageProps> = ({
  src,
  alt,
}) => {
  const { bind, style } = useGestureAnimation();

  return (
    <animated.img
      {...bind()}
      src={src}
      alt={alt}
      style={style}
      className="w-64 h-64 object-cover"
      draggable={false}
    />
  );
};
```

## 設計原則

### 1. アニメーションの分類
- トランジション
- キーフレーム
- スプリング
- ジェスチャー

### 2. アニメーションの設計
- パフォーマンス
- スムーズさ
- 適切なタイミング

### 3. アクセシビリティ
- 減光モード対応
- モーション軽減
- 代替表現

## アンチパターン

### 1. 避けるべきプラクティス
- 過度なアニメーション
- 不適切なタイミング
- パフォーマンスの無視

### 2. 改善パターン
- 適度なアニメーション
- 適切なタイミング
- パフォーマンスの最適化

## レビューチェックリスト
- [ ] アニメーションが目的に適している
- [ ] パフォーマンスが最適化されている
- [ ] アクセシビリティが考慮されている
- [ ] ブラウザ互換性が確保されている
- [ ] 代替表現が提供されている

## 関連パターン
- コンポーネントパターン（`component_patterns.md`）
- レイアウトパターン（`layout_patterns.md`）
- インタラクションパターン（`interaction_patterns.md`） 