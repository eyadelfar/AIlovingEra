import { useState, useEffect, useRef } from 'react';
import useBookStore from '../../stores/bookStore';
import { downloadBookPdf } from '../../api/bookApi';
import LoadingSpinner from '../shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ViewerEditToolbar() {
  const isEditMode = useBookStore(s => s.isEditMode);
  const toggleEditMode = useBookStore(s => s.toggleEditMode);
  const undo = useBookStore(s => s.undo);
  const redo = useBookStore(s => s.redo);
  const editorHistory = useBookStore(s => s.editorHistory);
  const editorFuture = useBookStore(s => s.editorFuture);
  const commitEditorDraft = useBookStore(s => s.commitEditorDraft);
  const editorDirty = useBookStore(s => s.editorDirty);
  const useOriginalPhotos = useBookStore(s => s.useOriginalPhotos);
  const setUseOriginalPhotos = useBookStore(s => s.setUseOriginalPhotos);
  const blendPhotos = useBookStore(s => s.blendPhotos);
  const setBlendPhotos = useBookStore(s => s.setBlendPhotos);

  const bookDraft = useBookStore(s => s.bookDraft);
  const images = useBookStore(s => s.images);
  const selectedTemplate = useBookStore(s => s.selectedTemplate);
  const designScale = useBookStore(s => s.designScale);
  const photoAnalyses = useBookStore(s => s.photoAnalyses);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadElapsed, setDownloadElapsed] = useState(0);
  const downloadTimerRef = useRef(null);

  useEffect(() => {
    if (isDownloading) {
      setDownloadElapsed(0);
      downloadTimerRef.current = setInterval(() => {
        setDownloadElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(downloadTimerRef.current);
    }
    return () => clearInterval(downloadTimerRef.current);
  }, [isDownloading]);

  async function handleDownload() {
    if (isEditMode && editorDirty) commitEditorDraft();
    setIsDownloading(true);
    try {
      await downloadBookPdf({
        draft: bookDraft,
        images,
        templateSlug: selectedTemplate || bookDraft?.template_slug || 'romantic',
        designScale,
        photoAnalyses,
        filename: `${bookDraft?.title || 'memory-book'}.pdf`,
      });
      toast.success('PDF downloaded!');
    } catch (err) {
      toast.error(err.message || 'PDF download failed');
    } finally {
      setIsDownloading(false);
    }
  }

  function handleSave() {
    commitEditorDraft();
  }

  return (
    <div className="sticky top-[var(--navbar-h)] z-20 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={toggleEditMode}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            isEditMode
              ? 'border-violet-500 bg-violet-500/20 text-violet-300'
              : 'border-gray-700 text-gray-400 hover:border-gray-600'
          }`}
        >
          {isEditMode ? 'Editing' : 'Edit'}
        </button>

        {isEditMode && (
          <>
            <button
              onClick={undo}
              disabled={editorHistory.length === 0}
              className="px-2 py-1.5 rounded-lg text-xs text-gray-400 border border-gray-700 hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Undo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={editorFuture.length === 0}
              className="px-2 py-1.5 rounded-lg text-xs text-gray-400 border border-gray-700 hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Redo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={handleSave}
              disabled={!editorDirty}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-green-500/30 text-green-400 hover:bg-green-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Save
            </button>
          </>
        )}

        <div className="w-px h-5 bg-gray-700" />

        <button
          onClick={() => setUseOriginalPhotos(!useOriginalPhotos)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            useOriginalPhotos
              ? 'border-gray-500 bg-gray-500/10 text-gray-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {useOriginalPhotos ? 'Original' : 'Styled'}
        </button>

        <button
          onClick={() => setBlendPhotos(!blendPhotos)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            blendPhotos
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : 'border-gray-700 text-gray-500 hover:border-gray-600'
          }`}
        >
          {blendPhotos ? 'Blended' : 'No Blend'}
        </button>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-rose-500 to-violet-600 text-white hover:from-rose-600 hover:to-violet-700 disabled:opacity-50 transition-all flex items-center gap-1"
        >
          {isDownloading ? (
            <>
              <LoadingSpinner size="xs" />
              {downloadElapsed > 3 ? `${Math.floor(downloadElapsed / 60)}:${String(downloadElapsed % 60).padStart(2, '0')}` : 'Generating...'}
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
