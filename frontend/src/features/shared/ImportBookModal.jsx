import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import BaseModal from './BaseModal';
import LoadingSpinner from './LoadingSpinner';
import useBookStore from '../../stores/bookStore';
import { validateExport, deserializeImages, buildHydratePayload } from '../../lib/bookImport';
import { extractBookData } from '../../lib/bookContainerIO';

export default function ImportBookModal({ onClose }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('idle'); // idle | extracting | processing | error
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const bookDraft = useBookStore(s => s.bookDraft);
  const hydrateFromExport = useBookStore(s => s.hydrateFromExport);

  const processFile = useCallback(async (file) => {
    // Overwrite guard
    if (bookDraft) {
      const ok = window.confirm(t('overwriteConfirm'));
      if (!ok) return;
    }

    setError('');

    try {
      const ext = (file.name || '').split('.').pop()?.toLowerCase();
      const isJson = ext === 'json' || file.type === 'application/json';

      let data;
      if (isJson) {
        setPhase('processing');
        // Direct JSON file
        const text = await file.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(t('invalidJsonFile'));
        }
      } else {
        // Video/PDF — extract embedded book data
        setPhase('extracting');
        const jsonString = await extractBookData(file);
        if (!jsonString) {
          throw new Error(t('viewer:noBookDataFound') || 'No embedded book data found in this file');
        }
        try {
          data = JSON.parse(jsonString);
        } catch {
          throw new Error(t('viewer:corruptBookData') || 'Embedded book data is corrupted');
        }
        setPhase('processing');
      }

      const validation = validateExport(data);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Deserialize images with progress
      const images = deserializeImages(data.images, ({ current, total }) => {
        setProgress({ current, total });
      });

      // Build the hydration payload
      const payload = buildHydratePayload(data, images);

      // Hydrate the store
      hydrateFromExport(payload);

      // Success
      const title = data.meta?.title || data.generation?.bookDraft?.title || 'book';
      toast.success(t('importedTitle', { title }));
      onClose();
      navigate('/book/view');
    } catch (err) {
      setPhase('error');
      setError(err.message || t('importFailed'));
    }
  }, [bookDraft, hydrateFromExport, onClose, navigate]);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleRetry() {
    setPhase('idle');
    setError('');
    setProgress({ current: 0, total: 0 });
  }

  // Don't allow closing during processing/extracting
  const handleClose = (phase === 'processing' || phase === 'extracting') ? () => {} : onClose;

  return (
    <BaseModal title={t('importBook')} onClose={handleClose} size="md">
      {phase === 'idle' && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-violet-400 bg-violet-500/10'
              : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-gray-300 font-medium mb-1">{t('dropFileHere')}</p>
          <p className="text-gray-500 text-sm">{t('orClickToBrowse')}</p>
          <p className="text-gray-600 text-xs mt-1">{t('viewer:importSupported') || '.json, .webm, .mp4, .pdf'}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.webm,.mp4,.pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {phase === 'extracting' && (
        <div className="py-8 text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4 text-violet-400" />
          <p className="text-gray-300 font-medium mb-2">{t('viewer:extractingBookData') || 'Extracting book data...'}</p>
        </div>
      )}

      {phase === 'processing' && (
        <div className="py-8 text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4 text-violet-400" />
          <p className="text-gray-300 font-medium mb-2">{t('importingBook')}</p>
          {progress.total > 0 && (
            <>
              <div className="w-full bg-gray-800 rounded-full h-2 mb-2 max-w-xs mx-auto">
                <div
                  className="bg-violet-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-gray-500 text-sm">{t('loadingImages', { current: progress.current, total: progress.total })}</p>
            </>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div className="py-6 text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600 transition-all"
          >
            {t('retry')}
          </button>
        </div>
      )}
    </BaseModal>
  );
}
