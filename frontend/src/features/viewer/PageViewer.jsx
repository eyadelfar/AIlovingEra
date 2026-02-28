import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageRenderer from './PageRenderer';
import EditablePageRenderer from './EditablePageRenderer';
import ViewerControls from './ViewerControls';
import { pageSlide, pageTransition } from '../../lib/animations';

export default function PageViewer({
  pages, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides,
  currentPage, onPrev, onNext, onGoToPage, anniversaryCoverText,
  isEditMode, pageToSpreadMap,
}) {
  const page = pages[currentPage];
  const prevPageRef = useRef(currentPage);
  const thumbStripRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext]);

  const direction = currentPage > prevPageRef.current ? 1 : -1;
  prevPageRef.current = currentPage;

  useEffect(() => {
    if (!thumbStripRef.current) return;
    const thumb = thumbStripRef.current.children[currentPage];
    if (thumb) {
      thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentPage]);

  const mapping = pageToSpreadMap?.[currentPage];
  const Renderer = isEditMode && mapping ? EditablePageRenderer : PageRenderer;
  const extraProps = isEditMode && mapping
    ? { isEditMode: true, chapterIdx: mapping.chapterIdx, spreadIdx: mapping.spreadIdx }
    : {};

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
          >
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
        <div className="mt-4 overflow-x-auto pb-2">
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

              return (
                <button
                  key={idx}
                  onClick={() => onGoToPage ? onGoToPage(idx) : null}
                  className={`flex-shrink-0 w-10 h-14 sm:w-12 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    isActive
                      ? 'border-violet-500 shadow-lg shadow-violet-500/20 scale-105'
                      : 'border-gray-700/50 hover:border-gray-500 opacity-60 hover:opacity-100'
                  }`}
                  title={`Page ${idx + 1}`}
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <span className="text-[8px] text-gray-500">{idx + 1}</span>
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
