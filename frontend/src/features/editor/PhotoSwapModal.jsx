import useBookStore from '../../stores/bookStore';
import BaseModal from '../shared/BaseModal';

export default function PhotoSwapModal({ chapterIdx, spreadIdx, slotIdx, onClose }) {
  const images = useBookStore(s => s.images);
  const swapPhoto = useBookStore(s => s.swapPhoto);

  function handleSelect(photoIdx) {
    swapPhoto(chapterIdx, spreadIdx, slotIdx, photoIdx);
    onClose();
  }

  return (
    <BaseModal title="Swap Photo" onClose={onClose} size="lg" scrollable>
      <p className="text-sm text-gray-500 mb-4">Select a photo from your uploads</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => handleSelect(idx)}
            className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-rose-500 transition-colors"
          >
            <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {images.length === 0 && (
        <p className="text-center text-gray-600 py-8">No photos uploaded</p>
      )}
    </BaseModal>
  );
}
