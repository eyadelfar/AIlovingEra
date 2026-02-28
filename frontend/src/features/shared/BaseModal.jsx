import { useEffect, useRef } from 'react';

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

/**
 * Shared modal wrapper — handles overlay, escape key, click-outside-close,
 * body scroll lock, and focus management.
 */
export default function BaseModal({ title, onClose, size = 'md', scrollable = false, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('modal-open');
    panelRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Modal'}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`bg-gray-900 border border-gray-700 rounded-2xl p-6 ${SIZE_CLASSES[size] || SIZE_CLASSES.md} w-full outline-none ${scrollable ? 'max-h-[80vh] overflow-y-auto' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 -m-1 rounded-lg hover:bg-gray-800"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
