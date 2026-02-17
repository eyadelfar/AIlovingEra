/**
 * Single responsibility: renders thumbnail grid with remove buttons.
 */
export default function ImagePreviewGrid({ images, onRemove }) {
  if (!images.length) return null;

  return (
    <div className="mt-6">
      <h3 className="font-medium text-gray-400 mb-3 text-sm uppercase tracking-wide">
        Uploaded Images ({images.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {images.map(image => (
          <div key={image.id} className="relative group">
            <img
              src={image.previewUrl}
              alt={image.name}
              className="w-full h-24 object-cover rounded-lg border border-gray-700"
            />
            <button
              onClick={() => onRemove(image.id)}
              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              title="Remove"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <p className="text-xs text-gray-500 mt-1 truncate">{image.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
