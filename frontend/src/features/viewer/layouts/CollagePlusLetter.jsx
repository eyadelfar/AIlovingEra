import PageShell from '../PageShell';
import { PhotoImg, Divider } from '../PageShell';

// ── COLLAGE_PLUS_LETTER: Tight collage + longform text ────────────
//
//   +-----------+----------+
//   | +--++--+  |          |
//   | |P1||P2|  | heading  |
//   | +--++--+  | -------- |
//   | +--++--+  |          |
//   | |P3||P4|  | body     |
//   | +--++--+  | text     |
//   | +--++--+  | flows    |
//   | |P5||P6|  | here     |
//   | +--++--+  |          |
//   +-----------+----------+
//
export default function CollagePlusLetter({ page, photos, photoIndices, style, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P }) {
  return (
    <PageShell style={style} className="grid grid-cols-2">
      {/* Left: tight photo collage */}
      <div className={`grid grid-cols-2 gap-1.5 p-4 relative z-20 overflow-hidden`}>
        {photos.slice(0, 9).map((photo, i) => (
          <PhotoImg key={i} {...P(i)} altFrame={i % 2 === 1} />
        ))}
      </div>
      {/* Right: longform text */}
      <div className={`flex flex-col justify-center p-6 overflow-hidden relative z-20`}>
        {page.heading_text && (
          <>
            <h3 className={`font-semibold ${style.headingLg} mb-2`}>{page.heading_text}</h3>
            <Divider className={`${style.dividerWide} my-3`} />
          </>
        )}
        {page.body_text && <p className={`${style.body} text-xs leading-relaxed mt-1`}>{page.body_text}</p>}
      </div>
    </PageShell>
  );
}
