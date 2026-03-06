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

const TEXT_WIDTH_MAP = { narrow: '60%', medium: '75%', wide: '90%', full: '100%' };

function getTextStyle(overrides, positionOffset) {
  if (!overrides && !positionOffset) return { className: '', inlineStyle: {} };
  const classes = [];
  const inlineStyle = {};
  // Font size: numeric px values applied via inline style (always wins over CSS)
  if (overrides?.fontSize) {
    const size = typeof overrides.fontSize === 'number' ? overrides.fontSize : parseInt(overrides.fontSize);
    if (!isNaN(size)) inlineStyle.fontSize = `${size}px`;
  }
  if (overrides?.bold) classes.push('!font-bold');
  if (overrides?.italic) classes.push('!italic');
  if (overrides?.underline) classes.push('!underline');
  // Alignment: use inline style so it always overrides layout CSS classes
  // Also set width:100% so text-align is visible inside flex items-center parents
  if (overrides?.align) { inlineStyle.textAlign = overrides.align; inlineStyle.width = '100%'; }
  if (overrides?.color) inlineStyle.color = overrides.color;
  if (overrides?.fontFamily) inlineStyle.fontFamily = overrides.fontFamily;
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
  const isBookCoverFront = page.page_type === 'book_cover_front';
  const isBookCoverBack = page.page_type === 'book_cover_back';
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

  const P = (i) => ({
    photo: photos[i], photoIndex: photoIndices[i], slotIdx: i,
    slotKey: chapterIdx != null && spreadIdx != null ? `${chapterIdx}-${spreadIdx}-${i}` : undefined,
    style, filter: photoFilter, photoAnalyses, cropOverrides, filterOverrides,
  });

  // Text style override helpers (includes text position offsets)
  const tsKey = (field) => chapterIdx != null && spreadIdx != null ? `${chapterIdx}-${spreadIdx}-${field}` : null;
  const ts = (field) => {
    const key = tsKey(field);
    return getTextStyle(key ? textStyleOverrides[key] : null, key ? textPositionOffsets[key] : null);
  };

  // ── Book Front Cover (decorative themed cover) ──────────────────
  if (isBookCoverFront) {
    return (
      <div className={`relative ${aspect} rounded-xl overflow-hidden border ${style.pageBorder}`} style={coverAspectStyle}>
        {/* Rich background layers */}
        <div className={`absolute inset-0 ${style.pageBg}`} />
        {style.bgPattern && <div className="absolute inset-0" style={{ backgroundImage: style.bgPattern }} />}
        <div className={`absolute inset-0 ${style.pageTexture}`} />

        {/* Decorative border inset */}
        <div className="absolute inset-3 border border-current opacity-15 rounded-lg" style={{ borderColor: style.ornamentStroke }} />
        <div className="absolute inset-5 border border-current opacity-10 rounded" style={{ borderColor: style.ornamentStroke }} />

        {/* Corner ornaments */}
        <svg className="absolute top-4 left-4 w-10 h-10 opacity-20" viewBox="0 0 40 40">
          <path d="M0 40 Q0 0 40 0" fill="none" stroke={style.ornamentStroke} strokeWidth="1.5" />
          <path d="M5 35 Q5 5 35 5" fill="none" stroke={style.ornamentStroke} strokeWidth="0.8" />
        </svg>
        <svg className="absolute top-4 right-4 w-10 h-10 opacity-20" viewBox="0 0 40 40" style={{ transform: 'scaleX(-1)' }}>
          <path d="M0 40 Q0 0 40 0" fill="none" stroke={style.ornamentStroke} strokeWidth="1.5" />
          <path d="M5 35 Q5 5 35 5" fill="none" stroke={style.ornamentStroke} strokeWidth="0.8" />
        </svg>
        <svg className="absolute bottom-4 left-4 w-10 h-10 opacity-20" viewBox="0 0 40 40" style={{ transform: 'scaleY(-1)' }}>
          <path d="M0 40 Q0 0 40 0" fill="none" stroke={style.ornamentStroke} strokeWidth="1.5" />
          <path d="M5 35 Q5 5 35 5" fill="none" stroke={style.ornamentStroke} strokeWidth="0.8" />
        </svg>
        <svg className="absolute bottom-4 right-4 w-10 h-10 opacity-20" viewBox="0 0 40 40" style={{ transform: 'scale(-1, -1)' }}>
          <path d="M0 40 Q0 0 40 0" fill="none" stroke={style.ornamentStroke} strokeWidth="1.5" />
          <path d="M5 35 Q5 5 35 5" fill="none" stroke={style.ornamentStroke} strokeWidth="0.8" />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10 z-10">
          {/* Top ornament */}
          <svg className="w-24 h-6 mb-6 opacity-30" viewBox="0 0 100 20">
            <path d="M0 10 Q25 0 50 10 Q75 20 100 10" fill="none" stroke={style.ornamentStroke} strokeWidth="1" />
            <circle cx="50" cy="10" r="2" fill={style.ornamentStroke} />
          </svg>

          {/* Title */}
          {page.heading_text && (
            <h2 data-ts="heading" className={`text-3xl md:text-4xl font-bold ${style.heading} text-center mb-3 drop-shadow-lg ${ts('heading_text').className}`} style={{ lineHeight: 1.3, ...ts('heading_text').inlineStyle }}>
              {page.heading_text}
            </h2>
          )}

          {/* Divider */}
          <div className={`${style.divider} my-4`} />

          {/* Partner names / subtitle */}
          {page.body_text && (
            <p data-ts="body" className={`text-lg ${style.body} text-center italic opacity-80 ${ts('body_text').className}`} style={ts('body_text').inlineStyle}>
              {page.body_text}
            </p>
          )}

          {/* Bottom ornament */}
          <svg className="w-24 h-6 mt-6 opacity-30" viewBox="0 0 100 20">
            <path d="M0 10 Q25 20 50 10 Q75 0 100 10" fill="none" stroke={style.ornamentStroke} strokeWidth="1" />
            <circle cx="50" cy="10" r="2" fill={style.ornamentStroke} />
          </svg>
        </div>

        {/* Spine shadow on right edge */}
        <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/20 to-transparent" />
      </div>
    );
  }

  // ── Book Back Cover (leather-like closing) ─────────────────────
  if (isBookCoverBack) {
    return (
      <div className={`relative ${aspect} rounded-xl overflow-hidden border border-amber-900/40`} style={coverAspectStyle}>
        {/* Leather-like background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-yellow-950 to-amber-950" />
        {/* Leather grain texture via repeating gradients */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `
            radial-gradient(ellipse at 20% 50%, rgba(120,80,40,0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 30%, rgba(100,60,30,0.2) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 80%, rgba(140,90,50,0.25) 0%, transparent 45%),
            repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(80,50,20,0.05) 3px, rgba(80,50,20,0.05) 4px)
          `,
        }} />
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
          backgroundSize: '150px 150px',
        }} />

        {/* Embossed border inset */}
        <div className="absolute inset-4 border border-amber-700/30 rounded-lg" />
        <div className="absolute inset-6 border border-amber-800/20 rounded" />

        {/* Center emblem / logo area */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {/* Diamond ornament */}
          <svg className="w-16 h-16 opacity-25" viewBox="0 0 60 60">
            <rect x="15" y="15" width="30" height="30" transform="rotate(45 30 30)" fill="none" stroke="rgba(180,140,80,0.6)" strokeWidth="1" />
            <rect x="20" y="20" width="20" height="20" transform="rotate(45 30 30)" fill="none" stroke="rgba(180,140,80,0.4)" strokeWidth="0.5" />
            <circle cx="30" cy="30" r="3" fill="rgba(180,140,80,0.3)" />
          </svg>
          <p className="mt-4 text-amber-600/30 text-xs tracking-[0.3em] uppercase font-serif">KeepSqueak</p>
        </div>

        {/* Spine shadow on left edge */}
        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/30 to-transparent" />
      </div>
    );
  }

  // ── Cover ─────────────────────────────────────────────────────────
  if (isCover) {
    return (
      <div className={`relative ${aspect} ${style.pageBg} rounded-xl overflow-hidden border ${style.pageBorder} ${style.pageTexture}`} style={coverAspectStyle}>
        {photos[0] && (() => {
          const s = {};
          if (photoFilter) s.filter = photoFilter;
          return <img src={photos[0].previewUrl} alt="" className="absolute inset-0 w-full h-full object-contain" style={Object.keys(s).length ? s : undefined} />;
        })()}
        <div className={`absolute inset-0 ${style.coverOverlay}`} />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-10">
          <Divider className={`${style.divider} mb-4`} />
          <h2 data-ts="heading" className={`text-3xl font-bold ${style.heading} text-center mb-2 drop-shadow-lg ${ts('heading_text').className}`} style={ts('heading_text').inlineStyle}>{page.heading_text}</h2>
          {page.body_text && <p data-ts="body" className={`${style.caption} text-center drop-shadow-md text-sm ${ts('body_text').className}`} style={ts('body_text').inlineStyle}>{page.body_text}</p>}
          {anniversaryCoverText && <p data-ts="caption" className={`${style.caption} text-center drop-shadow-md text-xs mt-2 opacity-80 ${ts('caption_text').className}`} style={ts('caption_text').inlineStyle}>{anniversaryCoverText}</p>}
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
  const quoteO = ts('quote_text');
  const augStyle = { ...style };
  if (headingO.className) { augStyle.heading = `${style.heading} ${headingO.className}`; augStyle.headingLg = `${style.headingLg} ${headingO.className}`; }
  if (bodyO.className) augStyle.body = `${style.body} ${bodyO.className}`;
  if (captionO.className) augStyle.caption = `${style.caption} ${captionO.className}`;

  // Build scoped CSS rules targeting [data-ts=*] elements inside this page.
  // Uses !important to override Tailwind utility classes (text-xs, text-center, etc.)
  // applied directly on elements inside layout components.
  const cssRules = [];
  const FIELDS = [
    { key: 'heading', o: headingO },
    { key: 'body', o: bodyO },
    { key: 'caption', o: captionO },
    { key: 'quote', o: quoteO },
  ];

  for (const { key, o } of FIELDS) {
    const s = o.inlineStyle;
    if (!s || Object.keys(s).length === 0) continue;
    const props = [];
    if (s.color)     props.push(`color:${s.color}`);
    if (s.fontSize)  props.push(`font-size:${s.fontSize}`);
    if (s.textAlign) { props.push(`text-align:${s.textAlign}`); props.push('width:100%'); }
    if (s.maxWidth)  props.push(`max-width:${s.maxWidth}`);
    if (s.transform) props.push(`transform:${s.transform}`);
    if (props.length > 0) {
      cssRules.push(`[data-ts="${key}"]{${props.map(p => p + ' !important').join(';')}}`);
    }
  }

  // Unique scope class to prevent style leaking across pages
  const scopeId = chapterIdx != null && spreadIdx != null ? `ts-${chapterIdx}-${spreadIdx}` : '';
  const scopedCss = cssRules.length > 0 && scopeId
    ? cssRules.map(r => `.${scopeId} ${r}`).join('\n')
    : '';

  const LayoutComponent = LAYOUT_COMPONENTS[layout];
  const layoutProps = { page, photos, photoIndices, style: augStyle, photoFilter, photoAnalyses, cropOverrides, filterOverrides, P };

  // Named layouts require a minimum photo count (most need >= 2, HERO_FULLBLEED needs >= 1)
  const minPhotos = layout === 'HERO_FULLBLEED' ? 1 : (layout === 'PHOTO_PLUS_QUOTE' || layout === 'COLLAGE_PLUS_LETTER') ? 0 : 2;

  // Always render a stable wrapper div (prevents React tree destruction when overrides toggle).
  // The <style> tag updates its content reactively; the wrapper structure stays constant.
  const content = (LayoutComponent && photos.length >= minPhotos)
    ? <LayoutComponent {...layoutProps} />
    : <FallbackLayout {...layoutProps} />;

  if (scopeId) {
    return (
      <div className={scopeId}>
        {scopedCss && <style dangerouslySetInnerHTML={{ __html: scopedCss }} />}
        {content}
      </div>
    );
  }

  return content;
}
