import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, DollarSign, Palette, MessageSquare,
  Server, ClipboardList, ChevronLeft, ChevronRight, LogOut, Menu, X,
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import Logo from '../features/shared/Logo';

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, labelKey: 'nav.dashboard', end: true },
  { to: '/admin/users', icon: Users, labelKey: 'nav.users' },
  { to: '/admin/revenue', icon: DollarSign, labelKey: 'nav.revenue' },
  { to: '/admin/designs', icon: Palette, labelKey: 'nav.designs' },
  { to: '/admin/contacts', icon: MessageSquare, labelKey: 'nav.contacts' },
  { to: '/admin/system', icon: Server, labelKey: 'nav.system' },
  { to: '/admin/audit-log', icon: ClipboardList, labelKey: 'nav.auditLog' },
];

export default function AdminLayout() {
  const { t } = useTranslation('admin');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        {!collapsed && <Logo className="text-lg" />}
        <button
          onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors hidden md:block"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors md:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-violet-500/15 text-violet-400 font-medium'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{t(labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center text-white text-xs font-medium">
              {(profile?.display_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-300 truncate">{profile?.display_name}</p>
              <p className="text-[10px] text-violet-400 uppercase">{profile?.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>{t('nav.signOut')}</span>}
        </button>
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors mt-0.5"
        >
          <ChevronLeft className="w-4 h-4" />
          {!collapsed && <span>{t('nav.backToSite')}</span>}
        </NavLink>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col border-e border-gray-800 bg-gray-950 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute start-0 top-0 h-full w-64 bg-gray-950 border-e border-gray-800 z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-800 flex items-center px-4 gap-3 bg-gray-950/80 backdrop-blur-md sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-gray-400"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-medium text-gray-300">{t('title')}</h1>
          <div className="ms-auto flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium uppercase">
              {profile?.role}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
