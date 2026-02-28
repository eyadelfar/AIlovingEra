import { useState } from 'react';
import useBookStore from '../../stores/bookStore';
import LoadingSpinner from '../shared/LoadingSpinner';
import BaseModal from '../shared/BaseModal';

const DEFAULT_INSTRUCTIONS = {
  heading_text: 'Write a heading for this spread',
  body_text: 'Write body text for this spread',
  caption_text: 'Write a caption for this photo',
  quote_text: 'Write a meaningful quote for this moment',
};

export default function RegenerateModal({ fieldName, currentText, chapterIdx, spreadIdx, onAccept, onClose }) {
  const regenerateTextAction = useBookStore(s => s.regenerateTextAction);
  const defaultInstruction = !currentText ? (DEFAULT_INSTRUCTIONS[fieldName] || `Write ${fieldName.replace('_', ' ')}`) : '';
  const [instruction, setInstruction] = useState(defaultInstruction);
  const [newText, setNewText] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const modalTitle = currentText
    ? `Rewrite ${fieldName.replace('_', ' ')}`
    : `Generate ${fieldName.replace('_', ' ')}`;

  async function handleRegenerate() {
    if (!instruction.trim()) return;
    setIsLoading(true);
    setError(null);
    setNewText(null);

    try {
      const result = await regenerateTextAction(chapterIdx, spreadIdx, fieldName, instruction);
      if (result) {
        setNewText(result);
      } else {
        setError('Failed to regenerate text');
      }
    } catch (err) {
      setError(err.message || 'Regeneration failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <BaseModal title={modalTitle} onClose={onClose} size="sm">
      <div className="bg-gray-800/50 rounded-lg px-3 py-2 mb-3 max-h-20 overflow-y-auto">
        <p className="text-xs text-gray-500">{currentText || '(empty)'}</p>
      </div>

      <input
        value={instruction}
        onChange={e => setInstruction(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleRegenerate(); }}
        placeholder="Make it funnier, shorter, more poetic..."
        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 mb-3"
        autoFocus
      />

      {isLoading && (
        <div className="flex items-center gap-2 py-3">
          <LoadingSpinner size="sm" />
          <span className="text-xs text-gray-500">Regenerating...</span>
        </div>
      )}

      {newText && !isLoading && (
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg px-3 py-2 mb-3">
          <p className="text-sm text-gray-200">{newText}</p>
        </div>
      )}

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="flex gap-2">
        {!newText ? (
          <button
            onClick={handleRegenerate}
            disabled={!instruction.trim() || isLoading}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Regenerate
          </button>
        ) : (
          <>
            <button
              onClick={() => { setNewText(null); setInstruction(''); }}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 border border-gray-700 hover:border-gray-500 transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => onAccept(newText)}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-rose-500 to-violet-600 text-white hover:from-rose-600 hover:to-violet-700 transition-all"
            >
              Accept
            </button>
          </>
        )}
      </div>
    </BaseModal>
  );
}
