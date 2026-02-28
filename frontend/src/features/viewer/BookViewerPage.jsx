import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useBookStore from '../../stores/bookStore';
import { buildPageToSpreadMap } from '../../lib/gridUtils';
import PageViewer from './PageViewer';
import BookSpreadViewer from './BookSpreadViewer';
import PageGridView from './PageGridView';
import LoveLetterPage from './LoveLetterPage';
import MiniReelStoryboard from './MiniReelStoryboard';
import ViewerEditToolbar from './ViewerEditToolbar';
import { EditModeProvider } from './EditModeContext';

export default function BookViewerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookDraft = useBookStore(s => s.bookDraft);
  const editorDraft = useBookStore(s => s.editorDraft);
  const images = useBookStore(s => s.images);
  const selectedTemplate = useBookStore(s => s.selectedTemplate);
  const templateSlug = selectedTemplate || bookDraft?.template_slug || 'romantic';
  const photoAnalyses = useBookStore(s => s.photoAnalyses);
  const cropOverrides = useBookStore(s => s.cropOverrides);
  const filterOverrides = useBookStore(s => s.filterOverrides);
  const currentPage = useBookStore(s => s.currentPage);
  const setCurrentPage = useBookStore(s => s.setCurrentPage);
  const nextPage = useBookStore(s => s.nextPage);
  const prevPage = useBookStore(s => s.prevPage);
  const reset = useBookStore(s => s.reset);
  const isEditMode = useBookStore(s => s.isEditMode);
  const setEditMode = useBookStore(s => s.setEditMode);
  const initEditor = useBookStore(s => s.initEditor);
  const viewMode = useBookStore(s => s.viewMode);
  const setViewMode = useBookStore(s => s.setViewMode);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('single');
    }
  }, [setViewMode]);

  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setEditMode(true);
      if (!editorDraft && bookDraft) initEditor();
    }
  }, [searchParams, bookDraft, setEditMode, editorDraft, initEditor]);

  useEffect(() => {
    if (isEditMode && !editorDraft && bookDraft) {
      initEditor();
    }
  }, [isEditMode, editorDraft, bookDraft, initEditor]);

  useEffect(() => {
    if (!bookDraft) navigate('/create');
  }, [bookDraft, navigate]);

  if (!bookDraft) return null;

  const activeDraft = isEditMode && editorDraft ? editorDraft : bookDraft;

  const pageToSpreadMap = useMemo(
    () => buildPageToSpreadMap(activeDraft.chapters || []),
    [activeDraft.chapters],
  );

  function handleCreateAnother() {
    if (!window.confirm('Create a new book? Your current book will be lost.')) return;
    reset();
    navigate('/create');
  }

  const sharedProps = {
    pages: activeDraft.pages || [],
    images,
    templateSlug,
    photoAnalyses,
    cropOverrides,
    filterOverrides,
    anniversaryCoverText: activeDraft.anniversary_cover_text,
    isEditMode,
    pageToSpreadMap,
  };

  return (
    <EditModeProvider isEditMode={isEditMode}>
      <ViewerEditToolbar />

      <div className={`${viewMode === 'grid' ? 'max-w-7xl' : 'max-w-4xl'} mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12`}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{activeDraft.title}</h1>
          {activeDraft.subtitle && (
            <p className="text-gray-400 text-lg">{activeDraft.subtitle}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">{activeDraft.pages?.length || 0} pages</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {['single', 'spread', 'grid'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                viewMode === mode
                  ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                  : 'border-gray-700 text-gray-500 hover:border-gray-600'
              }`}
            >
              {mode === 'single' ? 'Single Page' : mode === 'spread' ? 'Book Spread' : 'Page Grid'}
            </button>
          ))}
        </div>

        {isEditMode && activeDraft.chapters?.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 mb-6 flex-wrap">
            {activeDraft.chapters.map((ch, i) => (
              <button
                key={i}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-700 text-gray-400 hover:border-violet-500/50 hover:text-violet-300 transition-all"
                title={ch.title}
              >
                {ch.title || `Ch ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {viewMode === 'grid' ? (
          <PageGridView {...sharedProps} />
        ) : viewMode === 'spread' ? (
          <BookSpreadViewer {...sharedProps} />
        ) : (
          <PageViewer
            {...sharedProps}
            currentPage={currentPage}
            onPrev={prevPage}
            onNext={nextPage}
            onGoToPage={setCurrentPage}
          />
        )}

        {activeDraft.love_letter_text && (
          <div className="mt-10 pt-8 border-t border-gray-800">
            <h2 className="text-xl font-semibold text-gray-200 mb-4 text-center flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              Love Letter
            </h2>
            <LoveLetterPage text={activeDraft.love_letter_text} templateSlug={templateSlug} />
          </div>
        )}

        {activeDraft.mini_reel_frames?.length > 0 && (
          <div className="mt-10 pt-8 border-t border-gray-800">
            <MiniReelStoryboard frames={activeDraft.mini_reel_frames} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <button
            onClick={handleCreateAnother}
            className="w-full sm:w-auto px-8 py-3 rounded-xl font-medium text-gray-300 border border-gray-700 hover:border-gray-500 hover:text-white transition-all"
          >
            Create Another Book
          </button>
        </div>
      </div>
    </EditModeProvider>
  );
}
