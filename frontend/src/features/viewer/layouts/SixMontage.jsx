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
export default function SixMontage({ page, photos, style, P }) {
  const p = photos.slice(0, 6);
  return (
    <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
      <div className="relative z-20 flex flex-col h-full gap-2">
        {/* Row 1: wide + narrow */}
        <div className="flex gap-2 overflow-hidden flex-[2.5] min-h-0">
          <div className="w-[62%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(0)} heroFrame /></div>
          {p[1] && <div className="w-[38%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(1)} altFrame /></div>}
        </div>
        {/* Row 2: narrow + wide (reversed) */}
        <div className="flex gap-2 overflow-hidden flex-[2.5] min-h-0">
          {p[2] && <div className="w-[38%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(2)} /></div>}
          {p[3] && <div className="w-[62%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(3)} altFrame /></div>}
        </div>
        {/* Row 3: equal pair */}
        <div className="flex gap-2 overflow-hidden flex-[2] min-h-0">
          {p[4] && <div className="w-[50%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(4)} /></div>}
          {p[5] && <div className="w-[50%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(5)} altFrame /></div>}
        </div>
        {/* Text strip */}
        <div className="flex-[1.5] flex items-center justify-center min-h-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/15 to-transparent rounded-b-xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
            {page.heading_text && <h3 data-ts="heading" className={`font-semibold ${style.heading} mb-1`}>{page.heading_text}</h3>}
            {page.body_text && <p data-ts="body" className={`${style.body} text-xs line-clamp-2`}>{page.body_text}</p>}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
