import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerServiceWorker } from './lib/pwa';
import { reportError } from './lib/api';

const AdminApp = lazy(() => import('./admin/AdminApp'));
const isAdmin = location.pathname.startsWith('/admin');

// 오류 코드만 보고 (메시지/입력값 미전송)
window.addEventListener('error', () => reportError('JS_ERROR', isAdmin ? 'admin' : 'app'));
window.addEventListener('unhandledrejection', () => reportError('UNHANDLED_REJECTION', isAdmin ? 'admin' : 'app'));

if (!isAdmin) registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
);
