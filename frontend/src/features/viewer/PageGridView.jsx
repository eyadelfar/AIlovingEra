import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import useBookStore from '../../stores/bookStore';
import { computeGridDimensions, buildPageToSpreadMap, parseDragId } from '../../lib/gridUtils';
import GridPageThumbnail from './GridPageThumbnail';
import DragOverlayContent from './DragOverlayContent';

export default function PageGridView({
  pages, images, templateSlug, photoAnalyses,
  cropOverrides, filterOverrides, anniversaryCoverText,
}) {
  const isEditMode = useBookStore(s => s.isEditMode);
  const editorDraft = useBookStore(s => s.editorDraft);
  const swapPhotoBetweenSpreads = useBookStore(s => s.swapPhotoBetweenSpreads);
  const swapTextBetweenSpreads = useBookStore(s => s.swapTextBetweenSpreads);

  const [activeDragId, setActiveDragId] = useState(null);

  const { cols } = computeGridDimensions(pages.length);
  const pageToSpread = useMemo(
    () => buildPageToSpreadMap(editorDraft?.chapters || []),
    [editorDraft],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Responsive column override
  const responsiveCols = typeof window !== 'undefined'
    ? window.innerWidth < 640
      ? Math.min(cols, 2)
      : window.innerWidth < 1024
        ? Math.min(cols, 3)
        : cols
    : cols;

  function handleDragEnd({ active, over }) {
    setActiveDragId(null);
    if (!over || active.id === over.id) return;

    const from = parseDragId(active.id);
    const to = parseDragId(over.id);

    if (from.type !== to.type) return;

    if (from.type === 'photo') {
      swapPhotoBetweenSpreads(
        from.chapterIdx, from.spreadIdx, parseInt(from.slot),
        to.chapterIdx, to.spreadIdx, parseInt(to.slot),
      );
    } else if (from.type === 'text') {
      swapTextBetweenSpreads(
        from.chapterIdx, from.spreadIdx, from.slot,
        to.chapterIdx, to.spreadIdx, to.slot,
      );
    }
  }

  const gridContent = (
    <div
      className="grid gap-4 sm:gap-5 pt-2"
      style={{ gridTemplateColumns: `repeat(${responsiveCols}, 1fr)` }}
    >
      {pages.map((page, idx) => (
        <GridPageThumbnail
          key={idx}
          page={page}
          pageIndex={idx}
          images={images}
          templateSlug={templateSlug}
          photoAnalyses={photoAnalyses}
          cropOverrides={cropOverrides}
          filterOverrides={filterOverrides}
          anniversaryCoverText={anniversaryCoverText}
          spreadMapping={pageToSpread[idx]}
          isEditMode={isEditMode}
          activeDragId={activeDragId}
        />
      ))}
    </div>
  );

  if (!isEditMode) return gridContent;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveDragId(active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragId(null)}
    >
      {gridContent}
      <DragOverlay dropAnimation={{ duration: 200 }}>
        {activeDragId && (
          <DragOverlayContent id={activeDragId} images={images} editorDraft={editorDraft} />
        )}
      </DragOverlay>
    </DndContext>
  );
}
