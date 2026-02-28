import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { MAX_IMAGES } from '../../lib/constants';

export default function ImageUploader({ onFilesSelected, currentCount = 0 }) {
  const remaining = MAX_IMAGES - currentCount;

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length) onFilesSelected(acceptedFiles);
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    multiple: true,
    maxFiles: remaining,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-6 md:p-10 text-center cursor-pointer transition-all ${
        isDragActive
          ? 'border-rose-400 bg-rose-500/10'
          : 'border-gray-700 hover:border-violet-500 bg-gray-900/40'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-800 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        {isDragActive ? (
          <p className="text-rose-300 font-medium">Drop your photos here!</p>
        ) : (
          <>
            <p className="text-gray-200 font-medium">Drag & drop your photos here</p>
            <p className="text-sm text-gray-500">or click to browse. JPG, PNG, WEBP up to {MAX_IMAGES} photos</p>
          </>
        )}
        {currentCount > 0 && (
          <p className="text-xs text-gray-500">{currentCount} uploaded, {remaining} remaining</p>
        )}
      </div>
    </div>
  );
}
