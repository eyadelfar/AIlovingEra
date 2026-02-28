import { motion, AnimatePresence } from 'framer-motion';
import useBookStore from '../../stores/bookStore';
import { LAYOUT_TYPES } from '../../lib/constants';
import EditableText from './EditableText';
import PhotoSlot from './PhotoSlot';

const GRID_COLS_MAP = {
  HERO_FULLBLEED: 'grid-cols-1',
  TWO_BALANCED: 'grid-cols-1 sm:grid-cols-2',
  THREE_GRID: 'grid-cols-2 sm:grid-cols-3',
  FOUR_GRID: 'grid-cols-2',
  SIX_MONTAGE: 'grid-cols-2 sm:grid-cols-3',
  WALL_8_10: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  PHOTO_PLUS_QUOTE: 'grid-cols-1 sm:grid-cols-2',
  COLLAGE_PLUS_LETTER: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  QUOTE_PAGE: 'grid-cols-1',
  DEDICATION: 'grid-cols-1',
  TOC_SIMPLE: 'grid-cols-1',
};

export default function EditorCanvas() {
  const editorDraft = useBookStore(s => s.editorDraft);
  const selectedChapterIndex = useBookStore(s => s.selectedChapterIndex);
  const selectedSpreadIndex = useBookStore(s => s.selectedSpreadIndex);
  const updateSpreadField = useBookStore(s => s.updateSpreadField);
  const updateBookField = useBookStore(s => s.updateBookField);
  const updateChapterField = useBookStore(s => s.updateChapterField);

  if (selectedChapterIndex == null) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="empty-state"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex-1 flex items-center justify-center text-gray-600"
        >
          <div className="text-center">
            <p className="text-lg font-medium mb-2">Select a chapter to start editing</p>
            <p className="text-sm">Click on a chapter in the sidebar, then expand to see spreads</p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const chapter = editorDraft?.chapters?.[selectedChapterIndex];
  if (!chapter) return null;

  if (selectedSpreadIndex == null) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`chapter-${selectedChapterIndex}-overview`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex-1 overflow-y-auto p-4 md:p-8"
        >
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 pb-6 border-b border-gray-800">
              <label className="block text-xs text-gray-600 mb-1">Book Title</label>
              <EditableText
                value={editorDraft.title}
                onChange={val => updateBookField('title', val)}
                className="text-2xl font-bold text-gray-100"
                chapterIdx={selectedChapterIndex}
                spreadIdx={0}
                field="title"
              />
              <label className="block text-xs text-gray-600 mt-3 mb-1">Subtitle</label>
              <EditableText
                value={editorDraft.subtitle}
                onChange={val => updateBookField('subtitle', val)}
                className="text-lg text-gray-400"
                chapterIdx={selectedChapterIndex}
                spreadIdx={0}
                field="subtitle"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs text-gray-600 mb-1">Chapter Title</label>
              <EditableText
                value={chapter.title}
                onChange={val => updateChapterField(selectedChapterIndex, 'title', val)}
                className="text-xl font-semibold text-gray-200"
                chapterIdx={selectedChapterIndex}
                spreadIdx={0}
                field="heading_text"
              />
            </div>

            <div className="mb-8">
              <label className="block text-xs text-gray-600 mb-1">Chapter Blurb</label>
              <EditableText
                value={chapter.blurb}
                onChange={val => updateChapterField(selectedChapterIndex, 'blurb', val)}
                className="text-gray-400"
                multiline
                chapterIdx={selectedChapterIndex}
                spreadIdx={0}
                field="body_text"
              />
            </div>

            {editorDraft.love_letter_text && (
              <div className="mb-8 pb-6 border-b border-gray-800">
                <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  Love Letter Insert
                </label>
                <EditableText
                  value={editorDraft.love_letter_text}
                  onChange={val => updateBookField('love_letter_text', val)}
                  className="text-gray-300 leading-relaxed italic"
                  multiline
                  chapterIdx={selectedChapterIndex}
                  spreadIdx={0}
                  field="body_text"
                />
              </div>
            )}

            <h3 className="text-sm font-medium text-gray-500 mb-3">Spreads ({chapter.spreads?.length || 0})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {(chapter.spreads || []).map((spread, sIdx) => (
                <SpreadPreview
                  key={sIdx}
                  spread={spread}
                  spreadIdx={sIdx}
                  chapterIdx={selectedChapterIndex}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const spread = chapter.spreads?.[selectedSpreadIndex];
  if (!spread) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`chapter-${selectedChapterIndex}-${selectedSpreadIndex}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex-1 overflow-y-auto p-4 md:p-8"
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-xs text-gray-600 mb-4">
            Chapter {selectedChapterIndex + 1} / Spread {selectedSpreadIndex + 1}
          </div>

          {spread.photo_indices?.length > 0 && (
            <div className={`grid gap-4 mb-6 ${GRID_COLS_MAP[spread.layout_type] || 'grid-cols-1'}`}>
              {spread.photo_indices.map((photoIdx, slotIdx) => (
                <PhotoSlot
                  key={slotIdx}
                  photoIndex={photoIdx}
                  chapterIdx={selectedChapterIndex}
                  spreadIdx={selectedSpreadIndex}
                  slotIdx={slotIdx}
                />
              ))}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Heading</label>
              <EditableText
                value={spread.heading_text}
                onChange={val => updateSpreadField(selectedChapterIndex, selectedSpreadIndex, 'heading_text', val)}
                className="text-xl font-semibold text-gray-200"
                chapterIdx={selectedChapterIndex}
                spreadIdx={selectedSpreadIndex}
                field="heading_text"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Body</label>
              <EditableText
                value={spread.body_text}
                onChange={val => updateSpreadField(selectedChapterIndex, selectedSpreadIndex, 'body_text', val)}
                className="text-gray-300 leading-relaxed"
                multiline
                chapterIdx={selectedChapterIndex}
                spreadIdx={selectedSpreadIndex}
                field="body_text"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Caption</label>
              <EditableText
                value={spread.caption_text}
                onChange={val => updateSpreadField(selectedChapterIndex, selectedSpreadIndex, 'caption_text', val)}
                className="text-sm text-gray-400 italic"
                chapterIdx={selectedChapterIndex}
                spreadIdx={selectedSpreadIndex}
                field="caption_text"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Quote</label>
              <EditableText
                value={spread.quote_text}
                onChange={val => updateSpreadField(selectedChapterIndex, selectedSpreadIndex, 'quote_text', val)}
                className="text-sm text-rose-300/80 italic"
                chapterIdx={selectedChapterIndex}
                spreadIdx={selectedSpreadIndex}
                field="quote_text"
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <label className="block text-xs text-gray-600 mb-2">Layout</label>
            <div className="flex flex-wrap gap-2">
              {LAYOUT_TYPES.map(lt => (
                <button
                  key={lt.value}
                  onClick={() => updateSpreadField(selectedChapterIndex, selectedSpreadIndex, 'layout_type', lt.value)}
                  title={lt.description}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all border ${
                    spread.layout_type === lt.value
                      ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                      : 'border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {lt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function SpreadPreview({ spread, spreadIdx, chapterIdx }) {
  const images = useBookStore(s => s.images);
  const setSelectedSpread = useBookStore(s => s.setSelectedSpread);

  const firstPhotoIdx = spread.photo_indices?.[0];
  const thumbnail = firstPhotoIdx != null && images[firstPhotoIdx]
    ? images[firstPhotoIdx].previewUrl
    : null;

  return (
    <button
      onClick={() => setSelectedSpread(chapterIdx, spreadIdx)}
      className="aspect-[3/4] rounded-lg border border-gray-800 hover:border-gray-600 overflow-hidden transition-all group relative"
    >
      {thumbnail ? (
        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          <span className="text-xs text-gray-600">{spread.layout_type}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-[10px] text-gray-300 truncate">{spread.heading_text || `Spread ${spreadIdx + 1}`}</p>
      </div>
    </button>
  );
}
