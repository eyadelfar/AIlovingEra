import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useBookStore from '../../stores/bookStore';

const LAYOUT_ICONS = {
  'HERO_FULLBLEED': '[H]',
  'TWO_BALANCED': '[][]',
  'THREE_GRID': '[3]',
  'FOUR_GRID': '[4]',
  'SIX_MONTAGE': '[6]',
  'WALL_8_10': '[W]',
  'PHOTO_PLUS_QUOTE': '[P+Q]',
  'COLLAGE_PLUS_LETTER': '[C+L]',
  'QUOTE_PAGE': '"Q"',
  'DEDICATION': 'Ded',
  'TOC_SIMPLE': 'ToC',
};

export default function SpreadCard({ spread, chapterIdx, spreadIdx, isSelected, onSelect }) {
  const images = useBookStore(s => s.images);
  const removeSpread = useBookStore(s => s.removeSpread);
  const duplicateSpread = useBookStore(s => s.duplicateSpread);

  const sortableId = `sp-${chapterIdx}-${spreadIdx}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const firstPhotoIdx = spread.photo_indices?.[0];
  const thumbnail = firstPhotoIdx != null && images[firstPhotoIdx]
    ? images[firstPhotoIdx].previewUrl
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors group ${
        isSelected ? 'bg-violet-500/10 ring-1 ring-violet-500/30' : 'hover:bg-gray-800/30'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder spread"
        className="flex-shrink-0 p-0.5 text-gray-700 hover:text-gray-400 cursor-grab active:cursor-grabbing"
        onClick={e => e.stopPropagation()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
        </svg>
      </button>

      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          className="w-8 h-8 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] text-gray-500 font-mono">
            {LAYOUT_ICONS[spread.layout_type] || 'Aa'}
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">
          {spread.heading_text || spread.caption_text || `Spread ${spreadIdx + 1}`}
        </p>
        <p className="text-[10px] text-gray-600">
          {spread.layout_type} {spread.photo_indices?.length > 0 ? `(${spread.photo_indices.length} photo${spread.photo_indices.length > 1 ? 's' : ''})` : ''}
        </p>
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
        <button
          onClick={e => { e.stopPropagation(); duplicateSpread(chapterIdx, spreadIdx); }}
          aria-label="Duplicate spread"
          className="p-1 text-gray-700 hover:text-violet-400 transition-all"
          title="Duplicate spread"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
            <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
          </svg>
        </button>
        <button
          onClick={e => { e.stopPropagation(); removeSpread(chapterIdx, spreadIdx); }}
          aria-label="Remove spread"
          className="p-1 text-gray-700 hover:text-red-400 transition-all"
          title="Remove spread"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
