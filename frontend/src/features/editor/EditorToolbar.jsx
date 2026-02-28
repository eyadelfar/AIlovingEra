import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useBookStore from '../../stores/bookStore';
import { downloadBookPdf } from '../../api/bookApi';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function EditorToolbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const editorHistory = useBookStore(s => s.editorHistory);
  const editorFuture = useBookStore(s => s.editorFuture);
  const editorDirty = useBookStore(s => s.editorDirty);
  const undo = useBookStore(s => s.undo);
  const redo = useBookStore(s => s.redo);
  const commitEditorDraft = useBookStore(s => s.commitEditorDraft);
  const bookDraft = useBookStore(s => s.bookDraft);
  const editorDraft = useBookStore(s => s.editorDraft);
  const images = useBookStore(s => s.images);
  const selectedTemplate = useBookStore(s => s.selectedTemplate);
  const designScale = useBookStore(s => s.designScale);

  const photoAnalyses = useBookStore(s => s.photoAnalyses);
  const useOriginalPhotos = useBookStore(s => s.useOriginalPhotos);
  const setUseOriginalPhotos = useBookStore(s => s.setUseOriginalPhotos);

  const [isDownloading, setIsDownloading] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef(null);

  useEffect(() => {
    if (!overflowOpen) return;
    function handleClick(e) {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [overflowOpen]);

  async function handleDownload() {
    commitEditorDraft();
    setIsDownloading(true);
    try {
      const draft = useBookStore.getState().bookDraft;
      await downloadBookPdf({
        draft,
        images,
        templateSlug: selectedTemplate,
        designScale,
        photoAnalyses,
        filename: `${draft?.title || 'memory-book'}.pdf`,
      });
    } catch (err) {
      toast.error(err.message || 'PDF download failed');
    } finally {
      setIsDownloading(false);
    }
  }

  function handlePreview() {
    commitEditorDraft();
    navigate('/book/view');
  }

  return (
    <div className="flex items-center justify-between px-3 md:px-4 py-2 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm gap-2">
      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
          title="Toggle chapters"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <button
          onClick={undo}
          disabled={editorHistory.length === 0}
          className="hidden md:flex p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Undo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={editorFuture.length === 0}
          className="hidden md:flex p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Redo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
          </svg>
        </button>
        {editorDirty ? (
          <div className="flex items-center gap-1.5 ml-1 md:ml-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-400 hidden sm:inline">Unsaved</span>
          </div>
        ) : editorHistory.length > 0 ? (
          <div className="flex items-center gap-1.5 ml-1 md:ml-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-400 hidden sm:inline">Saved</span>
          </div>
        ) : null}
        {editorHistory.length > 0 && (
          <span className="text-xs text-gray-600 ml-1 hidden sm:inline">({editorHistory.length} edits)</span>
        )}
      </div>

      <div className="flex items-center gap-4 min-w-0">
        <h2 className="text-sm font-medium text-gray-300 truncate max-w-[120px] sm:max-w-xs">
          {editorDraft?.title || 'Untitled Book'}
        </h2>
        {selectedTemplate && (
          <button
            onClick={() => setUseOriginalPhotos(!useOriginalPhotos)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all border ${
              useOriginalPhotos
                ? 'border-gray-600 text-gray-400 bg-gray-800/50'
                : 'border-violet-500/30 text-violet-300 bg-violet-500/10'
            }`}
            title={useOriginalPhotos ? 'Showing original photos' : 'Showing styled photos'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            {useOriginalPhotos ? 'Original' : 'Styled'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        {editorDirty && (
          <button
            onClick={() => { commitEditorDraft(); toast.success('Changes saved'); }}
            className="px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium text-emerald-300 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
            <span className="hidden sm:inline">Save</span>
          </button>
        )}

        <button
          onClick={handlePreview}
          className="hidden md:flex px-4 py-1.5 rounded-lg text-sm text-gray-300 border border-gray-700 hover:border-gray-500 hover:text-white transition-all"
        >
          Preview
        </button>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="hidden md:flex px-4 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-rose-500 to-violet-600 text-white hover:from-rose-600 hover:to-violet-700 disabled:opacity-50 transition-all items-center gap-1.5"
        >
          {isDownloading ? <LoadingSpinner size="sm" /> : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
          Download PDF
        </button>

        <div ref={overflowRef} className="relative md:hidden">
          <button
            onClick={() => setOverflowOpen(prev => !prev)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
            title="More actions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {overflowOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 py-1">
              <button
                onClick={() => { undo(); setOverflowOpen(false); }}
                disabled={editorHistory.length === 0}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
                </svg>
                Undo
              </button>
              <button
                onClick={() => { redo(); setOverflowOpen(false); }}
                disabled={editorFuture.length === 0}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
                </svg>
                Redo
              </button>
              {selectedTemplate && (
                <button
                  onClick={() => { setUseOriginalPhotos(!useOriginalPhotos); setOverflowOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  {useOriginalPhotos ? 'Use Styled Photos' : 'Use Original Photos'}
                </button>
              )}
              <div className="border-t border-gray-800 my-1" />
              <button
                onClick={() => { handlePreview(); setOverflowOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>
              <button
                onClick={() => { handleDownload(); setOverflowOpen(false); }}
                disabled={isDownloading}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-30 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
