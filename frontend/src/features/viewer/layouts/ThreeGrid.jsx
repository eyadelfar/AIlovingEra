import PageShell from '../PageShell';
import { PhotoImg, Divider } from '../PageShell';

// ── THREE_GRID: Magazine feature spread ───────────────────────────
//
//   +----------------------+
//   |  +----------++----+  |
//   |  |          || P2 |  |  <- hero 60% + supporting 36%
//   |  |  Photo 1 ||    |  |
//   |  |  (hero)  |+----+  |
//   |  |          || P3 |  |  <- P3 below P2
//   |  +----------+|    |  |
//   |              +----+  |
//   |  heading             |
//   |  -- divider --       |
//   |  body text           |
//   +----------------------+
//
export default function ThreeGrid({ page, photos, photoIndices, style, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P }) {
  const p = photos.slice(0, 3);
  return (
    <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
      <div className="relative z-20 flex flex-col h-full">
        {/* Photo grid: hero left + 2 stacked right */}
        <div className="flex gap-2.5 overflow-hidden" style={{ height: '65%' }}>
          {/* Hero photo — 60% width */}
          <div className="w-[60%] h-full overflow-hidden rounded-lg">
            <PhotoImg {...P(0)} heroFrame />
          </div>
          {/* Right column: P2 + P3 stacked */}
          <div className="w-[40%] flex flex-col gap-2.5 h-full">
            {p[1] && <div className="flex-1 min-h-0 overflow-hidden rounded-lg"><PhotoImg {...P(1)} altFrame /></div>}
            {p[2] && <div className="flex-1 min-h-0 overflow-hidden rounded-lg"><PhotoImg {...P(2)} /></div>}
            {!p[2] && p[1] && <div className="flex-1" />}
          </div>
        </div>

        {/* Text strip */}
        <div className="flex-1 flex flex-col justify-center min-h-0 pt-3">
          {page.heading_text && <h3 className={`font-semibold ${style.heading} mb-1`}>{page.heading_text}</h3>}
          <Divider className={`${style.dividerWide} my-2`} />
          {page.body_text && <p className={`${style.body} text-xs leading-relaxed line-clamp-3`}>{page.body_text}</p>}
          {page.caption_text && <p className={`text-xs ${style.caption} mt-1 line-clamp-1`}>{page.caption_text}</p>}
        </div>
      </div>
    </PageShell>
  );
}
