/**
 * SamplePhoto — A CSS-art "couple at sunset" illustration.
 *
 * At thumbnail size (~120x160 px) this looks convincingly photo-like.
 * The key trick: CSS `filter` on the wrapper transforms ALL gradient layers
 * simultaneously, so users see the exact same effect they'd get on a real photo.
 */
export default function SamplePhoto({ cssFilter = 'none', className = '' }) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={cssFilter !== 'none' ? { filter: cssFilter } : undefined}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-amber-300 via-rose-400/90 to-indigo-900" />

      <div
        className="absolute rounded-full"
        style={{
          top: '18%', left: '50%', transform: 'translateX(-50%)',
          width: '90%', height: '50%',
          background: 'radial-gradient(ellipse, rgba(251,191,36,0.55) 0%, transparent 70%)',
        }}
      />

      <div
        className="absolute w-full"
        style={{
          bottom: '28%', height: '18%',
          background: 'linear-gradient(to top, rgba(251,146,60,0.35), transparent)',
        }}
      />

      <div
        className="absolute"
        style={{
          bottom: 0, left: '24%', width: '24%', height: '58%',
          background: 'linear-gradient(to top, rgba(15,10,30,0.85), rgba(30,20,50,0.7) 75%, transparent)',
          borderRadius: '45% 45% 0 0',
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: 0, left: '46%', width: '22%', height: '52%',
          background: 'linear-gradient(to top, rgba(15,10,30,0.85), rgba(30,20,50,0.65) 75%, transparent)',
          borderRadius: '45% 45% 0 0',
          transform: 'rotate(-2deg)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: '54%', left: '28%', width: '14%', height: '10%',
          background: 'rgba(15,10,30,0.75)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: '48%', left: '50%', width: '13%', height: '9%',
          background: 'rgba(15,10,30,0.7)',
          transform: 'rotate(-3deg)',
        }}
      />

      <div
        className="absolute"
        style={{
          bottom: 0, left: '35%', width: '3%', height: '55%',
          background: 'linear-gradient(to top, rgba(251,191,36,0.2), rgba(251,191,36,0.05) 80%, transparent)',
        }}
      />

      <div className="absolute rounded-full" style={{ top: '12%', left: '15%', width: 12, height: 12, background: 'rgba(253,224,71,0.3)', filter: 'blur(2px)' }} />
      <div className="absolute rounded-full" style={{ top: '22%', right: '12%', width: 8, height: 8, background: 'rgba(251,191,36,0.25)', filter: 'blur(1.5px)' }} />
      <div className="absolute rounded-full" style={{ top: '8%', right: '28%', width: 16, height: 16, background: 'rgba(253,186,116,0.2)', filter: 'blur(3px)' }} />
      <div className="absolute rounded-full" style={{ top: '30%', left: '8%', width: 6, height: 6, background: 'rgba(254,205,211,0.25)', filter: 'blur(1px)' }} />
      <div className="absolute rounded-full" style={{ top: '16%', left: '60%', width: 10, height: 10, background: 'rgba(253,224,71,0.2)', filter: 'blur(2px)' }} />

      <div
        className="absolute w-full bottom-0"
        style={{
          height: '15%',
          background: 'linear-gradient(to top, rgba(10,5,25,0.7), transparent)',
        }}
      />

      <div
        className="absolute rounded-full"
        style={{
          top: '25%', left: '48%',
          width: '30%', height: '15%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.1) 0%, transparent 60%)',
          transform: 'rotate(-15deg)',
        }}
      />
    </div>
  );
}
