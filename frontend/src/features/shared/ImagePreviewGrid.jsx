import { useState, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';

export default function ImagePreviewGrid({ images, onRemove, onReorder, onUndoRemove }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = images.findIndex(img => String(img.id) === String(active.id));
    const toIdx = images.findIndex(img => String(img.id) === String(over.id));
    if (fromIdx !== -1 && toIdx !== -1 && onReorder) {
      onReorder(fromIdx, toIdx);
    }
  }, [images, onReorder]);

  const handleRemoveWithUndo = useCallback((imageId) => {
    const idx = images.findIndex(i => i.id === imageId);
    const removed = images[idx];
    if (!removed) return;

    onRemove(imageId);

    toast(
      (t) => {
        let undone = false;
        return (
          <div className="flex items-center gap-3">
            <span className="text-sm">Photo removed</span>
            <button
              onClick={() => {
                if (undone) return;
                undone = true;
                toast.dismiss(t.id);
                onUndoRemove?.(removed, idx);
              }}
              className="text-violet-400 text-sm font-medium hover:text-violet-300"
            >
              Undo
            </button>
          </div>
        );
      },
      { duration: 5000, style: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' } }
    );
  }, [images, onRemove, onUndoRemove]);

  if (!images.length) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-400 text-sm uppercase tracking-wide">
          Your Photos ({images.length})
        </h3>
        {onReorder && (
          <span className="text-[10px] text-gray-600">Drag to reorder</span>
        )}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={images.map(img => String(img.id))} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {images.map((image, idx) => (
              <SortablePhoto
                key={image.id}
                image={image}
                index={idx}
                onRemove={() => handleRemoveWithUndo(image.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortablePhoto({ image, index, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(image.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-square"
    >
      <div
        {...attributes}
        {...listeners}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <img
          src={image.previewUrl}
          alt={image.name}
          className={`w-full h-full object-cover rounded-lg border transition-all ${
            isDragging ? 'border-violet-500 shadow-lg shadow-violet-500/20 scale-105' : 'border-gray-700'
          }`}
          draggable={false}
        />
      </div>

      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-full">
        {index + 1}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="Remove photo"
        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg"
        title="Remove"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
