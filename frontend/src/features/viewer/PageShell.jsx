import { useState, useEffect, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { buildFilterCSS, buildVignetteStyle, getGrainOpacity } from '../../lib/filterUtils';
import { getPageAspect } from '../../lib/constants';
import { PageOrnaments, PageBgPattern } from './PageOrnaments';
import { useEditMode } from './EditModeContext';
import { useSelection } from './SelectionContext';
import useBookStore from '../../stores/bookStore';

const BLEND_RECIPES = {
  romantic: {
    overlayColor: 'rgba(76, 5, 25, 0.40)',
    mixBlendMode: 'multiply',
    hueRotate: '-5deg',
    saturate: 1.12,
    gradientStops: 'transparent 10%, rgba(76, 5, 25, 0.50) 75%',
    maskStyle: 'radial-gradient(ellipse at center, transparent 5%, black 70%)',
  },
  vintage: {
    overlayColor: 'rgba(69, 26, 3, 0.40)',
    mixBlendMode: 'color',
    hueRotate: '15deg',
    saturate: 0.75,
    extraFilter: 'sepia(0.3)',
    gradientStops: 'transparent 10%, rgba(69, 26, 3, 0.50) 75%',
    maskStyle: 'radial-gradient(ellipse at center, transparent 5%, black 70%)',
  },
  elegant: {
    overlayColor: 'rgba(2, 6, 23, 0.40)',
    mixBlendMode: 'luminosity',
    hueRotate: '0deg',
    saturate: 0.6,
    gradientStops: 'transparent 10%, rgba(2, 6, 23, 0.50) 75%',
    maskStyle: 'radial-gradient(ellipse at center, transparent 5%, black 70%)',
  },
  meme_funny: {
    overlayColor: 'rgba(46, 16, 101, 0.40)',
    mixBlendMode: 'overlay',
    hueRotate: '20deg',
    saturate: 1.2,
    gradientStops: 'transparent 10%, rgba(46, 16, 101, 0.50) 75%',
    maskStyle: 'radial-gradient(ellipse at center, transparent 5%, black 70%)',
  },
  cinematic: {
    overlayColor: 'rgba(15, 10, 2, 0.40)',
    mixBlendMode: 'multiply',
    hueRotate: '30deg',
    saturate: 0.85,
    extraFilter: 'contrast(1.1)',
    gradientStops: 'transparent 10%, rgba(15, 10, 2, 0.50) 75%',
    maskStyle: 'radial-gradient(ellipse at center, transparent 5%, black 70%)',
  },
  minimal: {
    overlayColor: 'rgba(168, 162, 158, 0.25)',
    mixBlendMode: 'luminosity',
    hueRotate: '0deg',
    saturate: 0.8,
    gradientStops: 'transparent 10%, rgba(168, 162, 158, 0.35) 75%',
    maskStyle: 'radial-gradient(ellipse at center, transparent 5%, black 70%)',
  },
};

/** Derive a blend recipe from a custom theme's pageBgColor (hex string). */
function buildCustomBlendRecipe(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate hue from RGB
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    if (max === rn) hue = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) hue = ((bn - rn) / d + 2) * 60;
    else hue = ((rn - gn) / d + 4) * 60;
  }

  return {
    overlayColor: `rgba(${r}, ${g}, ${b}, 0.40)`,
    mixBlendMode: 'multiply',
    hueRotate: `${Math.round(hue)}deg`,
    saturate: 1.1,
    gradientStops: `transparent 10%, rgba(${r}, ${g}, ${b}, 0.50) 75%`,
    maskStyle: 'radial-gradient(ellipse at center, transparent 5%, black 70%)',
  };
}

export function PhotoLightbox({ src, onClose }) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-label="Photo lightbox"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Close lightbox"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      <img src={src} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
    </div>
  );
}

export function Divider({ className }) {
  return <div className={className} />;
}

export function QuoteBlock({ text, style, compact }) {
  if (!text) return null;
  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-0' : 'gap-1'}`}>
      <span className={style.quoteMark}>&ldquo;</span>
      <p className={`${style.quoteText} text-center max-w-xs -mt-2 ${compact ? 'text-sm' : ''}`}>{text}</p>
    </div>
  );
}

const stripFrameClasses = (cls) =>
  cls.split(' ').filter(c => !c.match(/^(border|rounded)/)).join(' ');

