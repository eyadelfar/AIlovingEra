import { parseDragId } from '../../lib/gridUtils';

const FIELD_LABELS = {
  heading_text: 'Heading',
  body_text: 'Body',
  caption_text: 'Caption',
  quote_text: 'Quote',
};

export default function DragOverlayContent({ id, images, editorDraft }) {
  const parsed = parseDragId(id);
  const spread = editorDraft?.chapters?.[parsed.chapterIdx]?.spreads?.[parsed.spreadIdx];

  if (parsed.type === 'photo') {
    const photoIdx = spread?.photo_indices?.[parseInt(parsed.slot)];
    const img = photoIdx != null ? images[photoIdx] : null;

    return (
      <div className="w-20 h-20 rounded-lg overflow-hidden shadow-2xl ring-2 ring-violet-500 rotate-3">
        {img ? (
          <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
            No Photo
          </div>
        )}
      </div>
    );
  }

  if (parsed.type === 'text') {
    const text = spread?.[parsed.slot] || '';

    return (
      <div className="max-w-[160px] px-3 py-2 bg-gray-900 rounded-lg shadow-2xl ring-2 ring-violet-500 rotate-2">
        <span className="text-[10px] text-violet-400 font-medium">
          {FIELD_LABELS[parsed.slot] || parsed.slot}
        </span>
        <p className="text-xs text-white/80 truncate mt-0.5">
          {text.slice(0, 50) || '(empty)'}
        </p>
      </div>
    );
  }

  return null;
}
