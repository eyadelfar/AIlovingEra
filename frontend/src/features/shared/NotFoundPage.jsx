import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl sm:text-6xl font-bold text-gray-700 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-300 mb-2">Page not found</h2>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-rose-500 to-violet-600 text-white hover:from-rose-600 hover:to-violet-700 transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
