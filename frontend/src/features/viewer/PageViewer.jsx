import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import PageRenderer from './PageRenderer';
import EditablePageRenderer from './EditablePageRenderer';
import ViewerControls from './ViewerControls';
import LockedPageOverlay from './LockedPageOverlay';
import { pageSlide, pageTransition } from '../../lib/animations';
import { isPageLocked } from '../../lib/constants';
import useBookStore from '../../stores/bookStore';
import log from '../../lib/editorLogger';

export default function PageViewer({
  pages, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides,
  currentPage, onPrev, onNext, onGoToPage, anniversaryCoverText,
  isEditMode, pageToSpreadMap,
}) {
  const { t } = useTranslation('viewer');
  const previewOnly = useBookStore(s => s.previewOnly);
  const page = pages[currentPage];
  const locked = isPageLocked(currentPage, previewOnly);
  const prevPageRef = useRef(currentPage);
  const thumbStripRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      const rtl = document.documentElement.dir === 'rtl';
      if (e.key === 'ArrowLeft') rtl ? onNext() : onPrev();
      else if (e.key === 'ArrowRight') rtl ? onPrev() : onNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext]);

  const direction = currentPage > prevPageRef.current ? 1 : -1;
  useEffect(() => { prevPageRef.current = currentPage; }, [currentPage]);

  useEffect(() => {
    if (!thumbStripRef.current) return;
    const thumb = thumbStripRef.current.children[currentPage];
    if (thumb) {
      thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentPage]);

  const mapping = pageToSpreadMap?.[currentPage];
  log.action('nav', 'pageView', { page: currentPage, pageType: page?.page_type, chapterIdx: mapping?.chapterIdx, spreadIdx: mapping?.spreadIdx });
  const Renderer = isEditMode ? EditablePageRenderer : PageRenderer;
  const extraProps = isEditMode
    ? { isEditMode: true, chapterIdx: mapping?.chapterIdx, spreadIdx: mapping?.spreadIdx }
    : { chapterIdx: mapping?.chapterIdx, spreadIdx: mapping?.spreadIdx };

  return (
    <div>
      <div className="max-w-sm sm:max-w-md mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={pageSlide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={pageTransition}
            className="relative"
          >
            <div className={locked ? 'blur-md pointer-events-none select-none' : ''}>
              <Renderer
                page={page}
                images={images}
                templateSlug={templateSlug}
                photoAnalyses={photoAnalyses}
                cropOverrides={cropOverrides}
                filterOverrides={filterOverrides}
                anniversaryCoverText={page.page_type === 'cover' ? anniversaryCoverText : undefined}
                {...extraProps}
              />
            </div>
            {locked && <LockedPageOverlay totalPages={pages.length} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <ViewerControls
        currentPage={currentPage}
        totalPages={pages.length}
        onPrev={onPrev}
        onNext={onNext}
      />

      {pages.length > 1 && (
        <div className="mt-4 overflow-x-auto pb-2 scrollbar-none">
          <div
            ref={thumbStripRef}
            className="flex gap-2 justify-center min-w-min px-4"
          >
            {pages.map((p, idx) => {
              const firstPhotoIdx = p.photo_indices?.[0];
              const thumb = firstPhotoIdx != null && images[firstPhotoIdx]
                ? images[firstPhotoIdx].previewUrl
                : null;
              const isActive = idx === currentPage;
              const thumbLocked = isPageLocked(idx, previewOnly);
              const textExcerpt = !thumb && (p.heading_text || p.quote_text || p.body_text || '');

              return (
                <button
                  key={idx}
                  onClick={() => onGoToPage ? onGoToPage(idx) : null}
                  className={`relative flex-shrink-0 w-10 h-14 sm:w-12 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    isActive
                      ? 'border-violet-500 shadow-lg shadow-violet-500/20 scale-105'
                      : 'border-gray-700/50 hover:border-gray-500 opacity-60 hover:opacity-100'
                  }`}
                  title={thumbLocked ? t('lockedPage') : t('pageNumber', { number: idx + 1 })}
                >
                  <div className={thumbLocked ? 'blur-sm' : ''}>
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : textExcerpt ? (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center p-1">
                        <span className="text-[6px] text-gray-400 leading-tight line-clamp-3 text-center">{textExcerpt.slice(0, 40)}</span>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <span className="text-[8px] text-gray-500">{idx + 1}</span>
                      </div>
                    )}
                  </div>
                  {thumbLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-950/40">
                      <Lock className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
