import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, Copy, CheckCircle, Share2, UserPlus, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchReferralCode, fetchReferralStats } from '../../api/referralApi';

export default function ReferralPage() {
  const { t } = useTranslation('referral');

  const [code, setCode] = useState('');
  const [link, setLink] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [codeData, statsData] = await Promise.all([
        fetchReferralCode(),
        fetchReferralStats(),
      ]);
      setCode(codeData.code);
      setLink(codeData.link);
      setStats(statsData);
    } catch {
      toast.error(t('common:operationFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(t('common:copiedToClipboard'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('common:operationFailed'));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const steps = [
    { icon: Share2, color: 'text-rose-400', bg: 'bg-rose-500/10', title: t('step1Title'), desc: t('step1Desc') },
    { icon: UserPlus, color: 'text-violet-400', bg: 'bg-violet-500/10', title: t('step2Title'), desc: t('step2Desc') },
    { icon: Coins, color: 'text-amber-400', bg: 'bg-amber-500/10', title: t('step3Title'), desc: t('step3Desc') },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">
            {t('referTitle')}
          </h1>
          <p className="text-gray-400 mt-3 max-w-md mx-auto">{t('referSubtitle')}</p>
        </div>

        {/* Referral Link Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-medium text-gray-400 mb-3">{t('yourReferralLink')}</h2>
          <div className="flex gap-3">
            <div className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 truncate font-mono">
              {link}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors flex-shrink-0"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('copied') : t('copyLink')}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">{t('referralCode')}: <span className="text-gray-300 font-mono">{code}</span></p>
        </div>

        {/* How It Works */}
        <h2 className="text-xl font-semibold text-white mb-4">{t('howItWorks')}</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {steps.map(({ icon: Icon, color, bg, title, desc }, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center mx-auto mb-3`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{t('yourStats')}</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats?.total_referrals || 0}</p>
              <p className="text-xs text-gray-400 mt-1">{t('totalReferrals')}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{stats?.credits_earned || 0}</p>
              <p className="text-xs text-gray-400 mt-1">{t('creditsEarned')}</p>
            </div>
          </div>

          {stats?.referrals?.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-gray-400 mb-3">{t('recentReferrals')}</h3>
              <div className="space-y-2">
                {stats.referrals.slice(0, 10).map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-800/30">
                    <span className="text-sm text-gray-300">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === 'completed'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {r.status === 'completed' ? t('completed') : t('pending')}
                    </span>
                    <span className="text-sm text-amber-400">+{r.credits_awarded}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
