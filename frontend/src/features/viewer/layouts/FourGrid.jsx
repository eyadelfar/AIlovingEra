import PageShell from '../PageShell';
import { PhotoImg } from '../PageShell';

// ── FOUR_GRID: Featured mosaic — 1 hero + 3 supporting ───────────
//
//   +----------------------+
//   |  +-----------++---+  |
//   |  |           ||P2 |  |  <- hero 62%, P2 fills right
//   |  |  Photo 1  |+---+  |
//   |  |  (hero)   |+---+  |
//   |  |           ||P3 |  |
//   |  +-----------++---+  |
//   |  +-----------------+ |
//   |  |    Photo 4      | |  <- panoramic strip
//   |  +-----------------+ |
//   |  heading . body text |
//   +----------------------+
//
export default function FourGrid({ page, photos, photoIndices, style, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P }) {
  const p = photos.slice(0, 4);
  return (
    <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
      <div className="relative z-20 flex flex-col h-full">
        {/* Top: hero + 2 stacked */}
        <div className="flex gap-2.5 overflow-hidden" style={{ height: '48%' }}>
          <div className="w-[62%] h-full overflow-hidden rounded-lg">
            <PhotoImg {...P(0)} heroFrame />
          </div>
          <div className="w-[38%] flex flex-col gap-2.5 h-full">
            {p[1] && <div className="flex-1 min-h-0 overflow-hidden rounded-lg"><PhotoImg {...P(1)} altFrame /></div>}
            {p[2] && <div className="flex-1 min-h-0 overflow-hidden rounded-lg"><PhotoImg {...P(2)} /></div>}
          </div>
        </div>

        {/* Panoramic strip */}
        {p[3] && (
          <div className="mt-2.5 overflow-hidden rounded-lg" style={{ height: '22%' }}>
            <PhotoImg {...P(3)} altFrame className="!rounded-lg" />
          </div>
        )}

        {/* Text */}
        <div className="flex-1 flex flex-col justify-center min-h-0 pt-2">
          {page.heading_text && <h3 className={`font-semibold ${style.heading} mb-1`}>{page.heading_text}</h3>}
          {page.body_text && <p className={`${style.body} text-xs leading-relaxed line-clamp-2`}>{page.body_text}</p>}
          {page.caption_text && <p className={`text-xs ${style.caption} mt-0.5`}>{page.caption_text}</p>}
        </div>
      </div>
    </PageShell>
  );
}
