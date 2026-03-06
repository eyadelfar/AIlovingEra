import PageShell from '../PageShell';
import { PhotoImg, Divider } from '../PageShell';

// ── Fallback: generic layout for any photo count ──────────────
// Dynamically computes a grid that adapts to any number of photos

function computeGrid(count) {
  // Returns { cols, rows } that best fills a page
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 1, rows: 2 };
  if (count === 3) return { cols: 2, rows: 2 }; // 2+1
  if (count === 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  if (count <= 12) return { cols: 4, rows: 3 };
  if (count <= 16) return { cols: 4, rows: 4 };
  if (count <= 20) return { cols: 5, rows: 4 };
  if (count <= 25) return { cols: 5, rows: 5 };
  // For very high counts, compute dynamically
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

function PhotoGrid({ photos, P, cols, hasText }) {
  const rows = Math.ceil(photos.length / cols);
  const gridRows = [];

  for (let r = 0; r < rows; r++) {
    const rowPhotos = photos.slice(r * cols, (r + 1) * cols);
    gridRows.push(rowPhotos);
  }

  return (
    <div className={`flex flex-col gap-1 ${hasText ? 'flex-[9]' : 'flex-1'} min-h-0`}>
      {gridRows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-1 flex-1 min-h-0">
          {row.map((photo, colIdx) => {
            const globalIdx = rowIdx * cols + colIdx;
            return (
              <div key={globalIdx} className="flex-1 h-full overflow-hidden rounded-lg min-w-0">
                <PhotoImg {...P(globalIdx)} altFrame={globalIdx % 2 === 1} />
              </div>
            );
          })}
          {/* Fill empty cells in the last row to maintain alignment */}
          {row.length < cols && Array.from({ length: cols - row.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-1 min-w-0" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function FallbackLayout({ page, photos, style, P }) {
  const count = photos.length;

  if (count === 0) {
    return (
      <PageShell style={style} className={`flex flex-col items-center justify-center ${style.innerPadding}`}>
        <div className="relative z-20 text-center max-w-sm">
          {page.heading_text && <h3 data-ts="heading" className={`font-semibold ${style.heading} mb-2`}>{page.heading_text}</h3>}
          {page.body_text && <p data-ts="body" className={`${style.body} text-sm leading-relaxed`}>{page.body_text}</p>}
        </div>
      </PageShell>
    );
  }

  if (count === 1) {
    return (
      <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
        <div className="relative z-20 flex flex-col h-full">
          <div className="overflow-hidden rounded-lg flex-[7.5] min-h-0"><PhotoImg {...P(0)} heroFrame /></div>
          <div className="flex-[2] flex flex-col items-center justify-center min-h-0 pt-3">
            <div className="flex flex-col items-center">
              {page.heading_text && <h3 data-ts="heading" className={`font-semibold ${style.heading} mb-1 text-center`}>{page.heading_text}</h3>}
              <Divider className={style.divider} />
              {page.body_text && <p data-ts="body" className={`${style.body} text-xs mt-2 text-center`}>{page.body_text}</p>}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (count === 2) {
    return (
      <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
        <div className="relative z-20 flex flex-col h-full gap-2">
          <div className="overflow-hidden rounded-lg flex-[4] min-h-0"><PhotoImg {...P(0)} heroFrame /></div>
          <div className="overflow-hidden rounded-lg flex-[3.5] min-h-0"><PhotoImg {...P(1)} altFrame /></div>
          <div className="flex-[1.5] flex items-center justify-center min-h-0 gap-3 px-3">
            <div className="flex items-center justify-center gap-3 text-center">
              {page.heading_text && <h3 data-ts="heading" className={`font-semibold ${style.heading} flex-shrink-0`}>{page.heading_text}</h3>}
              {page.body_text && <p data-ts="body" className={`${style.body} text-xs`}>{page.body_text}</p>}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (count <= 5) {
    return (
      <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
        <div className="relative z-20 flex flex-col h-full gap-2">
          <div className="flex gap-2 overflow-hidden flex-[5] min-h-0">
            <div className="w-[60%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(0)} heroFrame /></div>
            {photos[1] && <div className="w-[40%] h-full overflow-hidden rounded-lg"><PhotoImg {...P(1)} altFrame /></div>}
          </div>
          <div className={`flex gap-2 overflow-hidden ${count > 3 ? 'flex-[3]' : 'flex-[2.5]'} min-h-0`}>
            {photos.slice(2).map((photo, i) => (
              <div key={i + 2} className="flex-1 h-full overflow-hidden rounded-lg"><PhotoImg {...P(i + 2)} altFrame={i % 2 === 0} /></div>
            ))}
          </div>
          <div className="flex-[1.5] flex items-center justify-center min-h-0 gap-3 px-3">
            <div className="flex items-center justify-center gap-3 text-center">
              {page.heading_text && <h3 data-ts="heading" className={`font-semibold ${style.heading} flex-shrink-0`}>{page.heading_text}</h3>}
              {page.body_text && <p data-ts="body" className={`${style.body} text-xs`}>{page.body_text}</p>}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // 6+ photos: dynamic grid
  const { cols } = computeGrid(count);
  const hasText = !!(page.heading_text || page.caption_text);

  return (
    <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
      <div className="relative z-20 flex flex-col h-full gap-1">
        <PhotoGrid photos={photos} P={P} style={style} cols={cols} hasText={hasText} />
        {hasText && (
          <div className="flex-[1.5] flex items-center justify-center min-h-0 px-3">
            <div className="flex items-center justify-center gap-2 text-center">
              {page.heading_text && <h3 data-ts="heading" className={`font-semibold ${style.heading} text-center text-xs`}>{page.heading_text}</h3>}
              {page.caption_text && <p data-ts="caption" className={`text-[10px] ${style.caption}`}>{page.caption_text}</p>}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
