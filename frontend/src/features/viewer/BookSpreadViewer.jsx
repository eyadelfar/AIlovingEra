import { useMemo, useEffect, useCallback, useRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import HTMLFlipBook from 'react-pageflip';
import PageRenderer from './PageRenderer';
import EditablePageRenderer from './EditablePageRenderer';
import LockedPageOverlay from './LockedPageOverlay';
import { isPageLocked } from '../../lib/constants';
import useBookStore from '../../stores/bookStore';

/**
 * react-pageflip requires each page to be a forwardRef component.
 */
const FlipPage = forwardRef(function FlipPage({ children }, ref) {
  return (
    <div ref={ref} className="bg-gray-950">
      {children}
    </div>
  );
});

export default function BookSpreadViewer({
  pages, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides,
  anniversaryCoverText, isEditMode, pageToSpreadMap, currentPage, onGoToPage,
}) {
  const { t } = useTranslation('viewer');
  const previewOnly = useBookStore(s => s.previewOnly);
  const flipBookRef = useRef(null);
  const containerRef = useRef(null);

  // Compute page dimensions based on container width
  const pageWidth = 400;
  const pageHeight = 560;

  // Navigate to current page when it changes externally
  useEffect(() => {
    if (currentPage != null && flipBookRef.current) {
      const pageFlip = flipBookRef.current.pageFlip();
      if (pageFlip && pageFlip.getCurrentPageIndex() !== currentPage) {
        pageFlip.turnToPage(currentPage);
      }
    }
  }, [currentPage]);

  const goNext = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipNext();
  }, []);

  const goPrev = useCallback(() => {
    flipBookRef.current?.pageFlip()?.flipPrev();
  }, []);

  // Arrow key navigation
  useEffect(() => {
    function handleKeyDown(e) {
      const rtl = document.documentElement.dir === 'rtl';
      if (e.key === 'ArrowLeft') rtl ? goNext() : goPrev();
      else if (e.key === 'ArrowRight') rtl ? goPrev() : goNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  // Sync flip events back to parent
  const handleFlip = useCallback((e) => {
    if (onGoToPage) {
      onGoToPage(e.data);
    }
  }, [onGoToPage]);

  const totalPages = pages?.length || 0;
  const currentDisplayPage = currentPage != null ? currentPage + 1 : 1;

  if (!pages || totalPages === 0) return null;

  return (
    <div>
      <div ref={containerRef} className="mx-auto flex justify-center">
        <HTMLFlipBook
          ref={flipBookRef}
          width={pageWidth}
          height={pageHeight}
          size="stretch"
          minWidth={280}
          maxWidth={500}
          minHeight={400}
          maxHeight={700}
          drawShadow={true}
          flippingTime={800}
          showCover={true}
          maxShadowOpacity={0.4}
          mobileScrollSupport={true}
          clickEventForward={true}
          useMouseEvents={!isEditMode}
          swipeDistance={30}
          showPageCorners={!isEditMode}
          onFlip={handleFlip}
          className="shadow-2xl"
        >
          {pages.map((page, flatIdx) => {
            const mapping = pageToSpreadMap?.[flatIdx];
            const Renderer = isEditMode ? EditablePageRenderer : PageRenderer;
            const locked = isPageLocked(flatIdx, previewOnly);

            return (
              <FlipPage key={flatIdx}>
                <div className={`relative ${isEditMode ? 'overflow-visible' : 'overflow-hidden'} h-full`}>
                  <div className={locked ? 'blur-md pointer-events-none select-none' : ''}>
                    <Renderer
                      page={page} images={images} templateSlug={templateSlug}
                      photoAnalyses={photoAnalyses} cropOverrides={cropOverrides}
                      filterOverrides={filterOverrides}
                      anniversaryCoverText={page.page_type === 'cover' ? anniversaryCoverText : undefined}
                      isEditMode={isEditMode}
                      chapterIdx={mapping?.chapterIdx}
                      spreadIdx={mapping?.spreadIdx}
                    />
                  </div>
                  {locked && <LockedPageOverlay totalPages={totalPages} />}
                </div>
              </FlipPage>
            );
          })}
        </HTMLFlipBook>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <button onClick={goPrev} disabled={currentPage === 0} aria-label={t('previousSpread')}
          className="p-2 rounded-lg text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rtl:scale-x-[-1]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <span className="text-sm text-gray-500">{t('spreadOf', { current: currentDisplayPage, total: totalPages })}</span>
        <button onClick={goNext} disabled={currentPage >= totalPages - 1} aria-label={t('nextSpread')}
          className="p-2 rounded-lg text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rtl:scale-x-[-1]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
