/**
 * Single responsibility: renders an SVG speech or thought bubble overlay.
 * Positioned in the bottom-left area of a panel by default.
 */
export default function SpeechBubble({ text, type = 'speech', position = 'bottom-left' }) {
  if (!text) return null;

  const posClass = {
    'bottom-left': 'bottom-3 left-3',
    'bottom-right': 'bottom-3 right-3',
    'top-left': 'top-3 left-3',
    'top-right': 'top-3 right-3',
  }[position] ?? 'bottom-3 left-3';

  if (type === 'thought') {
    return (
      <div className={`absolute ${posClass} max-w-[65%] z-10`}>
        <div className="relative bg-white/95 text-gray-900 rounded-full px-3 py-1.5 text-xs font-bold leading-tight shadow-lg border-2 border-gray-900">
          {text}
          {/* Thought bubble dots */}
          <span className="absolute -bottom-2 left-4 flex gap-0.5">
            <span className="w-2 h-2 rounded-full bg-white border border-gray-900" />
            <span className="w-1.5 h-1.5 rounded-full bg-white border border-gray-900 -mt-0.5" />
            <span className="w-1 h-1 rounded-full bg-white border border-gray-900 -mt-1" />
          </span>
        </div>
      </div>
    );
  }

  // Speech bubble with tail
  return (
    <div className={`absolute ${posClass} max-w-[70%] z-10`}>
      <div className="relative bg-white/97 text-gray-900 rounded-xl px-3 py-2 text-xs font-bold leading-tight shadow-lg border-2 border-gray-900">
        {text}
        {/* Speech tail */}
        <svg
          className="absolute -bottom-3 left-4"
          width="16" height="12" viewBox="0 0 16 12"
          fill="white" stroke="#111" strokeWidth="2"
        >
          <polygon points="0,0 16,0 4,12" />
        </svg>
      </div>
    </div>
  );
}
