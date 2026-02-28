import { TEMPLATE_STYLES } from '../viewer/templateStyles';
import { PageOrnaments } from '../viewer/PageOrnaments';
import { IMAGE_LOOK_CSS_FILTERS } from '../../lib/previewFilters';
import SamplePhoto from './SamplePhoto';

const TEMPLATE_META = {
  romantic: { accent: 'border-rose-500', badge: 'bg-rose-500/20 text-rose-300' },
  meme_funny: { accent: 'border-amber-500', badge: 'bg-amber-500/20 text-amber-300' },
  elegant: { accent: 'border-slate-400', badge: 'bg-slate-500/20 text-slate-300' },
  vintage: { accent: 'border-amber-700', badge: 'bg-amber-700/20 text-amber-400' },
};

function MiniPagePreview({ slug, previewPhoto, imageLook }) {
  const style = TEMPLATE_STYLES[slug] || TEMPLATE_STYLES.romantic;

  return (
    <div className={`aspect-[3/4] w-full ${style.pageBg} rounded-lg overflow-hidden border ${style.pageBorder} relative ${style.pageTexture}`}>
      {/* Background pattern */}
      {style.bgPattern && (
        <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: style.bgPattern }} />
      )}
      {/* Corner ornaments (scaled down) */}
      {style.cornerOrnament && (
        <div className="scale-[0.5] origin-top-left">
          <PageOrnaments templateType={style.cornerOrnament} stroke={style.ornamentStroke} fill={style.ornamentFill} />
        </div>
      )}
      {/* Mini photo frame */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full px-3 py-2.5">
        <div className={`w-[70%] aspect-[4/3] ${style.photoFrame} overflow-hidden mb-1.5`}>
          {previewPhoto ? (
            <img
              src={previewPhoto}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: IMAGE_LOOK_CSS_FILTERS[imageLook] || 'none' }}
            />
          ) : (
            <SamplePhoto
              cssFilter={IMAGE_LOOK_CSS_FILTERS[imageLook] || 'none'}
              className="w-full h-full"
            />
          )}
        </div>
        {/* Mini text lines */}
        <div className="w-full flex flex-col items-center gap-0.5">
          <div className={`w-[60%] h-[3px] rounded-full opacity-60 ${slug === 'vintage' ? 'bg-amber-200' : slug === 'elegant' ? 'bg-slate-300' : slug === 'meme_funny' ? 'bg-amber-200' : 'bg-rose-200'}`} />
          <div className={`w-[45%] h-[2px] rounded-full opacity-30 ${slug === 'vintage' ? 'bg-amber-300' : slug === 'elegant' ? 'bg-slate-400' : slug === 'meme_funny' ? 'bg-gray-300' : 'bg-rose-300'}`} />
        </div>
      </div>
    </div>
  );
}

export default function TemplateCard({ template, isSelected, onSelect, previewPhoto, imageLook }) {
  const meta = TEMPLATE_META[template.slug] || TEMPLATE_META.romantic;

  return (
    <button
      onClick={() => onSelect(template.slug)}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all hover:scale-[1.02] ${
        isSelected
          ? `${meta.accent} bg-gray-900/60 shadow-lg`
          : 'border-gray-700 bg-gray-900/40 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Mini page preview */}
        <div className="w-16 sm:w-20 flex-shrink-0">
          <MiniPagePreview slug={template.slug} previewPhoto={previewPhoto} imageLook={imageLook} />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{template.name}</h3>
            {isSelected && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${meta.badge}`}>Selected</span>
            )}
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">{template.description}</p>
        </div>
      </div>
    </button>
  );
}
