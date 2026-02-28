import PageShell from '../PageShell';
import { PhotoImg, Divider } from '../PageShell';

// ── Fallback: generic layout for any remaining types ──────────────
// Uses intelligent auto-layout based on actual photo count

export default function FallbackLayout({ page, photos, photoIndices, style, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P }) {
  const fallbackPhotos = photos.slice(0, 10);
  const count = fallbackPhotos.length;

  if (count === 0) {
    // Text-only fallback
    return (
      <PageShell style={style} className={`flex flex-col items-center justify-center ${style.innerPadding}`}>
        <div className="relative z-20 text-center max-w-sm">
          {page.heading_text && <h3 className={`font-semibold ${style.heading} mb-2`}>{page.heading_text}</h3>}
          {page.body_text && <p className={`${style.body} text-sm leading-relaxed`}>{page.body_text}</p>}
        </div>
      </PageShell>
    );
  }

  if (count === 1) {
    // Single photo with text below
    return (
      <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
        <div className="relative z-20 flex flex-col h-full">
          <div className="overflow-hidden rounded-lg" style={{ height: '75%' }}><PhotoImg {...P(0)} heroFrame /></div>
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 pt-3">
            {page.heading_text && <h3 className={`font-semibold ${style.heading} mb-1 text-center`}>{page.heading_text}</h3>}
            <Divider className={style.divider} />
            {page.body_text && <p className={`${style.body} text-xs mt-2 text-center line-clamp-2`}>{page.body_text}</p>}
          </div>
        </div>
      </PageShell>
    );
  }

  // 2-5 photos: asymmetric grid
  if (count <= 5) {
    return (
      <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
        <div className="relative z-20 flex flex-col h-full gap-2">
          {/* Top: hero + one supporting */}
          <div className="flex gap-2 overflow-hidden" style={{ height: '50%' }}>
            <div className="w-[60%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(0)} heroFrame /></div>
            {fallbackPhotos[1] && <div className="w-[40%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(1)} altFrame /></div>}
          </div>
          {/* Bottom: remaining photos in a row */}
          <div className="flex gap-2 overflow-hidden" style={{ height: count > 3 ? '30%' : '25%' }}>
            {fallbackPhotos.slice(2).map((photo, i) => (
              <div key={i + 2} className="flex-1 h-full overflow-hidden rounded-lg"><PhotoImg {...P(i + 2)} altFrame={i % 2 === 0} /></div>
            ))}
          </div>
          {/* Text */}
          <div className="flex-1 flex items-center min-h-0 gap-3">
            {page.heading_text && <h3 className={`font-semibold ${style.heading} flex-shrink-0`}>{page.heading_text}</h3>}
            {page.body_text && <p className={`${style.body} text-xs line-clamp-2`}>{page.body_text}</p>}
          </div>
        </div>
      </PageShell>
    );
  }

  // 6+ photos: dense mosaic
  return (
    <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
      <div className="relative z-20 flex flex-col h-full gap-1.5">
        {/* Row 1 */}
        <div className="flex gap-1.5 overflow-hidden" style={{ height: '30%' }}>
          <div className="w-[55%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(0)} heroFrame /></div>
          {fallbackPhotos[1] && <div className="w-[45%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(1)} altFrame /></div>}
        </div>
        {/* Row 2 */}
        <div className="flex gap-1.5 overflow-hidden" style={{ height: '30%' }}>
          {fallbackPhotos.slice(2, 5).map((photo, i) => (
            <div key={i + 2} className="flex-1 h-full overflow-hidden rounded-lg"><PhotoImg {...P(i + 2)} altFrame={i % 2 === 0} /></div>
          ))}
        </div>
        {/* Row 3 */}
        {fallbackPhotos.length > 5 && (
          <div className="flex gap-1.5 overflow-hidden" style={{ height: '25%' }}>
            {fallbackPhotos.slice(5).map((photo, i) => (
              <div key={i + 5} className="flex-1 h-full overflow-hidden rounded-lg"><PhotoImg {...P(i + 5)} altFrame={i % 2 === 1} /></div>
            ))}
          </div>
        )}
        {/* Caption row */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          {page.heading_text && <h3 className={`font-semibold ${style.heading} text-center`}>{page.heading_text}</h3>}
          {page.caption_text && <p className={`text-xs ${style.caption} ml-3`}>{page.caption_text}</p>}
        </div>
      </div>
    </PageShell>
  );
}
