import { Navigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function AdminRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  const role = profile.role;
  if (role !== 'admin' && role !== 'moderator') {
    return <Navigate to="/" replace />;
  }

  return children;
}
