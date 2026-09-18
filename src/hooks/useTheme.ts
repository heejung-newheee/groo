import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';

/**
 * theme 이 'system' 이면 data-theme 속성을 제거해
 * CSS 의 prefers-color-scheme 미디어쿼리가 동작하게 한다.
 */
export function useThemeEffect() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);
}
