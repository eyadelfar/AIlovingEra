import PageShell from '../PageShell';
import { PhotoImg, Divider, QuoteBlock } from '../PageShell';

// ── TWO_BALANCED: Editorial diagonal flow ─────────────────────────
//
//   +----------------------+
//   |  +-------------+     |
//   |  |  Photo 1    |     |  <- hero, 62% width, left-aligned
//   |  |  (large)    |     |
//   |  +-------------+     |
//   |                      |
//   |     heading          |
//   |     -- divider --    |
//   |     body text        |
//   |                      |
//   |     +----------+     |
//   |     | Photo 2  |     |  <- supporting, 52% width, right-aligned
//   |     |          |     |
//   |     +----------+     |
//   |         caption      |
//   +----------------------+
//
export default function TwoBalanced({ page, photos, photoIndices, style, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P }) {
  return (
    <PageShell style={style} className={`${style.innerPadding} flex flex-col`}>
      <div className="relative z-20 flex flex-col h-full">
        {/* Photo 1 — hero, left-aligned, portrait-friendly */}
        <div className="flex justify-start" style={{ height: '38%' }}>
          <div className="w-[62%] h-full overflow-hidden rounded-lg">
            <PhotoImg {...P(0)} heroFrame />
          </div>
        </div>

        {/* Breathing space — text */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-0">
          {page.heading_text && <h3 className={`font-semibold ${style.headingLg} mb-2 text-center`}>{page.heading_text}</h3>}
          <Divider className={style.divider} />
          {page.body_text && <p className={`${style.body} text-sm leading-relaxed text-center mt-2 line-clamp-3 max-w-sm`}>{page.body_text}</p>}
          {page.quote_text && <div className="mt-3"><QuoteBlock text={page.quote_text} style={style} compact /></div>}
        </div>

        {/* Photo 2 — smaller, right-aligned for diagonal flow */}
        <div className="flex justify-end" style={{ height: '34%' }}>
          <div className="w-[52%] h-full overflow-hidden rounded-lg">
            <PhotoImg {...P(1)} altFrame />
          </div>
        </div>

        {page.caption_text && <p className={`text-xs ${style.caption} text-right mt-1.5`}>{page.caption_text}</p>}
      </div>
    </PageShell>
  );
}
