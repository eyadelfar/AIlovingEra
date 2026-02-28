import { useRef, useState, useEffect } from 'react';
import PageRenderer from './PageRenderer';
import GridDragOverlay from './GridDragOverlay';

const NATURAL_WIDTH = 400;

export default function GridPageThumbnail({
  page, pageIndex, images, templateSlug, photoAnalyses,
  cropOverrides, filterOverrides, anniversaryCoverText,
  spreadMapping, isEditMode, activeDragId,
}) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setScale(w / NATURAL_WIDTH);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isEditable = isEditMode && spreadMapping;

  return (
    <div className="relative group/thumb">
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
        <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-full border border-gray-700">
          {pageIndex + 1}
        </span>
      </div>

      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-lg border transition-colors ${
          isEditable
            ? 'border-gray-700 hover:border-violet-500/50'
            : 'border-gray-800 hover:border-gray-600'
        }`}
        style={{ aspectRatio: '3 / 4' }}
      >
        <div
          className="pointer-events-none origin-top-left"
          style={{
            width: `${NATURAL_WIDTH}px`,
            transform: `scale(${scale})`,
            willChange: 'transform',
          }}
        >
          <PageRenderer
            page={page}
            images={images}
            templateSlug={templateSlug}
            photoAnalyses={photoAnalyses}
            cropOverrides={cropOverrides}
            filterOverrides={filterOverrides}
            anniversaryCoverText={anniversaryCoverText}
          />
        </div>

        {isEditable && (
          <GridDragOverlay
            page={page}
            chapterIdx={spreadMapping.chapterIdx}
            spreadIdx={spreadMapping.spreadIdx}
            images={images}
            activeDragId={activeDragId}
          />
        )}
      </div>

      {page.page_type === 'cover' && (
        <div className="text-center mt-1">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider">Cover</span>
        </div>
      )}
      {page.page_type === 'back_cover' && (
        <div className="text-center mt-1">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider">Back</span>
        </div>
      )}
    </div>
  );
}
