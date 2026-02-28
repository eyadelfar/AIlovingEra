export function PageOrnaments({ templateType, stroke, fill }) {
  if (templateType === 'romantic') {
    return (
      <div className="absolute inset-0 pointer-events-none z-10">
        <svg className="absolute top-3 left-3" width="56" height="56" viewBox="0 0 56 56" fill="none">
          <path d="M6 50 C6 30 14 14 50 6" stroke={stroke} strokeWidth="0.8" />
          <path d="M6 50 C10 36 18 22 42 12" stroke={stroke} strokeWidth="0.5" />
          <ellipse cx="28" cy="20" rx="3" ry="6" transform="rotate(-35 28 20)" fill={fill} stroke={stroke} strokeWidth="0.4" />
          <ellipse cx="18" cy="32" rx="2.5" ry="5" transform="rotate(-55 18 32)" fill={fill} stroke={stroke} strokeWidth="0.4" />
          <circle cx="50" cy="6" r="1.5" fill={stroke} />
        </svg>
        <svg className="absolute top-3 right-3" width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ transform: 'scaleX(-1)' }}>
          <path d="M6 50 C6 30 14 14 50 6" stroke={stroke} strokeWidth="0.8" />
          <path d="M6 50 C10 36 18 22 42 12" stroke={stroke} strokeWidth="0.5" />
          <ellipse cx="28" cy="20" rx="3" ry="6" transform="rotate(-35 28 20)" fill={fill} stroke={stroke} strokeWidth="0.4" />
          <ellipse cx="18" cy="32" rx="2.5" ry="5" transform="rotate(-55 18 32)" fill={fill} stroke={stroke} strokeWidth="0.4" />
          <circle cx="50" cy="6" r="1.5" fill={stroke} />
        </svg>
        <svg className="absolute bottom-3 left-3" width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ transform: 'scaleY(-1)' }}>
          <path d="M6 50 C6 30 14 14 50 6" stroke={stroke} strokeWidth="0.8" />
          <ellipse cx="28" cy="20" rx="3" ry="6" transform="rotate(-35 28 20)" fill={fill} stroke={stroke} strokeWidth="0.4" />
          <circle cx="50" cy="6" r="1.5" fill={stroke} />
        </svg>
        <svg className="absolute bottom-3 right-3" width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ transform: 'scale(-1,-1)' }}>
          <path d="M6 50 C6 30 14 14 50 6" stroke={stroke} strokeWidth="0.8" />
          <ellipse cx="28" cy="20" rx="3" ry="6" transform="rotate(-35 28 20)" fill={fill} stroke={stroke} strokeWidth="0.4" />
          <circle cx="50" cy="6" r="1.5" fill={stroke} />
        </svg>
      </div>
    );
  }

  if (templateType === 'vintage') {
    return (
      <div className="absolute inset-0 pointer-events-none z-10">
        {[
          'top-2 left-2',
          'top-2 right-2 -scale-x-100',
          'bottom-2 left-2 -scale-y-100',
          'bottom-2 right-2 -scale-x-100 -scale-y-100',
        ].map((pos, i) => (
          <svg key={i} className={`absolute ${pos}`} width="52" height="52" viewBox="0 0 52 52" fill="none">
            <path d="M4 48 C4 24 16 8 48 4" stroke={stroke} strokeWidth="1" />
            <path d="M4 48 C6 40 10 32 18 24 C22 20 26 18 30 17" stroke={stroke} strokeWidth="0.6" />
            <path d="M48 4 C44 6 42 10 44 14 C46 12 48 8 48 4" stroke={stroke} strokeWidth="0.7" fill={fill} />
            <path d="M4 48 C8 46 10 42 8 38 C6 40 4 44 4 48" stroke={stroke} strokeWidth="0.7" fill={fill} />
            <circle cx="26" cy="16" r="1.2" fill={stroke} />
          </svg>
        ))}
        <div className="absolute inset-4 border border-amber-600/10 rounded pointer-events-none" />
      </div>
    );
  }

  if (templateType === 'elegant') {
    return (
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-4 left-4">
          <div className="w-10 h-px" style={{ backgroundColor: stroke }} />
          <div className="w-px h-10" style={{ backgroundColor: stroke }} />
        </div>
        <div className="absolute top-4 right-4 flex flex-col items-end">
          <div className="w-10 h-px" style={{ backgroundColor: stroke }} />
          <div className="w-px h-10 self-end" style={{ backgroundColor: stroke }} />
        </div>
        <div className="absolute bottom-4 left-4 flex flex-col justify-end">
          <div className="w-px h-10" style={{ backgroundColor: stroke }} />
          <div className="w-10 h-px" style={{ backgroundColor: stroke }} />
        </div>
        <div className="absolute bottom-4 right-4 flex flex-col items-end justify-end">
          <div className="w-px h-10 self-end" style={{ backgroundColor: stroke }} />
          <div className="w-10 h-px" style={{ backgroundColor: stroke }} />
        </div>
      </div>
    );
  }

  return null;
}

export function PageBgPattern({ bgPattern }) {
  if (!bgPattern) return null;
  return <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: bgPattern }} />;
}
