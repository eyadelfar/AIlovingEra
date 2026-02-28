import { useState } from 'react';
import useBookStore from '../../stores/bookStore';
import PhotoSwapModal from './PhotoSwapModal';
import AIImageModal from './AIImageModal';
import PhotoCropModal from './PhotoCropModal';
import PhotoFilterPanel from './PhotoFilterPanel';
import { TEMPLATE_PHOTO_FILTERS } from '../viewer/templateStyles';
import { buildFilterCSS, buildVignetteStyle, getGrainOpacity, hasActiveFilters } from '../../lib/filterUtils';

export default function PhotoSlot({ photoIndex, chapterIdx, spreadIdx, slotIdx }) {
  const images = useBookStore(s => s.images);
  const selectedTemplate = useBookStore(s => s.selectedTemplate);
  const useOriginalPhotos = useBookStore(s => s.useOriginalPhotos);
  const getCropStyle = useBookStore(s => s.getCropStyle);
  const setCropOverride = useBookStore(s => s.setCropOverride);
  const setFilterOverride = useBookStore(s => s.setFilterOverride);

  const [showSwap, setShowSwap] = useState(false);
  const [showAIGen, setShowAIGen] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const overrideKey = `${chapterIdx}-${spreadIdx}-${slotIdx}`;
  const cropOverride = useBookStore(s => s.cropOverrides[overrideKey]);
  const filterOverride = useBookStore(s => s.filterOverrides[overrideKey]);

  const img = images[photoIndex];
  const src = img?.previewUrl;
  const hasPhoto = !!src;

  // Template filter (applied when not using originals)
  const templateFilter = (!useOriginalPhotos && selectedTemplate)
    ? TEMPLATE_PHOTO_FILTERS[selectedTemplate] || ''
    : '';

  // User filter override takes priority over template filter
  const finalFilterCSS = filterOverride
    ? buildFilterCSS(filterOverride)
    : templateFilter;

  const vignetteStyle = filterOverride ? buildVignetteStyle(filterOverride.vignette) : {};
  const grainOpacity = filterOverride ? getGrainOpacity(filterOverride.grain) : 0;

  // Crop: user override > AI safe_crop_box
  const aiCropStyle = getCropStyle(photoIndex);
  const cropImgStyle = cropOverride
    ? {
        transform: `scale(${cropOverride.zoom}) translate(${cropOverride.panX}%, ${cropOverride.panY}%)`,
        transformOrigin: 'center',
      }
    : aiCropStyle;

  const hasFilterBadge = hasActiveFilters(filterOverride);
  const hasCropBadge = !!cropOverride;

  return (
    <div className="relative group rounded-xl overflow-hidden border border-gray-800">
      {src ? (
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            style={{ ...(finalFilterCSS ? { filter: finalFilterCSS } : {}), ...cropImgStyle }}
          />
          {filterOverride?.vignette > 0 && <div style={vignetteStyle} />}
          {grainOpacity > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                opacity: grainOpacity,
                mixBlendMode: 'overlay',
              }}
            />
          )}
        </div>
      ) : (
        <div className="w-full aspect-[4/3] bg-gray-900 flex items-center justify-center">
          <span className="text-gray-600 text-sm">No Photo</span>
        </div>
      )}

      {(hasCropBadge || hasFilterBadge) && (
        <div className="absolute top-1.5 left-1.5 flex gap-1">
          {hasCropBadge && (
            <span className="bg-violet-600/80 text-white text-[9px] px-1.5 py-0.5 rounded-full">Cropped</span>
          )}
          {hasFilterBadge && (
            <span className="bg-rose-600/80 text-white text-[9px] px-1.5 py-0.5 rounded-full">Filtered</span>
          )}
        </div>
      )}

      <div className="absolute inset-0 bg-black/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {hasPhoto && (
          <>
            <ActionButton
              label="Crop"
              onClick={() => setShowCrop(true)}
              icon={<CropIcon />}
            />
            <ActionButton
              label="Filter"
              onClick={() => setShowFilter(true)}
              icon={<FilterIcon />}
            />
          </>
        )}
        <ActionButton
          label="Swap"
          onClick={() => setShowSwap(true)}
          icon={<SwapIcon />}
        />
        <ActionButton
          label={hasPhoto ? 'Enhance' : 'Generate'}
          onClick={() => setShowAIGen(true)}
          icon={<SparkleIcon />}
          accent
        />
      </div>

      {showSwap && (
        <PhotoSwapModal
          chapterIdx={chapterIdx}
          spreadIdx={spreadIdx}
          slotIdx={slotIdx}
          onClose={() => setShowSwap(false)}
        />
      )}
      {showAIGen && (
        <AIImageModal
          chapterIdx={chapterIdx}
          spreadIdx={spreadIdx}
          slotIdx={slotIdx}
          photoIndex={photoIndex}
          onClose={() => setShowAIGen(false)}
        />
      )}
      {showCrop && src && (
        <PhotoCropModal
          src={src}
          initialCrop={cropOverride}
          onApply={(data) => {
            setCropOverride(overrideKey, data);
            setShowCrop(false);
          }}
          onClose={() => setShowCrop(false)}
        />
      )}
      {showFilter && src && (
        <PhotoFilterPanel
          src={src}
          initialFilters={filterOverride}
          onApply={(data) => {
            setFilterOverride(overrideKey, data);
            setShowFilter(false);
          }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}

function ActionButton({ label, onClick, icon, accent }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
        accent
          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30'
          : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function CropIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4m0 0H3m4 0h10a2 2 0 012 2v10m0 0v4m0-4h4m-4 0H7a2 2 0 01-2-2V7" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}
