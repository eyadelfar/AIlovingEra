import { getPageAspect } from '../../lib/constants';
import { useTranslation } from 'react-i18next';
import { TEMPLATE_STYLES, TEMPLATE_PHOTO_FILTERS, buildCustomStyle } from './templateStyles';
import { IMAGE_LOOK_CSS_FILTERS } from '../../lib/previewFilters';
import PageShell from './PageShell';
import { PhotoImg, Divider, QuoteBlock } from './PageShell';
import LAYOUT_COMPONENTS from './layouts';
import FallbackLayout from './layouts/FallbackLayout';
import useBookStore from '../../stores/bookStore';

// Re-export for consumers (e.g. editor/PhotoSlot.jsx)
export { TEMPLATE_PHOTO_FILTERS };

const TEXT_LAYOUTS = new Set(['QUOTE_PAGE', 'DEDICATION', 'TOC_SIMPLE']);

const FONT_SIZE_MAP = { xs: '!text-xs', sm: '!text-sm', base: '!text-base', lg: '!text-lg', xl: '!text-xl' };

const TEXT_WIDTH_MAP = { narrow: '60%', medium: '75%', wide: '90%', full: '100%' };

function getTextStyle(overrides, positionOffset) {
  if (!overrides && !positionOffset) return { className: '', inlineStyle: {} };
  const classes = [];
  const inlineStyle = {};
  if (overrides?.fontSize) classes.push(FONT_SIZE_MAP[overrides.fontSize] || '');
  if (overrides?.bold) classes.push('!font-bold');
  if (overrides?.italic) classes.push('!italic');
  if (overrides?.align) classes.push(`!text-${overrides.align}`);
  if (overrides?.color) inlineStyle.color = overrides.color;
  if (overrides?.maxWidth) inlineStyle.maxWidth = TEXT_WIDTH_MAP[overrides.maxWidth] || '100%';
  if (positionOffset) {
    // Support both legacy pixel {x,y} and new percentage {xPct,yPct} formats
    if ('xPct' in positionOffset || 'yPct' in positionOffset) {
      inlineStyle.transform = `translate(${positionOffset.xPct || 0}%, ${positionOffset.yPct || 0}%)`;
    } else if (positionOffset.x != null || positionOffset.y != null) {
      // Legacy pixel format — discard to avoid cross-view inconsistencies
    }
  }
  return { className: classes.join(' '), inlineStyle };
}

