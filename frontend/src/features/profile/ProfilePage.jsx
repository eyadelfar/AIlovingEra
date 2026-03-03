import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, CreditCard, BookOpen, BarChart3, Gift, Save, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { SUPPORTED_LANGS } from '../../lib/i18n';
import useAuthStore from '../../stores/authStore';
import { fetchProfile, updateProfile, uploadAvatar, changePassword, deleteAccount } from '../../api/profileApi';
import AvatarUpload from './AvatarUpload';
import DeleteAccountModal from './DeleteAccountModal';

export default function ProfilePage() {
  const { t } = useTranslation('profile');
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshProfile = useAuthStore((s) => s.fetchProfile);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [langPref, setLangPref] = useState('en');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await fetchProfile();
      setProfile(data);
      setDisplayName(data.display_name || '');
      setLangPref(data.language_preference || 'en');
    } catch {
      toast.error(t('common:operationFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await updateProfile({ display_name: displayName, language_preference: langPref });
      if (langPref !== i18n.language) {
        i18n.changeLanguage(langPref);
      }
      await refreshProfile();
      toast.success(t('common:savedSuccessfully'));
    } catch {
      toast.error(t('common:operationFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(file) {
    setUploading(true);
    try {
      const { avatar_url } = await uploadAvatar(file);
      setProfile((p) => ({ ...p, avatar_url }));
      await refreshProfile();
      toast.success(t('avatarUpdated'));
    } catch {
      toast.error(t('common:operationFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      toast.error(t('passwordMinLength'));
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({ new_password: newPassword });
      setNewPassword('');
      toast.success(t('passwordChanged'));
    } catch {
      toast.error(t('common:operationFailed'));
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      navigate('/');
      toast.success(t('accountDeleted'));
    } catch {
      toast.error(t('common:operationFailed'));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const planLabel = {
    free: t('planFree'),
    credits: t('planCredits'),
    monthly_pro: t('planMonthlyPro'),
    annual_pro: t('planAnnualPro'),
  }[profile?.plan] || profile?.plan;

  const isPro = profile?.plan === 'monthly_pro' || profile?.plan === 'annual_pro';
  const initial = (profile?.display_name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center gap-5">
          <AvatarUpload
            avatarUrl={profile?.avatar_url}
            initial={initial}
            onUpload={handleAvatarUpload}
            uploading={uploading}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-white truncate">{profile?.display_name}</h1>
            <p className="text-sm text-gray-400 truncate">{user?.email}</p>
            <p className="text-xs text-gray-500 mt-1">
              {t('memberSince', { date: new Date(profile?.created_at).toLocaleDateString() })}
            </p>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{t('accountInfo')}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <Crown className={`w-5 h-5 mx-auto mb-2 ${isPro ? 'text-amber-400' : 'text-gray-500'}`} />
              <p className="text-xs text-gray-400 mb-1">{t('plan')}</p>
              <p className="text-sm font-medium text-white">{planLabel}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <CreditCard className="w-5 h-5 mx-auto mb-2 text-violet-400" />
              <p className="text-xs text-gray-400 mb-1">{t('credits')}</p>
              <p className="text-sm font-medium text-white">{isPro ? t('unlimited') : profile?.credits}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <BookOpen className="w-5 h-5 mx-auto mb-2 text-rose-400" />
              <p className="text-xs text-gray-400 mb-1">{t('booksCreated')}</p>
              <p className="text-sm font-medium text-white">{profile?.books_created}</p>
            </div>
          </div>
          {!isPro && (
            <Link
              to="/pricing"
              className="mt-4 block text-center py-2 rounded-lg bg-gradient-to-r from-rose-500 to-violet-600 text-white text-sm font-medium hover:from-rose-600 hover:to-violet-700 transition-all"
            >
              {t('upgradePlan')}
            </Link>
          )}
        </div>

        {/* Edit Profile */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{t('editProfile')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t('displayName')}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t('language')}</label>
              <select
                value={langPref}
                onChange={(e) => setLangPref(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              >
                {SUPPORTED_LANGS.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? t('common:loading') : t('common:save')}
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{t('security')}</h2>

          {/* Change Password */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-1.5">{t('newPassword')}</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('newPasswordPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword}
                className="px-5 py-2.5 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {changingPassword ? t('common:loading') : t('changePassword')}
              </button>
            </div>
          </div>

          {/* Delete Account */}
          <div className="border-t border-gray-800 pt-4">
            <h3 className="text-sm font-medium text-red-400 mb-2">{t('dangerZone')}</h3>
            <p className="text-xs text-gray-500 mb-3">{t('deleteAccountDesc')}</p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
            >
              {t('deleteAccount')}
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{t('quickLinks')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/usage"
              className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-violet-400" />
              <span className="text-sm text-gray-300">{t('viewUsage')}</span>
            </Link>
            <Link
              to="/referral"
              className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              <Gift className="w-5 h-5 text-rose-400" />
              <span className="text-sm text-gray-300">{t('referAndEarn')}</span>
            </Link>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          deleting={deleting}
        />
      )}
    </div>
  );
}
