import SpeechBubble from './SpeechBubble';

/**
 * Single responsibility: renders one comic panel — art image + all story overlays.
 */
export default function ComicPanel({ panel, className = '' }) {
  const hasArt = Boolean(panel.comic_art_base64);

  return (
    <div
      className={`relative overflow-hidden border-3 border-gray-900 bg-gray-800 ${className}`}
      style={{ borderWidth: 3, borderColor: '#111' }}
    >
      {/* ── Comic art image ─────────────────────────────────────────────── */}
      {hasArt ? (
        <img
          src={panel.comic_art_base64}
          alt={panel.description || `Panel ${panel.panel_number}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        /* Placeholder when art hasn't loaded / failed */
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 gap-2 p-4">
          <svg className="w-10 h-10 text-violet-600 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 text-xs text-center">{panel.description || 'Generating art…'}</p>
        </div>
      )}

      {/* ── Caption box (narrator — top strip) ──────────────────────────── */}
      {panel.caption && (
        <div className="absolute top-0 left-0 right-0 bg-amber-50/95 border-b-2 border-gray-900 px-2 py-1 z-10">
          <p className="text-gray-900 text-[10px] font-semibold leading-tight italic">
            {panel.caption}
          </p>
        </div>
      )}

      {/* ── SFX text ────────────────────────────────────────────────────── */}
      {panel.sfx && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <span
            className="text-yellow-400 font-black uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none"
            style={{
              fontSize: 'clamp(1.5rem, 5vw, 3rem)',
              WebkitTextStroke: '2px #111',
              transform: 'rotate(-8deg)',
              display: 'block',
            }}
          >
            {panel.sfx}
          </span>
        </div>
      )}

      {/* ── Speech bubble (dialogue) ─────────────────────────────────────── */}
      {panel.dialogue && (
        <SpeechBubble text={panel.dialogue} type="speech" position="bottom-left" />
      )}

      {/* ── Thought bubble ──────────────────────────────────────────────── */}
      {panel.thought_bubble && (
        <SpeechBubble text={panel.thought_bubble} type="thought" position="top-right" />
      )}

      {/* ── Panel number badge ──────────────────────────────────────────── */}
      <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1 rounded z-20">
        {panel.panel_number}
      </div>
    </div>
  );
}
