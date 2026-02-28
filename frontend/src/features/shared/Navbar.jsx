import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="text-xl" />
        </Link>
        <Link
          to="/create"
          className="bg-gradient-to-r from-rose-500 to-violet-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:from-rose-600 hover:to-violet-700 transition-all"
        >
          Create Book
        </Link>
      </div>
    </nav>
  );
}