export default function PageRenderer({ page, images, templateSlug, photoAnalyses, cropOverrides, filterOverrides, anniversaryCoverText, chapterIdx, spreadIdx }) {
  const { t } = useTranslation('viewer');
  const pageSize = useBookStore(s => s.designScale)?.pageSize;
  const customPageSize = useBookStore(s => s.customPageSize);
  const isCustomSize = pageSize === 'custom' && customPageSize?.width > 0 && customPageSize?.height > 0;
  const aspect = isCustomSize ? '' : getPageAspect(pageSize);
  const coverAspectStyle = isCustomSize ? { aspectRatio: `${customPageSize.width} / ${customPageSize.height}` } : {};
  const textStyleOverrides = useBookStore(s => s.textStyleOverrides);
  const textPositionOffsets = useBookStore(s => s.textPositionOffsets);

  const isCover = page.page_type === 'cover';
  const isBackCover = page.page_type === 'back_cover';
  const layout = page.layout_type || 'HERO_FULLBLEED';
  const pageSide = page.page_side || '';
  const isTextOnly = TEXT_LAYOUTS.has(layout);
  const photoIndices = page.photo_indices || [];
  const photos = photoIndices.map(i => images[i]).filter(Boolean);

  const customTheme = useBookStore(s => s.customTheme);
  const imageLook = useBookStore(s => s.imageLook);
  const style = templateSlug === 'custom' ? buildCustomStyle(customTheme) : (TEMPLATE_STYLES[templateSlug] || TEMPLATE_STYLES.romantic);
  const templateFilter = TEMPLATE_PHOTO_FILTERS[templateSlug] || '';
  const lookFilter = imageLook && imageLook !== 'natural'
    ? IMAGE_LOOK_CSS_FILTERS[imageLook] || ''
    : '';
  const photoFilter = [lookFilter, templateFilter].filter(Boolean).join(' ');

  const P = (i) => ({ photo: photos[i], photoIndex: photoIndices[i], slotIdx: i, style, filter: photoFilter, photoAnalyses, cropOverrides, filterOverrides });

  // Text style override helpers (includes text position offsets)
  const tsKey = (field) => chapterIdx != null && spreadIdx != null ? `${chapterIdx}-${spreadIdx}-${field}` : null;
  const ts = (field) => {
    const key = tsKey(field);
    return getTextStyle(key ? textStyleOverrides[key] : null, key ? textPositionOffsets[key] : null);
  };

  // ── Cover ─────────────────────────────────────────────────────────
  if (isCover) {
    return (
      <div className={`relative ${aspect} ${style.pageBg} rounded-xl overflow-hidden border ${style.pageBorder} ${style.pageTexture}`} style={coverAspectStyle}>
        {photos[0] && (() => {
          const s = {};
          if (photoFilter) s.filter = photoFilter;
          return <img src={photos[0].previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={Object.keys(s).length ? s : undefined} />;
        })()}
        <div className={`absolute inset-0 ${style.coverOverlay}`} />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-10">
          <Divider className={`${style.divider} mb-4`} />
          <h2 data-ts="heading" className={`text-3xl font-bold ${style.heading} text-center mb-2 drop-shadow-lg`}>{page.heading_text}</h2>
          {page.body_text && <p data-ts="body" className={`${style.caption} text-center drop-shadow-md text-sm`}>{page.body_text}</p>}
          {anniversaryCoverText && <p data-ts="caption" className={`${style.caption} text-center drop-shadow-md text-xs mt-2 opacity-80`}>{anniversaryCoverText}</p>}
        </div>
      </div>
    );
  }

  // ── Back cover ────────────────────────────────────────────────────
  if (isBackCover) {
    const headingTs = ts('heading_text');
    const bodyTs = ts('body_text');
    return (
      <PageShell style={style} className={`flex flex-col items-center justify-center ${style.innerPadding}`}>
        <div className="relative z-20 flex flex-col items-center max-w-xs">
          {page.heading_text && <h3 data-ts="heading" className={`text-2xl font-bold ${style.heading} mb-6 text-center ${headingTs.className}`} style={headingTs.inlineStyle}>{page.heading_text}</h3>}
          <Divider className={style.divider} />
          {page.body_text && <p data-ts="body" className={`${style.body} text-center italic max-w-sm mt-6 text-sm leading-relaxed ${bodyTs.className}`} style={bodyTs.inlineStyle}>{page.body_text}</p>}
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
            <div className="w-full h-full bg-gray-800/30 flex items-center justify-center rounded-lg"><span className="text-gray-600 text-sm">{t('noPhoto')}</span></div>
          )}
        </div>
        {page.caption_text && <p data-ts="caption" className={`text-xs ${style.caption} text-center mt-3 relative z-20`}>{page.caption_text}</p>}
      </PageShell>
    );
  }

  // ── Right page (text/quote) for mixed layouts ─────────────────────
  if (pageSide === 'right') {
    const headingTs = ts('heading_text');
    const bodyTs = ts('body_text');
    return (
      <PageShell style={style} className={`flex flex-col items-center justify-center ${style.innerPadding}`}>
        <div className="relative z-20 flex flex-col items-center max-w-sm">
          {page.heading_text && <h3 data-ts="heading" className={`${style.headingLg} mb-3 text-center ${headingTs.className}`} style={headingTs.inlineStyle}>{page.heading_text}</h3>}
          <Divider className={style.divider} />
          {page.body_text && <p data-ts="body" className={`${style.body} leading-relaxed text-center mt-4 text-sm ${bodyTs.className}`} style={bodyTs.inlineStyle}>{page.body_text}</p>}
          {page.quote_text && <div className="mt-8"><QuoteBlock text={page.quote_text} style={style} /></div>}
        </div>
      </PageShell>
    );
  }

  // ── Text-only pages (QUOTE_PAGE, DEDICATION, TOC) ─────────────────
  if (isTextOnly) {
    const isDedication = layout === 'DEDICATION';
    const headingTs = ts('heading_text');
    const bodyTs = ts('body_text');
    return (
      <PageShell style={style} className={`flex flex-col items-center justify-center ${style.innerPadding}`}>
        <div className="relative z-20 flex flex-col items-center max-w-sm">
          {page.heading_text && (
            <h3 data-ts="heading" className={`${isDedication ? 'text-2xl font-bold' : 'text-lg font-semibold'} ${style.heading} mb-4 text-center ${headingTs.className}`} style={headingTs.inlineStyle}>
              {page.heading_text}
            </h3>
          )}
          <Divider className={style.divider} />
          {page.body_text && (
            <p data-ts="body" className={`${style.body} leading-relaxed text-center mt-5 ${isDedication ? 'italic text-base' : 'text-sm'} ${bodyTs.className}`} style={bodyTs.inlineStyle}>
              {page.body_text}
            </p>
          )}
          {page.quote_text && <div className="mt-8"><QuoteBlock text={page.quote_text} style={style} /></div>}
        </div>
      </PageShell>
    );
  }

  // ── Photo layouts — dispatch to dedicated layout component ─────────
  // Augment style tokens with text style overrides for layout components
  const headingO = ts('heading_text');
  const bodyO = ts('body_text');
  const captionO = ts('caption_text');
  const augStyle = { ...style };
  if (headingO.className) { augStyle.heading = `${style.heading} ${headingO.className}`; augStyle.headingLg = `${style.headingLg} ${headingO.className}`; }
  if (bodyO.className) augStyle.body = `${style.body} ${bodyO.className}`;
  if (captionO.className) augStyle.caption = `${style.caption} ${captionO.className}`;

  const colorStyle = {};
  if (headingO.inlineStyle.color) colorStyle['--ts-heading'] = headingO.inlineStyle.color;
  if (bodyO.inlineStyle.color) colorStyle['--ts-body'] = bodyO.inlineStyle.color;
  if (captionO.inlineStyle.color) colorStyle['--ts-caption'] = captionO.inlineStyle.color;
  const hasColorOverrides = Object.keys(colorStyle).length > 0;

  const LayoutComponent = LAYOUT_COMPONENTS[layout];
  const layoutProps = { page, photos, photoIndices, style: augStyle, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P };

  // Named layouts require a minimum photo count (most need >= 2, HERO_FULLBLEED needs >= 1)
  const minPhotos = layout === 'HERO_FULLBLEED' ? 1 : (layout === 'PHOTO_PLUS_QUOTE' || layout === 'COLLAGE_PLUS_LETTER') ? 0 : 2;

  const colorWrapClass = [
    colorStyle['--ts-heading'] ? '[&_[data-ts=heading]]:[color:var(--ts-heading)]' : '',
    colorStyle['--ts-body'] ? '[&_[data-ts=body]]:[color:var(--ts-body)]' : '',
    colorStyle['--ts-caption'] ? '[&_[data-ts=caption]]:[color:var(--ts-caption)]' : '',
  ].filter(Boolean).join(' ');

  if (LayoutComponent && photos.length >= minPhotos) {
    return hasColorOverrides
      ? <div style={colorStyle} className={colorWrapClass}><LayoutComponent {...layoutProps} /></div>
      : <LayoutComponent {...layoutProps} />;
  }

  // ── Fallback for unknown layouts or insufficient photos ───────────
  return hasColorOverrides
    ? <div style={colorStyle} className={colorWrapClass}><FallbackLayout {...layoutProps} /></div>
    : <FallbackLayout {...layoutProps} />;
}
