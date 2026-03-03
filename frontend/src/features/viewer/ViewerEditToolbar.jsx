import { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { useTranslation } from 'react-i18next';
import useBookStore from '../../stores/bookStore';
import { downloadBookPdf } from '../../api/bookApi';
import { exportBook, downloadBookExport } from '../../lib/bookExport';
import LoadingSpinner from '../shared/LoadingSpinner';
import BaseModal from '../shared/BaseModal';
import { AboutYouSection, BookFormatSection, ExtrasSection } from '../wizard/SetupSections';
import toast from 'react-hot-toast';

const THEMES = [
  { value: 'romantic', labelKey: 'themeRomantic', dot: 'bg-rose-500' },
  { value: 'vintage', labelKey: 'themeVintage', dot: 'bg-amber-500' },
  { value: 'elegant', labelKey: 'themeElegant', dot: 'bg-slate-400' },
  { value: 'meme_funny', labelKey: 'themePlayful', dot: 'bg-violet-500' },
  { value: 'cinematic', labelKey: 'themeCinematic', dot: 'bg-amber-600' },
  { value: 'minimal', labelKey: 'themeMinimal', dot: 'bg-stone-400' },
  { value: 'custom', labelKey: 'themeCustom', dot: 'bg-gradient-to-r from-rose-500 to-violet-500' },
];

const CUSTOM_FIELDS = [
  { key: 'pageBgColor', labelKey: 'customBackground' },
  { key: 'headingColor', labelKey: 'customHeading' },
  { key: 'bodyColor', labelKey: 'customBody' },
  { key: 'accentColor', labelKey: 'customAccent' },
];

export default function ViewerEditToolbar() {
  const { t } = useTranslation('viewer');
  const actions = useBookStore(
    useShallow(s => ({
      toggleEditMode: s.toggleEditMode,
      undo: s.undo,
      redo: s.redo,
      commitEditorDraft: s.commitEditorDraft,
      setUseOriginalPhotos: s.setUseOriginalPhotos,
      setBlendPhotos: s.setBlendPhotos,
      setTemplate: s.setTemplate,
      setCustomTheme: s.setCustomTheme,
      setTemplateWithHistory: s.setTemplateWithHistory,
      setCustomThemeWithHistory: s.setCustomThemeWithHistory,
    })),
  );
  const state = useBookStore(
    useShallow(s => ({
      isEditMode: s.isEditMode,
      editorHistoryLen: s.editorHistory.length,
      editorFutureLen: s.editorFuture.length,
      editorDirty: s.editorDirty,
      useOriginalPhotos: s.useOriginalPhotos,
      blendPhotos: s.blendPhotos,
      bookDraft: s.bookDraft,
      images: s.images,
      selectedTemplate: s.selectedTemplate,
      designScale: s.designScale,
      customPageSize: s.customPageSize,
      photoAnalyses: s.photoAnalyses,
      previewOnly: s.previewOnly,
      customTheme: s.customTheme,
      cropOverrides: s.cropOverrides,
      filterOverrides: s.filterOverrides,
      textStyleOverrides: s.textStyleOverrides,
      positionOffsets: s.positionOffsets,
      blendOverrides: s.blendOverrides,
      sizeOverrides: s.sizeOverrides,
      getCommittedOverrides: s.getCommittedOverrides,
    })),
  );
  const {
    toggleEditMode, undo, redo, commitEditorDraft,
    setUseOriginalPhotos, setBlendPhotos, setTemplate, setCustomTheme,
    setTemplateWithHistory, setCustomThemeWithHistory,
  } = actions;
  const {
    isEditMode, editorHistoryLen, editorFutureLen, editorDirty,
    useOriginalPhotos, blendPhotos, previewOnly, bookDraft, images, selectedTemplate,
    designScale, customPageSize, photoAnalyses, customTheme,
    cropOverrides, filterOverrides, textStyleOverrides, positionOffsets, blendOverrides,
    sizeOverrides, getCommittedOverrides,
  } = state;
  const setupState = useBookStore(
    useShallow(s => ({
      partnerNames: s.partnerNames,
      occasion: s.occasion,
      vibe: s.vibe,
      imageDensity: s.imageDensity,
      addOns: s.addOns,
      includeQuotes: s.includeQuotes,
    })),
  );
  const setupActions = useBookStore(
    useShallow(s => ({
      setPartnerNames: s.setPartnerNames,
      setOccasion: s.setOccasion,
      setVibe: s.setVibe,
      setDesignScale: s.setDesignScale,
      setImageDensity: s.setImageDensity,
      setAddOn: s.setAddOn,
      setIncludeQuotes: s.setIncludeQuotes,
    })),
  );
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const themePickerRef = useRef(null);

  const activeTheme = selectedTemplate || bookDraft?.template_slug || 'romantic';

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadElapsed, setDownloadElapsed] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadEta, setDownloadEta] = useState(null);
  const downloadTimerRef = useRef(null);
  const downloadAbortRef = useRef(null);

  // Close theme picker on click outside
  useEffect(() => {
    if (!showThemePicker) return;
    function handleClick(e) {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target)) {
        setShowThemePicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showThemePicker]);

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
    // Get current overrides (computed on-demand, not stored)
    const overrides = getCommittedOverrides();
    const pdfCropOverrides = overrides.cropOverrides;
    const pdfFilterOverrides = overrides.filterOverrides;
    const pdfTextStyleOverrides = overrides.textStyleOverrides;
    const pdfPositionOffsets = overrides.positionOffsets;
    const pdfBlendOverrides = overrides.blendOverrides;
    const pdfSizeOverrides = overrides.sizeOverrides;

    const controller = new AbortController();
    downloadAbortRef.current = controller;
    setIsDownloading(true);
    setDownloadStage(t('downloadCompressingImages'));
    setDownloadProgress(0);
    setDownloadEta(null);
    try {
      await downloadBookPdf({
        draft: bookDraft,
        images,
        templateSlug: selectedTemplate || bookDraft?.template_slug || 'romantic',
        designScale,
        customPageSize,
        photoAnalyses,
        filename: `${bookDraft?.title || 'memory-book'}.pdf`,
        cropOverrides: pdfCropOverrides,
        filterOverrides: pdfFilterOverrides,
        textStyleOverrides: pdfTextStyleOverrides,
        positionOffsets: pdfPositionOffsets,
        blendOverrides: pdfBlendOverrides,
        sizeOverrides: pdfSizeOverrides,
        signal: controller.signal,
        onProgress: ({ stage, current, total, message, progress, estimated_remaining_ms }) => {
          // Use detailed message from backend if available
          if (message) {
            setDownloadStage(message);
          } else if (stage === 'compressing') {
            setDownloadStage(t('downloadCompressingProgress', { current, total }));
          } else if (stage === 'encoding') {
            setDownloadStage(t('downloadEncodingProgress', { current, total }));
          } else if (stage === 'rendering') {
            setDownloadStage(t('downloadRenderingProgress', { current, total }));
          } else if (stage === 'assembling') {
            setDownloadStage(t('downloadAssemblingDocument') || 'Assembling document...');
          } else if (stage === 'printing') {
            setDownloadStage(t('downloadGeneratingPdf'));
          } else if (stage === 'finalizing') {
            setDownloadStage(message || t('downloadFinalizing') || 'Finalizing...');
          }
          if (typeof progress === 'number') setDownloadProgress(progress);
          if (typeof estimated_remaining_ms === 'number') setDownloadEta(estimated_remaining_ms);
        },
      });
      toast.success(t('pdfDownloaded'));
    } catch (err) {
      if (controller.signal.aborted) {
        toast(t('pdfDownloadCancelled'), { icon: '\u2716' });
      } else {
        toast.error(err.message || t('pdfDownloadFailed'));
      }
    } finally {
      setIsDownloading(false);
      setDownloadStage('');
      setDownloadProgress(0);
      setDownloadEta(null);
      downloadAbortRef.current = null;
    }
  }

  function handleCancelDownload() {
    downloadAbortRef.current?.abort();
  }

  const [isSaving, setIsSaving] = useState(false);
  const [saveStage, setSaveStage] = useState('');

  async function handleSaveProject() {
    setIsSaving(true);
    setSaveStage(t('saveProjectPreparing'));
    try {
      if (isEditMode && editorDirty) commitEditorDraft();
      const json = await exportBook(({ stage, current, total }) => {
        if (stage === 'compressing') setSaveStage(t('saveProjectCompressing', { current, total }));
      });
      downloadBookExport(json, bookDraft?.title);
      toast.success(t('bookSaved'));
    } catch (err) {
      toast.error(err.message || t('saveFailed'));
    } finally {
      setIsSaving(false);
      setSaveStage('');
    }
  }

  const addPhotoRef = useRef(null);

  function handleAddPhoto(e) {
    const files = Array.from(e.target.files || []);
    const addImageToBook = useBookStore.getState().addImageToBook;
    files.forEach(file => addImageToBook(file));
    e.target.value = '';
    toast.success(files.length !== 1 ? t('addedPhotosPlural', { count: files.length }) : t('addedPhotos', { count: files.length }));
  }

  function handleSave() {
    commitEditorDraft();
    toast.success(t('changesSaved'));
  }

  return (
    <div className="sticky top-[var(--navbar-h)] z-30 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={toggleEditMode}
          disabled={previewOnly}
          title={previewOnly ? t('unlockToEdit') : undefined}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            previewOnly
              ? 'border-gray-700 text-gray-600 cursor-not-allowed opacity-50'
              : isEditMode
                ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                : 'border-gray-700 text-gray-400 hover:border-gray-600'
          }`}
        >
          {isEditMode ? t('editing') : t('edit')}
        </button>

        {isEditMode && (
          <>
            <button
              onClick={undo}
              disabled={editorHistoryLen === 0}
              className="px-2 py-1.5 rounded-lg text-xs text-gray-400 border border-gray-700 hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title={t('undo')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={editorFutureLen === 0}
              className="px-2 py-1.5 rounded-lg text-xs text-gray-400 border border-gray-700 hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title={t('redo')}
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
              {t('save')}
            </button>
            <button
              onClick={() => addPhotoRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all flex items-center gap-1"
              title={t('addPhotosToBook')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('photo')}
            </button>
            <input ref={addPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhoto} />
            <button
              onClick={() => setShowSettings(true)}
              className="px-2 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-all"
              title={t('settings') || 'Settings'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
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
          {useOriginalPhotos ? t('original') : t('styled')}
        </button>

        <button
          onClick={() => setBlendPhotos(!blendPhotos)}
          title={blendPhotos ? t('disablePhotoBlending') : t('blendPhotosIntoPage')}
          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            blendPhotos
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : 'border-gray-700 text-gray-500 hover:border-gray-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </button>

        {isEditMode && (
          <div ref={themePickerRef} className="relative">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              title={t('changeTheme')}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${
                showThemePicker
                  ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
              </svg>
              {t('theme')}
            </button>
            {showThemePicker && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl p-2 shadow-2xl shadow-black/50 min-w-[140px]">
                {THEMES.map(theme => (
                  <button
                    key={theme.value}
                    onClick={() => {
                      if (isEditMode) {
                        setTemplateWithHistory(theme.value);
                      } else {
                        setTemplate(theme.value);
                      }
                      if (theme.value === 'custom') {
                        setShowCustomPanel(true);
                      } else {
                        setShowThemePicker(false);
                        setShowCustomPanel(false);
                      }
                      toast.success(t('themeApplied', { name: t(theme.labelKey) }));
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      activeTheme === theme.value
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                    {t(theme.labelKey)}
                    {activeTheme === theme.value && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}

                {showCustomPanel && activeTheme === 'custom' && (
                  <div className="border-t border-gray-700 mt-2 pt-2 space-y-2">
                    {CUSTOM_FIELDS.map(f => (
                      <div key={f.key} className="flex items-center gap-2 px-2">
                        <span className="text-[10px] text-gray-500 w-16">{t(f.labelKey)}</span>
                        <input
                          type="color"
                          value={customTheme[f.key] || '#ffffff'}
                          onChange={(e) => {
                            if (isEditMode) {
                              setCustomThemeWithHistory({ [f.key]: e.target.value });
                            } else {
                              setCustomTheme({ [f.key]: e.target.value });
                            }
                          }}
                          className="w-6 h-6 rounded border border-gray-600 cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch-wrapper]:p-0.5"
                        />
                        <span className="text-[9px] text-gray-600 font-mono">{customTheme[f.key]}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => { setShowThemePicker(false); setShowCustomPanel(false); }}
                      className="w-full text-center text-[10px] text-violet-400 hover:text-violet-300 py-1"
                    >
                      {t('done')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSaveProject}
          disabled={isSaving || previewOnly}
          title={previewOnly ? t('unlockToDownload') : undefined}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${
            previewOnly
              ? 'border-gray-700 text-gray-600 cursor-not-allowed opacity-50'
              : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50'
          }`}
        >
          {isSaving ? (
            <><LoadingSpinner size="xs" />{saveStage}</>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {t('save')}
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          disabled={isDownloading || previewOnly}
          title={previewOnly ? t('unlockToDownload') : undefined}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
            previewOnly
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-rose-500 to-violet-600 text-white hover:from-rose-600 hover:to-violet-700 disabled:opacity-50'
          }`}
        >
          {isDownloading ? (
            <>
              <LoadingSpinner size="xs" />
              {downloadStage || (downloadElapsed > 3 ? `${Math.floor(downloadElapsed / 60)}:${String(downloadElapsed % 60).padStart(2, '0')}` : t('generating'))}
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {t('pdf')}
            </>
          )}
        </button>

        {isDownloading && (
          <>
            {/* Progress bar */}
            {downloadProgress > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-mono tabular-nums">
                  {Math.round(downloadProgress)}%
                </span>
                {downloadEta != null && downloadEta > 0 && (
                  <span className="text-[10px] text-gray-600">
                    ~{Math.ceil(downloadEta / 1000)}s
                  </span>
                )}
              </div>
            )}
            <button
              onClick={handleCancelDownload}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all"
            >
              {t('cancel')}
            </button>
          </>
        )}
      </div>

      {showSettings && (
        <BaseModal title={t('bookSettings') || 'Book Settings'} onClose={() => setShowSettings(false)} size="lg" scrollable>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">{t('aboutYou') || 'About You'}</h4>
              <AboutYouSection
                partnerNames={setupState.partnerNames}
                setPartnerNames={setupActions.setPartnerNames}
                occasion={setupState.occasion}
                setOccasion={setupActions.setOccasion}
                vibe={setupState.vibe}
                setVibe={setupActions.setVibe}
                compact
              />
            </div>
            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">{t('bookFormat') || 'Book Format'}</h4>
              <BookFormatSection
                designScale={designScale}
                setDesignScale={setupActions.setDesignScale}
                imageDensity={setupState.imageDensity}
                setImageDensity={setupActions.setImageDensity}
                compact
              />
            </div>
            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">{t('extras') || 'Extras'}</h4>
              <ExtrasSection
                addOns={setupState.addOns}
                setAddOn={setupActions.setAddOn}
                includeQuotes={setupState.includeQuotes}
                setIncludeQuotes={setupActions.setIncludeQuotes}
              />
            </div>
            <div className="border-t border-gray-800 pt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowSettings(false);
                  toast.success(t('settingsUpdated') || 'Settings updated');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 transition-all"
              >
                {t('done') || 'Done'}
              </button>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
}
