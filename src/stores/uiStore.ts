import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';

interface UiState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

/**
 * Zustand 는 **클라이언트 상태만** 담는다.
 * 식물 목록/일지/AI 결과 같은 서버 데이터는 TanStack Query 가 담당한다.
 * 섞으면 캐시 무효화를 손으로 짜게 된다.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'groo-ui' },
  ),
);