function PhotoImgCore({ photo, imgStyle, frame, className, vignetteStyle, grainOpacity, userFilter, blendPhotos, blendRecipe }) {
  // When blending, strip border and rounded classes for seamless edges
  const effectiveFrame = blendPhotos ? stripFrameClasses(frame) : frame;

  // Build the img filter string when blend is active
  const blendImgStyle = { ...imgStyle };
  if (blendPhotos && blendRecipe) {
    const parts = [];
    if (blendRecipe.hueRotate && blendRecipe.hueRotate !== '0deg') parts.push(`hue-rotate(${blendRecipe.hueRotate})`);
    if (blendRecipe.saturate != null && blendRecipe.saturate !== 1) parts.push(`saturate(${blendRecipe.saturate})`);
    if (blendRecipe.extraFilter) parts.push(blendRecipe.extraFilter);
    if (parts.length > 0) {
      // Append to any existing filter from user adjustments
      blendImgStyle.filter = blendImgStyle.filter
        ? `${blendImgStyle.filter} ${parts.join(' ')}`
        : parts.join(' ');
    }
  }

  return (
    <div className={`overflow-hidden ${effectiveFrame} relative ${className}`}>
      <img
        src={photo.previewUrl}
        alt=""
        className="w-full h-full object-cover"
        style={Object.keys(blendImgStyle).length > 0 ? blendImgStyle : undefined}
      />
      {/* Layer 1: Color overlay with mix-blend-mode */}
      {blendPhotos && blendRecipe && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: blendRecipe.overlayColor,
            mixBlendMode: blendRecipe.mixBlendMode,
          }}
        />
      )}
      {/* Layer 2: Gradient edge fade with mask */}
      {blendPhotos && blendRecipe && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${blendRecipe.gradientStops})`,
            maskImage: blendRecipe.maskStyle,
            WebkitMaskImage: blendRecipe.maskStyle,
          }}
        />
      )}
      {userFilter?.vignette > 0 && <div style={vignetteStyle} />}
      {grainOpacity > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          opacity: grainOpacity, mixBlendMode: 'overlay',
        }} />
      )}
    </div>
  );
}

const MIN_SIZE = 60;

/** Normalize position offsets: supports both legacy {x,y} pixel and new {xPct,yPct} percentage formats. */
function normalizeOffset(offset) {
  if (!offset) return null;
  if ('xPct' in offset || 'yPct' in offset) return offset;
  // Legacy pixel format — discard since we can't convert without knowing container size
  return null;
}

/** Normalize size overrides: supports both legacy {width,height} pixel and new {widthPct,heightPct} percentage formats. */
function normalizeSize(size) {
  if (!size) return null;
  if ('widthPct' in size || 'heightPct' in size) return size;
  // Legacy pixel format — discard
  return null;
}

/** Get the nearest ancestor that represents the page container for percentage calculations. */
function getPageContainer(el) {
  return el?.closest('[class*="aspect-"]') || el?.parentElement;
}

export function PhotoImg({ photo, photoIndex, style, altFrame, heroFrame, filter, photoAnalyses, cropOverrides, filterOverrides, slotKey, slotIdx, className = '' }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const editMode = useEditMode();
  const selection = useSelection();
  const containerRef = useRef(null);
  const storeState = useBookStore(
    useShallow(s => ({
      globalBlend: s.blendPhotos,
      blendOverrides: s.blendOverrides,
      positionOffsets: s.positionOffsets,
      setPositionOffset: s.setPositionOffset,
      sizeOverrides: s.sizeOverrides,
      setSizeOverride: s.setSizeOverride,
      selectedTemplate: s.selectedTemplate,
      bookDraftTemplate: s.bookDraft?.template_slug,
      customTheme: s.customTheme,
    })),
  );
  const { globalBlend, blendOverrides, positionOffsets, setPositionOffset, sizeOverrides, setSizeOverride, selectedTemplate, bookDraftTemplate, customTheme } = storeState;
  const templateKey = selectedTemplate || bookDraftTemplate || 'romantic';
  const blendRecipe = templateKey === 'custom' && customTheme?.pageBgColor
    ? buildCustomBlendRecipe(customTheme.pageBgColor)
    : BLEND_RECIPES[templateKey] || BLEND_RECIPES.romantic;

  const frame = heroFrame ? style.photoFrameHero : altFrame ? style.photoFrameAlt : style.photoFrame;

  const editChapterIdx = editMode?.chapterIdx;
  const editSpreadIdx = editMode?.spreadIdx;
  const computedSlotKey = (editChapterIdx != null && editSpreadIdx != null && slotIdx != null)
    ? `${editChapterIdx}-${editSpreadIdx}-${slotIdx}`
    : slotKey;

  const userFilter = computedSlotKey && filterOverrides?.[computedSlotKey];
  const effectiveFilter = userFilter ? buildFilterCSS(userFilter) : filter;

  const userCrop = computedSlotKey && cropOverrides?.[computedSlotKey];
  const imgStyle = {};
  if (effectiveFilter) imgStyle.filter = effectiveFilter;

  if (userCrop) {
    imgStyle.transform = `scale(${userCrop.zoom}) translate(${userCrop.panX}%, ${userCrop.panY}%)`;
    imgStyle.transformOrigin = 'center';
  }

  const vignetteStyle = userFilter ? buildVignetteStyle(userFilter.vignette) : {};
  const grainOpacity = userFilter ? getGrainOpacity(userFilter.grain) : 0;

  // Per-image blend: override takes precedence, fallback to global
  const blendForThisPhoto = computedSlotKey && blendOverrides[computedSlotKey] != null
    ? blendOverrides[computedSlotKey]
    : globalBlend;
  const posOffset = computedSlotKey && positionOffsets[computedSlotKey];

  const isInteractive = editMode?.isEditMode && editChapterIdx != null && editSpreadIdx != null && slotIdx != null && selection;
  const isSelected = isInteractive && selection?.selected?.type === 'photo' && selection.selected.slotKey === computedSlotKey;

  useEffect(() => {
    if (isInteractive && containerRef.current) {
      selection.registerRef?.(`photo-${computedSlotKey}`, containerRef.current);
    }
  }, [isInteractive, computedSlotKey]);

  const handleResizeStart = useCallback((e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    const pageContainer = getPageContainer(el);
    const containerRect = pageContainer?.getBoundingClientRect();
    const cw = containerRect?.width || 400;
    const ch = containerRect?.height || 560;
    const rect = el.getBoundingClientRect();
    const startW = rect.width;
    const startH = rect.height;
    const aspect = startW / startH;
    const startX = e.clientX;
    const startY = e.clientY;

    function onMove(ev) {
      let dx = ev.clientX - startX;
      let dy = ev.clientY - startY;
      let newW = startW;

      if (corner.includes('right')) newW = startW + dx;
      else if (corner.includes('left')) newW = startW - dx;
      else newW = startW + (corner.includes('bottom') ? dy * aspect : -dy * aspect);

      newW = Math.max(MIN_SIZE, newW);
      const newH = newW / aspect;
      el.style.width = `${newW}px`;
      el.style.height = `${newH}px`;
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // Persist final size as percentage of page container
      if (computedSlotKey && setSizeOverride) {
        const finalRect = el.getBoundingClientRect();
        setSizeOverride(computedSlotKey, {
          widthPct: (finalRect.width / cw) * 100,
          heightPct: (finalRect.height / ch) * 100,
        });
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [computedSlotKey, setSizeOverride]);

  // Drag-to-move handler (only when selected)
  const dragRef = useRef(null);
  const handleDragStart = useCallback((e) => {
    if (!isSelected) return;
    // Don't drag if clicking a resize handle
    if (e.target.closest('[data-resize-handle]')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const normOffset = normalizeOffset(posOffset);
    const existing = normOffset || { xPct: 0, yPct: 0 };

    // Get container dimensions for percentage conversion
    const pageContainer = getPageContainer(containerRef.current);
    const containerRect = pageContainer?.getBoundingClientRect();
    const cw = containerRect?.width || 400;
    const ch = containerRect?.height || 560;

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const el = containerRef.current;
      if (el) {
        const newXPct = existing.xPct + (dx / cw) * 100;
        const newYPct = existing.yPct + (dy / ch) * 100;
        el.style.transform = `translate(${newXPct}%, ${newYPct}%)`;
      }
    }

    function onUp(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setPositionOffset(computedSlotKey, {
        xPct: existing.xPct + (dx / cw) * 100,
        yPct: existing.yPct + (dy / ch) * 100,
      });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [isSelected, posOffset, computedSlotKey, setPositionOffset]);

  const storedSize = normalizeSize(computedSlotKey && sizeOverrides?.[computedSlotKey]);
  const normPosOffset = normalizeOffset(posOffset);

  if (isInteractive) {
    const offsetStyle = normPosOffset
      ? { transform: `translate(${normPosOffset.xPct || 0}%, ${normPosOffset.yPct || 0}%)` }
      : {};
    if (storedSize) {
      offsetStyle.width = `${storedSize.widthPct}%`;
      offsetStyle.height = `${storedSize.heightPct}%`;
    }

    return (
      <div
        ref={containerRef}
        data-selectable
        style={offsetStyle}
        className={`relative transition-all duration-150 ${
          isSelected
            ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-transparent z-10 cursor-grab active:cursor-grabbing'
            : 'hover:ring-1 hover:ring-violet-400/40 cursor-pointer'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          selection.selectPhoto(computedSlotKey, editChapterIdx, editSpreadIdx, slotIdx);
        }}
        onPointerDown={handleDragStart}
      >
        <PhotoImgCore
          photo={photo}
          imgStyle={imgStyle}
          frame={frame}
          className={className}
          vignetteStyle={vignetteStyle}
          grainOpacity={grainOpacity}
          userFilter={userFilter}
          blendPhotos={blendForThisPhoto}
          blendRecipe={blendRecipe}
        />

        {isSelected && (
          <>
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => {
              const posClass = {
                'top-left': '-top-1 -left-1 cursor-nw-resize',
                'top-right': '-top-1 -right-1 cursor-ne-resize',
                'bottom-left': '-bottom-1 -left-1 cursor-sw-resize',
                'bottom-right': '-bottom-1 -right-1 cursor-se-resize',
              }[corner];
              return (
                <div
                  key={corner}
                  data-resize-handle
                  className={`absolute ${posClass} w-2.5 h-2.5 bg-violet-500 border border-white rounded-sm z-20 shadow-md`}
                  onPointerDown={(e) => handleResizeStart(e, corner)}
                />
              );
            })}
          </>
        )}

        {!isSelected && (
          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            <div className="absolute top-1 right-1 bg-black/50 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] text-white/80">
              Click to edit
            </div>
          </div>
        )}
      </div>
    );
  }

  const nonEditOffsetStyle = normPosOffset
    ? { transform: `translate(${normPosOffset.xPct || 0}%, ${normPosOffset.yPct || 0}%)` }
    : {};
  if (storedSize) {
    nonEditOffsetStyle.width = `${storedSize.widthPct}%`;
    nonEditOffsetStyle.height = `${storedSize.heightPct}%`;
  }
  // Strip borders/rounded when blending for seamless edges
  const viewFrame = blendForThisPhoto ? stripFrameClasses(frame) : frame;

  return (
    <>
      <div
        className={`overflow-hidden ${viewFrame} relative cursor-pointer ${className}`}
        style={nonEditOffsetStyle}
        onClick={() => setLightboxSrc(photo.previewUrl)}
      >
        <PhotoImgCore
          photo={photo}
          imgStyle={imgStyle}
          frame=""
          className=""
          vignetteStyle={vignetteStyle}
          grainOpacity={grainOpacity}
          userFilter={userFilter}
          blendPhotos={blendForThisPhoto}
          blendRecipe={blendRecipe}
        />
      </div>
      {lightboxSrc && <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}

export default function PageShell({ style, children, className = '' }) {
  const pageSize = useBookStore(s => s.designScale)?.pageSize;
  const customPageSize = useBookStore(s => s.customPageSize);
  const isCustom = pageSize === 'custom' && customPageSize?.width > 0 && customPageSize?.height > 0;
  const aspectClass = isCustom ? '' : getPageAspect(pageSize);
  const inlineAspect = isCustom ? { aspectRatio: `${customPageSize.width} / ${customPageSize.height}` } : {};
  // Support custom theme inline bg color
  const shellStyle = { ...inlineAspect };
  if (style.pageBgInline) shellStyle.backgroundColor = style.pageBgInline;
  // Support custom theme text colors
  if (style._headingColor) shellStyle['--custom-heading'] = style._headingColor;
  if (style._bodyColor) shellStyle['--custom-body'] = style._bodyColor;
  if (style._accentColor) shellStyle['--custom-accent'] = style._accentColor;

  const customColorClasses = style._headingColor
    ? '[&_h3]:[color:var(--custom-heading)] [&_h2]:[color:var(--custom-heading)] [&_p:not([data-ts=caption])]:[color:var(--custom-body)]'
    : '';

  return (
    <div className={`${aspectClass} ${style.pageBg} rounded-xl overflow-hidden border ${style.pageBorder} relative ${style.pageTexture} ${customColorClasses} ${className}`} style={shellStyle}>
      <PageBgPattern bgPattern={style.bgPattern} />
      {style.cornerOrnament && (
        <PageOrnaments templateType={style.cornerOrnament} stroke={style.ornamentStroke} fill={style.ornamentFill} />
      )}
      {children}
    </div>
  );
}
