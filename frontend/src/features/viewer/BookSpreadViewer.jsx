import { useState, useMemo, useEffect } from 'react';
import PageRenderer from './PageRenderer';
import EditablePageRenderer from './EditablePageRenderer';

export default function BookSpreadViewer({
  pages, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides,
  anniversaryCoverText, isEditMode, pageToSpreadMap,
}) {
  const [spreadIndex, setSpreadIndex] = useState(0);

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
  const currentSpread = spreads[spreadIndex] || [];

  function goNext() { setSpreadIndex(i => Math.min(i + 1, totalSpreads - 1)); }
  function goPrev() { setSpreadIndex(i => Math.max(i - 1, 0)); }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSpreads]);

  if (totalSpreads === 0) return null;
  const isSinglePage = currentSpread.length === 1;

  return (
    <div>
      <div className={`mx-auto ${isSinglePage ? 'max-w-md' : 'max-w-3xl'}`}>
        <div className={`grid ${isSinglePage ? 'grid-cols-1' : 'grid-cols-2'} gap-1 bg-gray-950 rounded-xl p-1 shadow-2xl`}>
          {currentSpread.map(({ page, flatIdx }, i) => {
            const mapping = pageToSpreadMap?.[flatIdx];
            const useEditable = isEditMode && mapping;

            return (
              <div key={`${spreadIndex}-${i}`} className="overflow-hidden rounded-lg">
                {useEditable ? (
                  <EditablePageRenderer
                    page={page} images={images} templateSlug={templateSlug}
                    photoAnalyses={photoAnalyses} cropOverrides={cropOverrides}
                    filterOverrides={filterOverrides}
                    anniversaryCoverText={page.page_type === 'cover' ? anniversaryCoverText : undefined}
                    isEditMode={true}
                    chapterIdx={mapping.chapterIdx}
                    spreadIdx={mapping.spreadIdx}
                  />
                ) : (
                  <PageRenderer
                    page={page} images={images} templateSlug={templateSlug}
                    photoAnalyses={photoAnalyses} cropOverrides={cropOverrides}
                    filterOverrides={filterOverrides}
                    anniversaryCoverText={page.page_type === 'cover' ? anniversaryCoverText : undefined}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <button onClick={goPrev} disabled={spreadIndex === 0} aria-label="Previous spread"
          className="p-2 rounded-lg text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <span className="text-sm text-gray-500">{spreadIndex + 1} / {totalSpreads}</span>
        <button onClick={goNext} disabled={spreadIndex >= totalSpreads - 1} aria-label="Next spread"
          className="p-2 rounded-lg text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
