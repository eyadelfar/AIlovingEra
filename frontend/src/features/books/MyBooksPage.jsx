import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Trash2, Eye, Plus, Image, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { listDrafts, getDraft, deleteDraft } from '../../api/draftsApi';
import useBookStore from '../../stores/bookStore';

export default function MyBooksPage() {
  const { t } = useTranslation('pages');
  const navigate = useNavigate();
  const hydrateFromExport = useBookStore((s) => s.hydrateFromExport);

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadDrafts();
  }, []);

  async function loadDrafts() {
    try {
      const res = await listDrafts();
      const data = await res.json();
      setDrafts(data.drafts ?? data ?? []);
    } catch {
      // API might not be configured
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleView(id) {
    try {
      const res = await getDraft(id);
      const data = await res.json();
      hydrateFromExport(data);
      navigate('/book/view');
    } catch {
      toast.error('Failed to load book');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t('myBooksDeleteConfirm'))) return;
    setDeleting(id);
    try {
      await deleteDraft(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success(t('myBooksDeleted'));
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(null);
    }
  }

  function relativeDate(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">
            {t('myBooksTitle')}
          </h1>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto">{t('myBooksSubtitle')}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : drafts.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-6">{t('myBooksEmpty')}</p>
            <button
              onClick={() => navigate('/create')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-violet-600 text-white px-6 py-3 rounded-xl font-medium hover:from-rose-600 hover:to-violet-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              {t('myBooksStartCreating')}
            </button>
          </div>
        ) : (
          /* Drafts grid */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors"
              >
                <div className="p-5">
                  <h3 className="text-white font-medium truncate mb-1">
                    {draft.title || 'Untitled Book'}
                  </h3>

                  {draft.template && (
                    <span className="inline-block text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full mb-3">
                      {draft.template}
                    </span>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    {draft.photo_count != null && (
                      <span className="flex items-center gap-1">
                        <Image className="w-3.5 h-3.5" />
                        {draft.photo_count} {t('myBooksPhotos')}
                      </span>
                    )}
                    {draft.page_count != null && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {draft.page_count} {t('myBooksPages')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 mb-4">
                    {relativeDate(draft.updated_at || draft.created_at)}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleView(draft.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      {t('myBooksView')}
                    </button>
                    <button
                      onClick={() => handleDelete(draft.id)}
                      disabled={deleting === draft.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
