import { useRef } from 'react';

/**
 * Single responsibility: renders the drop-zone and fires onFilesSelected.
 */
export default function ImageUploader({ onFilesSelected }) {
  const inputRef = useRef(null);

  function handleChange(e) {
    if (e.target.files?.length) onFilesSelected(e.target.files);
    e.target.value = '';
  }

  return (
    <div
      className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-violet-500 transition-colors bg-gray-900/40"
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex flex-col items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-gray-300 mb-1 font-medium">Click to upload images</p>
        <p className="text-sm text-gray-500">Supports JPG, PNG, WEBP — up to 100 images</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleChange} />
    </div>
  );
}
