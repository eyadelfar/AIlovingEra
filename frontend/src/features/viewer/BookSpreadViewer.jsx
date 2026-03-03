import { useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PageRenderer from './PageRenderer';
import EditablePageRenderer from './EditablePageRenderer';
import LockedPageOverlay from './LockedPageOverlay';
import { isPageLocked } from '../../lib/constants';
import useBookStore from '../../stores/bookStore';

export default function BookSpreadViewer({
  pages, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides,
  anniversaryCoverText, isEditMode, pageToSpreadMap, currentPage, onGoToPage,
}) {
  const { t } = useTranslation('viewer');
  const previewOnly = useBookStore(s => s.previewOnly);

  const spreads = useMemo(() => {
    if (!pages || pages.length === 0) return [];
    const result = [];
    result.push([{ page: pages[0], flatIdx: 0 }]);
    for (let i = 1; i < pages.length; i += 2) {
      if (i + 1 < pages.length) {
        result.push([{ page: pages[i], flatIdx: i }, { page: pages[i + 1], flatIdx: i + 1 }]);
      } else {
        result.push([{ page: pages[i], flatIdx: i }]);
      }
    }
    return result;
  }, [pages]);

  const totalSpreads = spreads.length;

  // Derive spreadIndex directly from currentPage (no local state sync lag)
  const spreadIndex = useMemo(() => {
    if (currentPage == null || totalSpreads === 0) return 0;
    const targetSpread = currentPage === 0 ? 0 : Math.ceil(currentPage / 2);
    return Math.min(targetSpread, totalSpreads - 1);
  }, [currentPage, totalSpreads]);

  const currentSpread = spreads[spreadIndex] || [];

  const goNext = useCallback(() => {
    const next = Math.min(spreadIndex + 1, totalSpreads - 1);
    const firstPageIdx = spreads[next]?.[0]?.flatIdx;
    if (firstPageIdx != null && onGoToPage) onGoToPage(firstPageIdx);
  }, [spreadIndex, totalSpreads, spreads, onGoToPage]);

  const goPrev = useCallback(() => {
    const prev = Math.max(spreadIndex - 1, 0);
    const firstPageIdx = spreads[prev]?.[0]?.flatIdx;
    if (firstPageIdx != null && onGoToPage) onGoToPage(firstPageIdx);
  }, [spreadIndex, spreads, onGoToPage]);

  useEffect(() => {
    function handleKeyDown(e) {
      const rtl = document.documentElement.dir === 'rtl';
      if (e.key === 'ArrowLeft') rtl ? goNext() : goPrev();
      else if (e.key === 'ArrowRight') rtl ? goPrev() : goNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  if (totalSpreads === 0) return null;
  const isSinglePage = currentSpread.length === 1;

  return (
    <div>
      <div className={`mx-auto ${isSinglePage ? 'max-w-md' : 'max-w-3xl'}`}>
        <div className={`grid ${isSinglePage ? 'grid-cols-1' : 'grid-cols-2'} gap-1 bg-gray-950 rounded-xl p-1 shadow-2xl`}>
          {currentSpread.map(({ page, flatIdx }, i) => {
            const mapping = pageToSpreadMap?.[flatIdx];
            const Renderer = isEditMode ? EditablePageRenderer : PageRenderer;
            const locked = isPageLocked(flatIdx, previewOnly);

            return (
              <div key={`${spreadIndex}-${i}`} className={`relative ${isEditMode ? 'overflow-visible' : 'overflow-hidden'} rounded-lg`}>
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
                {locked && <LockedPageOverlay totalPages={pages.length} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <button onClick={goPrev} disabled={spreadIndex === 0} aria-label={t('previousSpread')}
          className="p-2 rounded-lg text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rtl:scale-x-[-1]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <span className="text-sm text-gray-500">{t('spreadOf', { current: spreadIndex + 1, total: totalSpreads })}</span>
        <button onClick={goNext} disabled={spreadIndex >= totalSpreads - 1} aria-label={t('nextSpread')}
          className="p-2 rounded-lg text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rtl:scale-x-[-1]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
