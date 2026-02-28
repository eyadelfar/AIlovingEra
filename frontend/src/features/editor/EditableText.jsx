import { useState, useRef, useEffect } from 'react';
import RegenerateModal from './RegenerateModal';

export default function EditableText({ value, onChange, className = '', multiline = false, chapterIdx, spreadIdx, field }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [showRegenerate, setShowRegenerate] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function commit() {
    setIsEditing(false);
    if (draft !== value) {
      onChange(draft);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setDraft(value || '');
      setIsEditing(false);
    }
    if (!multiline && e.key === 'Enter') {
      commit();
    }
  }

  if (isEditing) {
    const Component = multiline ? 'textarea' : 'input';
    return (
      <Component
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        rows={multiline ? 4 : undefined}
        className={`w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none ${className}`}
      />
    );
  }

  return (
    <div className="group relative">
      <div
        onClick={() => setIsEditing(true)}
        className={`cursor-text rounded-lg px-3 py-2 -mx-3 -my-2 hover:bg-gray-800/30 transition-colors ${className}`}
      >
        {value || <span className="text-gray-700 italic">Click to edit...</span>}
      </div>

      {field && (
        <button
          onClick={() => setShowRegenerate(true)}
          className="absolute -right-1 top-0 p-1 rounded bg-violet-500/10 text-violet-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-violet-500/20"
          title={value ? 'Rewrite with AI' : 'Generate with AI'}
        >
          {value ? 'Rewrite' : 'Generate'}
        </button>
      )}

      {showRegenerate && (
        <RegenerateModal
          fieldName={field}
          currentText={value}
          chapterIdx={chapterIdx}
          spreadIdx={spreadIdx}
          onAccept={newText => { onChange(newText); setShowRegenerate(false); }}
          onClose={() => setShowRegenerate(false)}
        />
      )}
    </div>
  );
}
