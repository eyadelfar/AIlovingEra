import { getObjectPosition } from '../../lib/photoUtils';
import { PAGE_ASPECT } from '../../lib/constants';
import { TEMPLATE_STYLES, TEMPLATE_PHOTO_FILTERS } from './templateStyles';
import PageShell from './PageShell';
import { PhotoImg, Divider, QuoteBlock } from './PageShell';
import LAYOUT_COMPONENTS from './layouts';
import FallbackLayout from './layouts/FallbackLayout';
import useBookStore from '../../stores/bookStore';

// Re-export for consumers (e.g. editor/PhotoSlot.jsx)
export { TEMPLATE_PHOTO_FILTERS };

const TEXT_LAYOUTS = new Set(['QUOTE_PAGE', 'DEDICATION', 'TOC_SIMPLE']);

export default function PageRenderer({ page, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides, anniversaryCoverText }) {
  const pageSize = useBookStore(s => s.designScale)?.pageSize;
  const aspect = PAGE_ASPECT[pageSize] || 'aspect-[3/4]';

  const isCover = page.page_type === 'cover';
  const isBackCover = page.page_type === 'back_cover';
  const layout = page.layout_type || 'HERO_FULLBLEED';
  const pageSide = page.page_side || '';
  const isTextOnly = TEXT_LAYOUTS.has(layout);
  const photoIndices = page.photo_indices || [];
  const photos = photoIndices.map(i => images[i]).filter(Boolean);

  const style = TEMPLATE_STYLES[templateSlug] || TEMPLATE_STYLES.romantic;
  const photoFilter = TEMPLATE_PHOTO_FILTERS[templateSlug] || '';

  const P = (i) => ({ photo: photos[i], photoIndex: photoIndices[i], slotIdx: i, style, filter: photoFilter, photoAnalyses, cropOverrides, filterOverrides });

  // ── Cover ─────────────────────────────────────────────────────────
  if (isCover) {
    return (
      <div className={`relative ${aspect} ${style.pageBg} rounded-xl overflow-hidden border ${style.pageBorder} ${style.pageTexture}`}>
        {photos[0] && (() => {
          const pos = getObjectPosition(photoIndices[0], photoAnalyses);
          const s = {};
          if (photoFilter) s.filter = photoFilter;
          if (pos) s.objectPosition = pos;
          return <img src={photos[0].previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={Object.keys(s).length ? s : undefined} />;
        })()}
        <div className={`absolute inset-0 ${style.coverOverlay}`} />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-10">
          <Divider className={`${style.divider} mb-4`} />
          <h2 className={`text-3xl font-bold ${style.heading} text-center mb-2 drop-shadow-lg`}>{page.heading_text}</h2>
          {page.body_text && <p className={`${style.caption} text-center drop-shadow-md text-sm`}>{page.body_text}</p>}
          {anniversaryCoverText && <p className={`${style.caption} text-center drop-shadow-md text-xs mt-2 opacity-80`}>{anniversaryCoverText}</p>}
        </div>
      </div>
    );
  }

  // ── Back cover ────────────────────────────────────────────────────
  if (isBackCover) {
    return (
      <PageShell style={style} className={`flex flex-col items-center justify-center ${style.innerPadding}`}>
        <div className="relative z-20 flex flex-col items-center max-w-xs">
          {page.heading_text && <h3 className={`text-2xl font-bold ${style.heading} mb-6 text-center`}>{page.heading_text}</h3>}
          <Divider className={style.divider} />
          {page.body_text && <p className={`${style.body} text-center italic max-w-sm mt-6 text-sm leading-relaxed`}>{page.body_text}</p>}
          {page.quote_text && <div className="mt-8"><QuoteBlock text={page.quote_text} style={style} /></div>}
        </div>
      </PageShell>
    );
  }

  // ── Left page (photos) for mixed layouts ──────────────────────────
  if (pageSide === 'left') {
    return (
      <PageShell style={style} className={`flex flex-col ${style.innerPadding}`}>
        <div className={`flex-1 min-h-0 grid ${photos.length > 4 ? 'grid-cols-3' : photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${style.photoGap} relative z-20`}>
          {photos.length > 0 ? photos.slice(0, 9).map((photo, i) => (
            <PhotoImg key={i} {...P(i)} altFrame={i % 2 === 1} />
          )) : (
            <div className="w-full h-full bg-gray-800/30 flex items-center justify-center rounded-lg"><span className="text-gray-600 text-sm">No photo</span></div>
          )}
        </div>
        {page.caption_text && <p className={`text-xs ${style.caption} text-center mt-3 relative z-20`}>{page.caption_text}</p>}
      </PageShell>
    );
  }

  // ── Right page (text/quote) for mixed layouts ─────────────────────
  if (pageSide === 'right') {
    return (
      <PageShell style={style} className={`flex flex-col items-center justify-center ${style.innerPadding}`}>
        <div className="relative z-20 flex flex-col items-center max-w-sm">
          {page.heading_text && <h3 className={`${style.headingLg} mb-3 text-center`}>{page.heading_text}</h3>}
          <Divider className={style.divider} />
          {page.body_text && <p className={`${style.body} leading-relaxed text-center mt-4 text-sm`}>{page.body_text}</p>}
          {page.quote_text && <div className="mt-8"><QuoteBlock text={page.quote_text} style={style} /></div>}
        </div>
      </PageShell>
    );
  }

  // ── Text-only pages (QUOTE_PAGE, DEDICATION, TOC) ─────────────────
  if (isTextOnly) {
    const isDedication = layout === 'DEDICATION';
    return (
      <PageShell style={style} className={`flex flex-col items-center justify-center ${style.innerPadding}`}>
        <div className="relative z-20 flex flex-col items-center max-w-sm">
          {page.heading_text && (
            <h3 className={`${isDedication ? 'text-2xl font-bold' : 'text-lg font-semibold'} ${style.heading} mb-4 text-center`}>
              {page.heading_text}
            </h3>
          )}
          <Divider className={style.divider} />
          {page.body_text && (
            <p className={`${style.body} leading-relaxed text-center mt-5 ${isDedication ? 'italic text-base' : 'text-sm'}`}>
              {page.body_text}
            </p>
          )}
          {page.quote_text && <div className="mt-8"><QuoteBlock text={page.quote_text} style={style} /></div>}
        </div>
      </PageShell>
    );
  }

  // ── Photo layouts — dispatch to dedicated layout component ─────────
  const LayoutComponent = LAYOUT_COMPONENTS[layout];
  const layoutProps = { page, photos, photoIndices, style, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P };

  // Named layouts require a minimum photo count (most need >= 2, HERO_FULLBLEED needs >= 1)
  const minPhotos = layout === 'HERO_FULLBLEED' ? 1 : (layout === 'PHOTO_PLUS_QUOTE' || layout === 'COLLAGE_PLUS_LETTER') ? 0 : 2;

  if (LayoutComponent && photos.length >= minPhotos) {
    return <LayoutComponent {...layoutProps} />;
  }

  // ── Fallback for unknown layouts or insufficient photos ───────────
  return <FallbackLayout {...layoutProps} />;
}
