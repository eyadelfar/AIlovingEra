import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PublicLayout from './layouts/PublicLayout';
import ErrorBoundary from './features/shared/ErrorBoundary';
import LoadingSpinner from './features/shared/LoadingSpinner';

const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const CreatePage = lazy(() => import('./features/wizard/CreatePage'));
const BookViewerPage = lazy(() => import('./features/viewer/BookViewerPage'));
const NotFoundPage = lazy(() => import('./features/shared/NotFoundPage'));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1f2937', color: '#f1f5f9', border: '1px solid #374151' },
        }}
        containerStyle={{ zIndex: 60 }}
      />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="create" element={<CreatePage />} />
            <Route path="book/edit" element={<Navigate to="/book/view?edit=true" replace />} />
            <Route path="book/view" element={<BookViewerPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
