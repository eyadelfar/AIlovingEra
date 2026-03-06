import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, User, BookOpen, CreditCard, ChevronDown, Globe, Upload, Menu, X, Palette, BarChart3, Gift, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { SUPPORTED_LANGS, isRTL } from '../../lib/i18n';
import useAuthStore from '../../stores/authStore';
import Logo from './Logo';
import ImportBookModal from './ImportBookModal';
import AuthModal from './AuthModal';

export default function Navbar() {
  const { t } = useTranslation('nav');
  const { i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const loading = useAuthStore((s) => s.loading);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const dropdownRef = useRef(null);
  const langRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Self-healing: fetch profile if user is authenticated but profile is missing
  useEffect(() => {
    if (user && !profile && !loading) {
      fetchProfile();
    }
  }, [user, profile, loading, fetchProfile]);

  const handleSignOut = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    signOut();
    // Force FULL page reload — destroys all in-memory state, listeners, caches.
    // SPA navigate('/') does NOT work because onAuthStateChange listener survives.
    window.location.href = '/';
  };

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code);
    setLangOpen(false);
    setMobileMenuOpen(false);
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || '';
  const avatarUrl = profile?.avatar_url;
  const credits = profile?.credits ?? 0;
  const initial = displayName.charAt(0).toUpperCase();
  const currentLang = SUPPORTED_LANGS.find((l) => l.code === i18n.language) || SUPPORTED_LANGS[0];

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-30 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="text-xl" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              {t('pricing')}
            </Link>
            <Link to="/marketplace" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              {t('marketplace')}
            </Link>

            {/* Import button */}
            <button
              onClick={() => setImportOpen(true)}
              title={t('import')}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
            >
              <Upload className="w-4 h-4" />
            </button>

            {/* Language selector */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
              >
                <Globe className="w-4 h-4" />
                <span className="uppercase text-xs font-medium">{currentLang.code}</span>
              </button>

              {langOpen && (
                <div className="absolute end-0 mt-2 w-48 rounded-xl bg-gray-900 border border-gray-800 shadow-xl py-1 z-50 max-h-80 overflow-y-auto">
                  {SUPPORTED_LANGS.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                        i18n.language === lang.code
                          ? 'text-violet-400 bg-violet-500/10'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <span>{lang.nativeName}</span>
                      {i18n.language === lang.code && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth section */}
            {!loading && !user && (
              <button
                onClick={() => setAuthOpen(true)}
                className="bg-gradient-to-r from-rose-500 to-violet-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:from-rose-600 hover:to-violet-700 transition-all"
              >
                {t('getStarted')}
              </button>
            )}

            {!loading && user && (
              <>
                <Link
                  to="/create"
                  className="bg-gradient-to-r from-rose-500 to-violet-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:from-rose-600 hover:to-violet-700 transition-all"
                >
                  {t('createBook')}
                </Link>

                {profile?.plan !== 'monthly_pro' && profile?.plan !== 'annual_pro' && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">{credits}</span>
                  </div>
                )}

                {/* Avatar dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 rounded-full hover:bg-white/5 p-1 pe-2 transition-colors"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center text-white text-sm font-medium">
                        {initial}
                      </div>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute end-0 mt-2 w-56 rounded-xl bg-gray-900 border border-gray-800 shadow-xl py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-800">
                        <p className="text-sm font-medium text-white truncate">{displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>

                      <Link
                        to="/my-books"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <BookOpen className="w-4 h-4" />
                        {t('myBooks')}
                      </Link>
                      <Link
                        to="/pricing"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        {t('plansAndCredits')}
                      </Link>
                      <Link
                        to="/marketplace/submit"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <Palette className="w-4 h-4" />
                        {t('submitDesign')}
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        {t('profile')}
                      </Link>
                      <Link
                        to="/usage"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <BarChart3 className="w-4 h-4" />
                        {t('usage')}
                      </Link>
                      <Link
                        to="/referral"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <Gift className="w-4 h-4" />
                        {t('referAndEarn')}
                      </Link>

                      {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-violet-400 hover:bg-violet-500/10 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          {t('adminPanel')}
                        </Link>
                      )}

                      <div className="border-t border-gray-800 mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('signOut')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: isRTL(i18n.language) ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL(i18n.language) ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className={`fixed top-0 ${isRTL(i18n.language) ? 'start-0' : 'end-0'} z-50 w-[min(18rem,85vw)] h-full bg-gray-950 border-s border-white/10 md:hidden overflow-y-auto`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <Logo className="text-lg" />
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile nav links */}
                <div className="space-y-1 mb-4">
                  <Link
                    to="/create"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-rose-500 to-violet-600 text-white"
                  >
                    <BookOpen className="w-4 h-4" />
                    {t('createBook')}
                  </Link>
                  <Link
                    to="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    {t('pricing')}
                  </Link>
                  <Link
                    to="/marketplace"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <Palette className="w-4 h-4" />
                    {t('marketplace')}
                  </Link>
                  <button
                    onClick={() => { setImportOpen(true); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors w-full"
                  >
                    <Upload className="w-4 h-4" />
                    {t('import')}
                  </button>
                </div>

                {/* Language selector in mobile */}
                <div className="border-t border-gray-800 pt-3 mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-2">{t('language')}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {SUPPORTED_LANGS.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`px-3 py-2 rounded-lg text-xs text-start transition-colors ${
                          i18n.language === lang.code
                            ? 'text-violet-400 bg-violet-500/10'
                            : 'text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        {lang.nativeName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auth section in mobile */}
                <div className="border-t border-gray-800 pt-3">
                  {!loading && !user && (
                    <button
                      onClick={() => { setAuthOpen(true); setMobileMenuOpen(false); }}
                      className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-rose-500 to-violet-600 text-white"
                    >
                      {t('getStarted')}
                    </button>
                  )}

                  {!loading && user && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center text-white text-sm font-medium">
                            {initial}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{displayName}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>

                      {profile?.plan !== 'monthly_pro' && profile?.plan !== 'annual_pro' && (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <CreditCard className="w-4 h-4 text-amber-400" />
                          <span className="text-sm text-amber-400">{credits} {t('credits')}</span>
                        </div>
                      )}

                      <Link
                        to="/my-books"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <BookOpen className="w-4 h-4" />
                        {t('myBooks')}
                      </Link>
                      <Link
                        to="/marketplace/submit"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <Palette className="w-4 h-4" />
                        {t('submitDesign')}
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        {t('profile')}
                      </Link>
                      <Link
                        to="/usage"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <BarChart3 className="w-4 h-4" />
                        {t('usage')}
                      </Link>
                      <Link
                        to="/referral"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <Gift className="w-4 h-4" />
                        {t('referAndEarn')}
                      </Link>

                      {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                        <Link
                          to="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-violet-400 hover:bg-violet-500/10 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          {t('adminPanel')}
                        </Link>
                      )}

                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('signOut')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Import modal */}
      {importOpen && <ImportBookModal onClose={() => setImportOpen(false)} />}

      {/* Auth modal */}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
