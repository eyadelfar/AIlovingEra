/**
 * KeepSqueak logo mark + wordmark.
 *
 * Icon concept: A geometric mouse face whose body is shaped like a polaroid
 * photo frame — you read "photo" first, then notice it's a mouse character.
 * The camera-aperture star inside ties the character to the product.
 * Mouse ears emerge naturally from the top corners of the frame.
 *
 * Wordmark: "Keep" in solid white (trustworthy/strong) +
 *           "squeak" in italic rose→violet gradient (playful/warm) +
 *           ✦ amber star (AI / sparkle of memory)
 */
export default function Logo({ className = '', iconOnly = false }) {
  return (
    <span dir="ltr" className={`inline-flex items-center gap-2 select-none ${className}`}>

      {/* ── Icon mark ── */}
      <svg
        viewBox="0 0 40 40"
        className="w-8 h-8 flex-shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ks-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#130520"/>
            <stop offset="100%" stopColor="#07020e"/>
          </linearGradient>
          <linearGradient id="ks-face" x1="5%" y1="0%" x2="95%" y2="110%">
            <stop offset="0%"   stopColor="#e11d48"/>
            <stop offset="48%"  stopColor="#db2777"/>
            <stop offset="100%" stopColor="#7c3aed"/>
          </linearGradient>
          <linearGradient id="ks-star" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#fde68a"/>
            <stop offset="100%" stopColor="#d97706"/>
          </linearGradient>
          <radialGradient id="ks-glow" cx="50%" cy="45%" r="55%">
            <stop offset="0%"   stopColor="#9d174d" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#4c1d95" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="40" height="40" rx="10" fill="url(#ks-bg)"/>

        {/* Mouse ears — drawn before face so face overlaps their bottoms */}
        <circle cx="11" cy="8.5" r="5.8" fill="url(#ks-face)"/>
        <circle cx="29" cy="8.5" r="5.8" fill="url(#ks-face)"/>
        <circle cx="10.2" cy="7.2" r="2.4" fill="#f43f5e" opacity="0.4"/>
        <circle cx="28.2" cy="7.2" r="2.4" fill="#a855f7" opacity="0.4"/>

        {/* Polaroid / mouse-face rectangle */}
        <rect x="5" y="9" width="30" height="26" rx="5" fill="url(#ks-face)"/>

        {/* Inner depth glow */}
        <ellipse cx="20" cy="20" rx="13" ry="11" fill="url(#ks-glow)"/>

        {/* Photo inset — dark window = depth + "screen inside" */}
        <rect x="8.5" y="12" width="23" height="16" rx="3" fill="#0d0118" opacity="0.75"/>

        {/* Camera-aperture / 6-petal 12-point star — memory + AI symbol */}
        <path
          d="M20 16.4 L20.75 18.7 L23.12 18.2 L23.6 20
             L23.12 21.8 L20.75 21.3 L20 23.6
             L19.25 21.3 L16.88 21.8 L16.4 20
             L16.88 18.2 L19.25 18.7 Z"
          fill="url(#ks-star)"
          opacity="0.97"
        />
        <circle cx="24.5" cy="15.5" r="0.9" fill="#fde68a" opacity="0.8"/>

        {/* Tiny eyes — mouse face read inside photo area */}
        <circle cx="15.5" cy="17.5" r="1.4" fill="white" opacity="0.82"/>
        <circle cx="24.5" cy="17.5" r="1.4" fill="white" opacity="0.82"/>

        {/* Subtle smile */}
        <path
          d="M17 23.5 Q20 25.5 23 23.5"
          stroke="white" strokeWidth="0.9" fill="none"
          opacity="0.45" strokeLinecap="round"
        />
      </svg>

      {/* ── Wordmark ── */}
      {!iconOnly && (
        <span
          className="ks-wordmark leading-none inline-flex items-baseline pr-5"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          {/* "Keep" — medium weight, white */}
          <span style={{ fontWeight: 500, letterSpacing: '0.01em' }} className="text-white">
            Keep
          </span>
          {/* "squeak" — semibold, rose→violet gradient */}
          <span
            style={{ fontWeight: 600, letterSpacing: '0.01em' }}
            className="bg-gradient-to-r from-rose-400 via-pink-400 to-violet-400 bg-clip-text text-transparent"
          >
            Squeak
          </span>
          {/* "AI" — gold superscript pinned to top-right like a trademark symbol */}
          <sup
            className="text-amber-400 font-bold absolute"
            style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: '0.58em',
              top: '0.05em',
              right: 0,
              letterSpacing: '0.04em',
              lineHeight: 1,
            }}
          >
            AI
          </sup>
        </span>
      )}
    </span>
  );
}
