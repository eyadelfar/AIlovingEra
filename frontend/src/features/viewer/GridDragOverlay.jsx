import { useDraggable, useDroppable } from '@dnd-kit/core';
import { makeDragId, parseDragId } from '../../lib/gridUtils';

const FIELD_LABELS = {
  heading_text: 'H',
  body_text: 'B',
  caption_text: 'C',
  quote_text: 'Q',
};

const TEXT_FIELDS = ['heading_text', 'body_text', 'caption_text', 'quote_text'];

function PhotoDragSlot({ id, image, isCompatibleTarget }) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });

  const ref = (node) => {
    setDragRef(node);
    setDropRef(node);
  };

  return (
    <div
      ref={ref}
      {...attributes}
      {...listeners}
      className={`
        relative rounded cursor-grab active:cursor-grabbing transition-all h-full
        ${isDragging ? 'opacity-40 ring-2 ring-violet-500 scale-95' : ''}
        ${isOver && isCompatibleTarget ? 'ring-2 ring-green-400 bg-green-400/20 scale-105' : ''}
        ${isCompatibleTarget && !isOver && !isDragging ? 'ring-1 ring-dashed ring-violet-400/40' : ''}
        ${!isCompatibleTarget && !isDragging ? 'ring-1 ring-transparent hover:ring-white/20' : ''}
      `}
    >
      {image ? (
        <img src={image.previewUrl} alt="" className="w-full h-full object-cover rounded" />
      ) : (
        <div className="w-full h-full bg-gray-800/50 rounded flex items-center justify-center">
          <span className="text-gray-600 text-[8px]">empty</span>
        </div>
      )}
      <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-violet-500/70 rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-white" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="12" cy="4" r="1.5" />
          <circle cx="4" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      </div>
    </div>
  );
}

function TextDragSlot({ id, text, field, isCompatibleTarget }) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });

  const ref = (node) => {
    setDragRef(node);
    setDropRef(node);
  };

  return (
    <div
      ref={ref}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-1 px-1.5 py-0.5 rounded cursor-grab active:cursor-grabbing transition-all
        ${isDragging ? 'opacity-40 ring-2 ring-violet-500' : 'bg-black/50'}
        ${isOver && isCompatibleTarget ? 'ring-2 ring-green-400 bg-green-400/20' : ''}
        ${isCompatibleTarget && !isOver && !isDragging ? 'ring-1 ring-dashed ring-violet-400/40' : ''}
      `}
    >
      <span className="font-bold text-violet-400 text-[8px] shrink-0">{FIELD_LABELS[field]}</span>
      <span className="text-white/70 text-[7px] truncate">{text?.slice(0, 24) || '...'}</span>
    </div>
  );
}

export default function GridDragOverlay({ page, chapterIdx, spreadIdx, images, activeDragId }) {
  const photoIndices = page.photo_indices || [];
  const textFields = TEXT_FIELDS.filter(f => page[f]);

  const activeDrag = activeDragId ? parseDragId(activeDragId) : null;
  const isPhotoActive = activeDrag?.type === 'photo';
  const isTextActive = activeDrag?.type === 'text';

  return (
    <div className="absolute inset-0 z-10 flex flex-col p-1 gap-0.5">
      {photoIndices.length > 0 && (
        <div
          className="flex-1 min-h-0 grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${Math.min(photoIndices.length, 3)}, 1fr)` }}
        >
          {photoIndices.map((pIdx, slotIdx) => (
            <PhotoDragSlot
              key={slotIdx}
              id={makeDragId('photo', chapterIdx, spreadIdx, slotIdx)}
              image={images[pIdx]}
              isCompatibleTarget={isPhotoActive}
            />
          ))}
        </div>
      )}

      {textFields.length > 0 && (
        <div className="flex flex-col gap-0.5 shrink-0">
          {textFields.map(field => (
            <TextDragSlot
              key={field}
              id={makeDragId('text', chapterIdx, spreadIdx, field)}
              text={page[field]}
              field={field}
              isCompatibleTarget={isTextActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
