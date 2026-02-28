import PageShell from '../PageShell';
import { PhotoImg } from '../PageShell';

// ── SIX_MONTAGE: Dynamic rhythm collage ───────────────────────────
//
//   +----------------------+
//   |  +----------++----+  |  <- wide + narrow
//   |  |   P1     || P2 |  |
//   |  +----------++----+  |
//   |  +----++----------+  |  <- narrow + wide (reversed rhythm)
//   |  | P3 ||   P4     |  |
//   |  +----++----------+  |
//   |  +------++------+    |  <- equal pair
//   |  | P5   ||  P6  |    |
//   |  +------++------+    |
//   |  heading . text      |
//   +----------------------+
//
export default function SixMontage({ page, photos, photoIndices, style, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P }) {
  const p = photos.slice(0, 6);
  return (
    <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
      <div className="relative z-20 flex flex-col h-full gap-2">
        {/* Row 1: wide + narrow */}
        <div className="flex gap-2 overflow-hidden" style={{ height: '28%' }}>
          <div className="w-[62%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(0)} heroFrame /></div>
          {p[1] && <div className="w-[38%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(1)} altFrame /></div>}
        </div>
        {/* Row 2: narrow + wide (reversed) */}
        <div className="flex gap-2 overflow-hidden" style={{ height: '28%' }}>
          {p[2] && <div className="w-[38%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(2)} /></div>}
          {p[3] && <div className="w-[62%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(3)} altFrame /></div>}
        </div>
        {/* Row 3: equal pair */}
        <div className="flex gap-2 overflow-hidden" style={{ height: '24%' }}>
          {p[4] && <div className="w-[50%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(4)} /></div>}
          {p[5] && <div className="w-[50%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(5)} altFrame /></div>}
        </div>
        {/* Text strip */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          {page.heading_text && <h3 className={`font-semibold ${style.heading} mr-3`}>{page.heading_text}</h3>}
          {page.body_text && <p className={`${style.body} text-xs line-clamp-1`}>{page.body_text}</p>}
        </div>
      </div>
    </PageShell>
  );
}
