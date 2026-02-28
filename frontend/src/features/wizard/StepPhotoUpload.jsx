import useBookStore from '../../stores/bookStore';
import ImageUploader from '../shared/ImageUploader';
import ImagePreviewGrid from '../shared/ImagePreviewGrid';

export default function StepPhotoUpload() {
  const images = useBookStore(s => s.images);
  const addImages = useBookStore(s => s.addImages);
  const removeImage = useBookStore(s => s.removeImage);
  const reorderImages = useBookStore(s => s.reorderImages);
  const undoRemoveImage = useBookStore(s => s.undoRemoveImage);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Upload Your Photos</h2>
      <p className="text-gray-400 mb-8">
        Add the photos you want in your memory book. The AI will analyze each one to craft the perfect story.
      </p>

      <ImageUploader onFilesSelected={addImages} currentCount={images.length} />
      <ImagePreviewGrid images={images} onRemove={removeImage} onReorder={reorderImages} onUndoRemove={undoRemoveImage} />
    </div>
  );
}
