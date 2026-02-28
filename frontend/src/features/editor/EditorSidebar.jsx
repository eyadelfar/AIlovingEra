import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import useBookStore from '../../stores/bookStore';
import ChapterSection from './ChapterSection';

export default function EditorSidebar({ isOpen, onClose }) {
  const editorDraft = useBookStore(s => s.editorDraft);
  const reorderChapter = useBookStore(s => s.reorderChapter);
  const selectedChapterIndex = useBookStore(s => s.selectedChapterIndex);
  const setSelectedChapter = useBookStore(s => s.setSelectedChapter);

  const chapters = editorDraft?.chapters || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleChapterDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = chapters.findIndex(c => `ch-${c.chapter_index}` === active.id);
    const toIdx = chapters.findIndex(c => `ch-${c.chapter_index}` === over.id);
    if (fromIdx !== -1 && toIdx !== -1) {
      reorderChapter(fromIdx, toIdx);
    }
  }

  function handleChapterSelect(idx) {
    setSelectedChapter(idx);
    if (onClose) onClose();
  }

  const sidebarContent = (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chapters</h3>
        <span className="text-xs text-gray-600">{chapters.length}</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleChapterDragEnd}
      >
        <SortableContext
          items={chapters.map(c => `ch-${c.chapter_index}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {chapters.map((chapter, idx) => (
              <ChapterSection
                key={`ch-${chapter.chapter_index}`}
                chapter={chapter}
                chapterIdx={idx}
                isSelected={selectedChapterIndex === idx}
                onSelect={() => handleChapterSelect(idx)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {chapters.length === 0 && (
        <p className="text-sm text-gray-600 text-center py-8">No chapters yet</p>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden md:block w-72 border-r border-gray-800 bg-gray-950/50 overflow-y-auto flex-shrink-0">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-gray-950 border-r border-gray-800 overflow-y-auto z-50"
            >
              <div className="flex items-center justify-between p-3 border-b border-gray-800">
                <span className="text-sm font-medium text-gray-300">Chapters</span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
