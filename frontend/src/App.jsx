import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { isRTL } from './lib/i18n';
import { trackEvent } from './lib/eventTracker';
import PublicLayout from './layouts/PublicLayout';
import ErrorBoundary from './features/shared/ErrorBoundary';
import LoadingSpinner from './features/shared/LoadingSpinner';

const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const CreatePage = lazy(() => import('./features/wizard/CreatePage'));
const BookViewerPage = lazy(() => import('./features/viewer/BookViewerPage'));
const NotFoundPage = lazy(() => import('./features/shared/NotFoundPage'));

// Admin
const AdminDashboardPage = lazy(() => import('./features/admin/pages/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./features/admin/pages/AdminUsersPage'));
const AdminUserDetailPage = lazy(() => import('./features/admin/pages/AdminUserDetailPage'));
const AdminRevenuePage = lazy(() => import('./features/admin/pages/AdminRevenuePage'));
const AdminDesignsPage = lazy(() => import('./features/admin/pages/AdminDesignsPage'));
const AdminContactsPage = lazy(() => import('./features/admin/pages/AdminContactsPage'));
const AdminSystemPage = lazy(() => import('./features/admin/pages/AdminSystemPage'));
const AdminAuditLogPage = lazy(() => import('./features/admin/pages/AdminAuditLogPage'));
import AdminRoute from './features/admin/AdminRoute';
import AdminLayout from './layouts/AdminLayout';

// Auth
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const SignupPage = lazy(() => import('./features/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const AuthCallback = lazy(() => import('./features/auth/AuthCallback'));

// Pricing & Checkout
const PricingPage = lazy(() => import('./features/pricing/PricingPage'));
const CheckoutSuccess = lazy(() => import('./features/pricing/CheckoutSuccess'));
const CheckoutCancel = lazy(() => import('./features/pricing/CheckoutCancel'));

// Marketplace
const MarketplacePage = lazy(() => import('./features/marketplace/MarketplacePage'));
const DesignSubmitPage = lazy(() => import('./features/marketplace/DesignSubmitPage'));

// New pages
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const UsagePage = lazy(() => import('./features/usage/UsagePage'));
const AboutPage = lazy(() => import('./features/pages/AboutPage'));
const ContactPage = lazy(() => import('./features/pages/ContactPage'));
const ReferralPage = lazy(() => import('./features/referral/ReferralPage'));
const MyBooksPage = lazy(() => import('./features/books/MyBooksPage'));
const PrivacyPolicyPage = lazy(() => import('./features/pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./features/pages/TermsOfServicePage'));

// Auth helpers
import ProtectedRoute from './features/auth/ProtectedRoute';

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export default function App() {
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    trackEvent('page_view', 'navigation', { path: location.pathname });
  }, [location.pathname]);

  useEffect(() => {
    const handleLang = (lng) => {
      document.documentElement.dir = isRTL(lng) ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;
    };
    handleLang(i18n.language);
    i18n.on('languageChanged', handleLang);
    return () => i18n.off('languageChanged', handleLang);
  }, [i18n]);

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
          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:id" element={<AdminUserDetailPage />} />
            <Route path="revenue" element={<AdminRevenuePage />} />
            <Route path="designs" element={<AdminDesignsPage />} />
            <Route path="contacts" element={<AdminContactsPage />} />
            <Route path="system" element={<AdminSystemPage />} />
            <Route path="audit-log" element={<AdminAuditLogPage />} />
          </Route>

          <Route element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="create" element={<CreatePage />} />
            <Route path="book/edit" element={<Navigate to="/book/view?edit=true" replace />} />
            <Route path="book/view" element={<BookViewerPage />} />

            {/* Auth */}
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="auth/callback" element={<AuthCallback />} />

            {/* Pricing & Checkout */}
            <Route path="pricing" element={<PricingPage />} />
            <Route path="checkout/success" element={<CheckoutSuccess />} />
            <Route path="checkout/cancel" element={<CheckoutCancel />} />

            {/* Marketplace */}
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="marketplace/submit" element={<DesignSubmitPage />} />

            {/* Profile & Usage (protected) */}
            <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="usage" element={<ProtectedRoute><UsagePage /></ProtectedRoute>} />
            <Route path="referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
            <Route path="my-books" element={<ProtectedRoute><MyBooksPage /></ProtectedRoute>} />

            {/* Public pages */}
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="privacy" element={<PrivacyPolicyPage />} />
            <Route path="terms" element={<TermsOfServicePage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
