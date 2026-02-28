import { Outlet } from 'react-router-dom';
import Navbar from '../features/shared/Navbar';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <main className="pt-[var(--navbar-h)]">
        <Outlet />
      </main>
    </div>
  );
}
