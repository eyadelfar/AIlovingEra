import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useBookStore from '../../stores/bookStore';
import EditorToolbar from './EditorToolbar';
import EditorSidebar from './EditorSidebar';
import EditorCanvas from './EditorCanvas';

export default function BookEditorPage() {
  const navigate = useNavigate();
  const bookDraft = useBookStore(s => s.bookDraft);
  const editorDraft = useBookStore(s => s.editorDraft);
  const editorDirty = useBookStore(s => s.editorDirty);
  const initEditor = useBookStore(s => s.initEditor);
  const undo = useBookStore(s => s.undo);
  const redo = useBookStore(s => s.redo);
  const removeSpread = useBookStore(s => s.removeSpread);
  const setSelectedChapter = useBookStore(s => s.setSelectedChapter);
  const selectedChapterIndex = useBookStore(s => s.selectedChapterIndex);
  const selectedSpreadIndex = useBookStore(s => s.selectedSpreadIndex);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!bookDraft) {
      navigate('/create');
      return;
    }
    if (!editorDraft) {
      initEditor();
    }
  }, [bookDraft]);

  // Warn on unsaved changes before leaving
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (useBookStore.getState().editorDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Skip if user is typing in an input/textarea
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') {
        // Deselect spread → back to chapter overview
        const s = useBookStore.getState();
        if (s.selectedSpreadIndex != null) {
          setSelectedChapter(s.selectedChapterIndex);
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey) {
        const s = useBookStore.getState();
        if (s.selectedSpreadIndex != null && s.selectedChapterIndex != null) {
          e.preventDefault();
          if (window.confirm('Delete this spread?')) {
            removeSpread(s.selectedChapterIndex, s.selectedSpreadIndex);
            setSelectedChapter(s.selectedChapterIndex);
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, removeSpread, setSelectedChapter]);

  if (!editorDraft) return null;

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col">
      <EditorToolbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
      <div className="flex flex-1 min-h-0">
        <EditorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <EditorCanvas />
      </div>
    </div>
  );
}
