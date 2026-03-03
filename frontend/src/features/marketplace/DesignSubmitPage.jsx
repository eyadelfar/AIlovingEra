import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Send, ArrowLeft, Eye, Loader2 } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { apiFetch } from '../../lib/api';

const CATEGORIES = [
  { value: 'theme', labelKey: 'categoryThemes' },
  { value: 'cover', labelKey: 'categoryCovers' },
  { value: 'layout_pack', labelKey: 'categoryLayoutPacks' },
];

const STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function DesignSubmitPage() {
  const { t } = useTranslation('marketplace');
  const { t: tc } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('theme');
  const [subcategory, setSubcategory] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [configJson, setConfigJson] = useState('{\n  \n}');
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/marketplace/submit');
      return;
    }
    fetchSubmissions();
  }, [user, navigate]);

  async function fetchSubmissions() {
    try {
      const res = await apiFetch('/api/marketplace/submissions/mine');
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch {
      // ignore
    } finally {
      setLoadingSubs(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;

    let parsed;
    try {
      parsed = JSON.parse(configJson);
    } catch {
      toast.error('Invalid JSON in design config');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/marketplace/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          subcategory: subcategory.trim(),
          preview_image_url: previewUrl.trim(),
          config_json: parsed,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Submission failed');
      }

      toast.success(t('designSubmitted'));
      setName('');
      setDescription('');
      setSubcategory('');
      setPreviewUrl('');
      setConfigJson('{\n  \n}');
      fetchSubmissions();
    } catch (err) {
      toast.error(err.message || t('designSubmitError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('submitDesign')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Share your designs with the KeepSqueak community</p>
          </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-5 bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-10">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('designName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
              placeholder="My Amazing Theme"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('designDescription')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none resize-none"
              placeholder="Describe your design..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('designCategory')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-violet-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('designSubcategory')}</label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                placeholder="e.g. romantic, minimalist"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('designPreviewImage')}</label>
            <input
              type="url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
              placeholder="https://example.com/preview.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('designConfig')}</label>
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              rows={8}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-gray-500 focus:border-violet-500 focus:outline-none resize-none"
              placeholder='{ "pageBg": "#1a0a0a", "headingColor": "#fbbf24" }'
            />
            <p className="text-xs text-gray-500 mt-1">JSON config matching TEMPLATE_STYLES format</p>
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-violet-600 text-white py-3 rounded-xl font-medium hover:from-rose-600 hover:to-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t('submitForReview')}
              </>
            )}
          </button>
        </form>

        {/* My Submissions */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">My Submissions</h2>

          {loadingSubs && (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              {tc('loading')}
            </div>
          )}

          {!loadingSubs && submissions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No submissions yet. Submit your first design above!
            </div>
          )}

          {!loadingSubs && submissions.length > 0 && (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between bg-gray-900/50 border border-gray-800 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {sub.preview_image_url ? (
                      <img src={sub.preview_image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{sub.name}</p>
                      <p className="text-xs text-gray-500">{sub.category} {sub.subcategory ? `/ ${sub.subcategory}` : ''}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[sub.status] || STATUS_COLORS.pending}`}>
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
