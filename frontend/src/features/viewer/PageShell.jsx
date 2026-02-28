import { useState, useEffect, useRef, useCallback } from 'react';
import { buildFilterCSS, buildVignetteStyle, getGrainOpacity } from '../../lib/filterUtils';
import { getObjectPosition } from '../../lib/photoUtils';
import { PAGE_ASPECT } from '../../lib/constants';
import { PageOrnaments, PageBgPattern } from './PageOrnaments';
import { useEditMode } from './EditModeContext';
import { useSelection } from './SelectionContext';
import useBookStore from '../../stores/bookStore';

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

function PhotoImgCore({ photo, imgStyle, frame, className, vignetteStyle, grainOpacity, blendMode, blendOverlay, userFilter }) {
  return (
    <div className={`overflow-hidden ${frame} relative ${className}`}>
      <img
        src={photo.previewUrl}
        alt=""
        className="w-full h-full object-cover"
        style={{
          ...(Object.keys(imgStyle).length > 0 ? imgStyle : {}),
          ...(blendMode ? { mixBlendMode: blendMode } : {}),
        }}
      />
      {blendOverlay && (
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: blendOverlay }} />
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

export function PhotoImg({ photo, photoIndex, style, altFrame, heroFrame, filter, photoAnalyses, cropOverrides, filterOverrides, slotKey, slotIdx, className = '', blendEnabled, blendConfig }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const editMode = useEditMode();
  const selection = useSelection();
  const containerRef = useRef(null);

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
  } else {
    const objPos = getObjectPosition(photoIndex, photoAnalyses);
    if (objPos) imgStyle.objectPosition = objPos;
  }

  const vignetteStyle = userFilter ? buildVignetteStyle(userFilter.vignette) : {};
  const grainOpacity = userFilter ? getGrainOpacity(userFilter.grain) : 0;

  const blendMode = blendEnabled && blendConfig?.blendMode ? blendConfig.blendMode : undefined;
  const blendOverlay = blendEnabled && blendConfig?.overlayColor ? blendConfig.overlayColor : undefined;

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
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  if (isInteractive) {
    return (
      <div
        ref={containerRef}
        data-selectable
        className={`relative cursor-pointer transition-all duration-150 ${
          isSelected
            ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-transparent z-10'
            : 'hover:ring-1 hover:ring-violet-400/40'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          selection.selectPhoto(computedSlotKey, editChapterIdx, editSpreadIdx, slotIdx);
        }}
      >
        <PhotoImgCore
          photo={photo}
          imgStyle={imgStyle}
          frame={frame}
          className={className}
          vignetteStyle={vignetteStyle}
          grainOpacity={grainOpacity}
          blendMode={blendMode}
          blendOverlay={blendOverlay}
          userFilter={userFilter}
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

  return (
    <>
      <div
        className={`overflow-hidden ${frame} relative cursor-pointer ${className}`}
        onClick={() => setLightboxSrc(photo.previewUrl)}
      >
        <img
          src={photo.previewUrl}
          alt=""
          className="w-full h-full object-cover"
          style={{
            ...(Object.keys(imgStyle).length > 0 ? imgStyle : {}),
            ...(blendMode ? { mixBlendMode: blendMode } : {}),
          }}
        />
        {blendOverlay && (
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: blendOverlay }} />
        )}
        {userFilter?.vignette > 0 && <div style={vignetteStyle} />}
        {grainOpacity > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            opacity: grainOpacity, mixBlendMode: 'overlay',
          }} />
        )}
      </div>
      {lightboxSrc && <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}

export default function PageShell({ style, children, className = '' }) {
  const pageSize = useBookStore(s => s.designScale)?.pageSize;
  const aspect = PAGE_ASPECT[pageSize] || 'aspect-[3/4]';

  return (
    <div className={`${aspect} ${style.pageBg} rounded-xl overflow-hidden border ${style.pageBorder} relative ${style.pageTexture} ${className}`}>
      <PageBgPattern bgPattern={style.bgPattern} />
      {style.cornerOrnament && (
        <PageOrnaments templateType={style.cornerOrnament} stroke={style.ornamentStroke} fill={style.ornamentFill} />
      )}
      {children}
    </div>
  );
}
