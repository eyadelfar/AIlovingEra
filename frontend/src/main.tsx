import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './lib/i18n'; // i18n init (side-effect)
import App from './App';
import useAuthStore from './stores/authStore';

// Start auth session listener before render
useAuthStore.getState().initialize();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
        <App />
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
