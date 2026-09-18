import { createBrowserRouter } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { RequireAuth } from './guards';
import { AuthCallback } from '../pages/AuthCallback';
import { CalendarPage } from '../pages/CalendarPage';
import { EntryDetail } from '../pages/EntryDetail';
import { EntryEdit } from '../pages/EntryEdit';
import { EntryNew } from '../pages/EntryNew';
import { Home } from '../pages/Home';
import { Landing } from '../pages/Landing';
import { Login } from '../pages/Login';
import { NotFound } from '../pages/NotFound';
import { PlantDetail } from '../pages/PlantDetail';
import { PlantEdit } from '../pages/PlantEdit';
import { PlantNew } from '../pages/PlantNew';
import { Plants } from '../pages/Plants';
import { Settings } from '../pages/Settings';
import { Signup } from '../pages/Signup';

/**
 * declarative(library) mode 를 쓴다. framework mode(SSR)를 쓰지 않는 이유는
 * docs/05-ARCHITECTURE.md 참고 — 개인 기록 앱이라 SEO 가 불필요하고,
 * 정적 호스팅이라 배포가 단순하다.
 */
export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/auth/callback', element: <AuthCallback /> },

  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/home', element: <Home /> },
          { path: '/plants', element: <Plants /> },
          { path: '/plants/new', element: <PlantNew /> },
          { path: '/plants/:id', element: <PlantDetail /> },
          { path: '/plants/:id/edit', element: <PlantEdit /> },
          { path: '/entries/new', element: <EntryNew /> },
          { path: '/entries/:id', element: <EntryDetail /> },
          { path: '/entries/:id/edit', element: <EntryEdit /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/settings', element: <Settings /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFound /> },
]);
