import PageShell from '../PageShell';
import { PhotoImg } from '../PageShell';

// ── WALL_8_10: Dense mosaic — varied cell sizes ───────────────────
//
//   +----------------------+
//   | +----++----------+   |  <- P1(small) + P2(wide span)
//   | | P1 ||   P2     |   |
//   | +----++----------+   |
//   | | P3 |+----++----+   |  <- P3 + P4 + P5
//   | |    || P4 || P5 |   |
//   | +----++----++----+   |
//   | +---------++----+    |  <- P6(wide) + P7
//   | |   P6    || P7 |    |
//   | +---------++----+    |
//   | +----++----++----+   |  <- P8 + P9 + P10
//   | | P8 ||P9  ||P10 |  |
//   | +----++----++----+   |
//   +----------------------+
//
export default function Wall({ page, photos, photoIndices, style, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P }) {
  const p = photos.slice(0, 10);
  return (
    <PageShell style={style} className={`${style.innerPadding}`}>
      <div className="relative z-20 h-full grid grid-cols-4 grid-rows-4 gap-1.5">
        {/* Row 1 */}
        {p[0] && <div className="col-span-1 row-span-1 overflow-hidden rounded-md"><PhotoImg {...P(0)} /></div>}
        {p[1] && <div className="col-span-3 row-span-1 overflow-hidden rounded-md"><PhotoImg {...P(1)} altFrame /></div>}
        {/* Row 2 */}
        {p[2] && <div className="col-span-1 row-span-1 overflow-hidden rounded-md"><PhotoImg {...P(2)} /></div>}
        {p[3] && <div className="col-span-2 row-span-1 overflow-hidden rounded-md"><PhotoImg {...P(3)} altFrame /></div>}
        {p[4] && <div className="col-span-1 row-span-1 overflow-hidden rounded-md"><PhotoImg {...P(4)} /></div>}
        {/* Row 3 */}
        {p[5] && <div className="col-span-2 row-span-1 overflow-hidden rounded-md"><PhotoImg {...P(5)} heroFrame /></div>}
        {p[6] && <div className="col-span-2 row-span-1 overflow-hidden rounded-md"><PhotoImg {...P(6)} altFrame /></div>}
        {/* Row 4 */}
        {p[7] && <div className="col-span-1 row-span-1 overflow-hidden rounded-md"><PhotoImg {...P(7)} /></div>}
        {p[8] && <div className="col-span-2 row-span-1 overflow-hidden rounded-md"><PhotoImg {...P(8)} altFrame /></div>}
        {p[9] && <div className="col-span-1 row-span-1 overflow-hidden rounded-md"><PhotoImg {...P(9)} /></div>}
      </div>
    </PageShell>
  );
}
