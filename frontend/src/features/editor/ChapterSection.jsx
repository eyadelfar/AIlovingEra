import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useBookStore from '../../stores/bookStore';
import SpreadCard from './SpreadCard';

export default function ChapterSection({ chapter, chapterIdx, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const updateChapterField = useBookStore(s => s.updateChapterField);
  const setSelectedSpread = useBookStore(s => s.setSelectedSpread);
  const addBlankSpread = useBookStore(s => s.addBlankSpread);
  const selectedSpreadIndex = useBookStore(s => s.selectedSpreadIndex);
  const reorderSpread = useBookStore(s => s.reorderSpread);

  const spreadSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleSpreadDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = parseInt(String(active.id).split('-').pop(), 10);
    const toIdx = parseInt(String(over.id).split('-').pop(), 10);
    if (!isNaN(fromIdx) && !isNaN(toIdx)) {
      reorderSpread(chapterIdx, fromIdx, toIdx);
    }
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `ch-${chapter.chapter_index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(chapter.title);

  function commitTitle() {
    setIsEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== chapter.title) {
      updateChapterField(chapterIdx, 'title', titleDraft.trim());
    } else {
      setTitleDraft(chapter.title);
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg overflow-hidden">
      <div
        className={`flex items-center gap-2 px-2 py-2 cursor-pointer transition-colors ${
          isSelected ? 'bg-rose-500/10 border-l-2 border-rose-500' : 'hover:bg-gray-800/50'
        }`}
        onClick={onSelect}
      >
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing"
          onClick={e => e.stopPropagation()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
          </svg>
        </button>

        <span className="flex-shrink-0 w-5 h-5 rounded bg-gray-800 text-gray-400 text-xs font-medium flex items-center justify-center">
          {chapterIdx + 1}
        </span>

        {isEditingTitle ? (
          <input
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === 'Enter') commitTitle(); }}
            autoFocus
            className="flex-1 min-w-0 bg-transparent border-b border-gray-600 text-sm text-gray-200 focus:outline-none px-0.5"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 min-w-0 text-sm text-gray-300 truncate"
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); setTitleDraft(chapter.title); }}
          >
            {chapter.title || 'Untitled Chapter'}
          </span>
        )}

        <button
          onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
          className="flex-shrink-0 p-1 text-gray-600 hover:text-gray-400 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <span className="flex-shrink-0 text-xs text-gray-600">{chapter.spreads?.length || 0}</span>
      </div>

      {expanded && (
        <div className="pl-6 pr-2 pb-2 space-y-1">
          <DndContext sensors={spreadSensors} collisionDetection={closestCenter} onDragEnd={handleSpreadDragEnd}>
            <SortableContext
              items={(chapter.spreads || []).map((_, sIdx) => `sp-${chapterIdx}-${sIdx}`)}
              strategy={verticalListSortingStrategy}
            >
              {(chapter.spreads || []).map((spread, sIdx) => (
                <SpreadCard
                  key={`sp-${chapterIdx}-${sIdx}`}
                  spread={spread}
                  chapterIdx={chapterIdx}
                  spreadIdx={sIdx}
                  isSelected={isSelected && selectedSpreadIndex === sIdx}
                  onSelect={() => setSelectedSpread(chapterIdx, sIdx)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button
            onClick={() => addBlankSpread(chapterIdx, chapter.spreads?.length || 0)}
            className="w-full py-1.5 text-xs text-gray-600 hover:text-gray-400 border border-dashed border-gray-800 hover:border-gray-600 rounded transition-colors"
          >
            + Add Spread
          </button>
        </div>
      )}
    </div>
  );
}
