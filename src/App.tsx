import { RouterProvider } from 'react-router';
import { router } from './router';
import { useThemeEffect } from './hooks/useTheme';
import { Providers } from './providers';

export function App() {
  useThemeEffect();

  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
