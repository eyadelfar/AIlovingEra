import { useState } from 'react';
import useBookStore from '../../stores/bookStore';
import { IMAGE_LOOKS } from '../../lib/constants';
import LoadingSpinner from '../shared/LoadingSpinner';
import BaseModal from '../shared/BaseModal';

export default function AIImageModal({ chapterIdx, spreadIdx, slotIdx, photoIndex, onClose }) {
  const generateAIImageAction = useBookStore(s => s.generateAIImageAction);
  const enhanceImageAction = useBookStore(s => s.enhanceImageAction);
  const swapPhoto = useBookStore(s => s.swapPhoto);
  const addImages = useBookStore(s => s.addImages);
  const images = useBookStore(s => s.images);

  const hasPhoto = photoIndex != null && images[photoIndex];
  const [tab, setTab] = useState(hasPhoto ? 'enhance' : 'generate');
  const [prompt, setPrompt] = useState('');
  const [selectedLook, setSelectedLook] = useState('natural');
  const [enhanceInstruction, setEnhanceInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    setError(null);
    setResultImage(null);

    try {
      const result = await generateAIImageAction(prompt, selectedLook);
      setResultImage(result);
    } catch (err) {
      setError(err.message || 'Generation failed');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleEnhance() {
    setIsProcessing(true);
    setError(null);
    setResultImage(null);

    try {
      const result = await enhanceImageAction(photoIndex, selectedLook, enhanceInstruction);
      setResultImage(result);
    } catch (err) {
      setError(err.message || 'Enhancement failed');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleUseImage() {
    if (!resultImage) return;
    const byteString = atob(resultImage.image_base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: resultImage.mime_type || 'image/png' });
    const file = new File([blob], `ai-${tab}-${Date.now()}.png`, { type: 'image/png' });

    addImages([file]);
    const newIdx = images.length;
    swapPhoto(chapterIdx, spreadIdx, slotIdx, newIdx);
    onClose();
  }

  return (
    <BaseModal title="AI Image" onClose={onClose} size="md">
      <div className="flex gap-1 mb-4 p-1 bg-gray-800/50 rounded-lg">
        {hasPhoto && (
          <button
            onClick={() => { setTab('enhance'); setResultImage(null); setError(null); }}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              tab === 'enhance'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Enhance Photo
          </button>
        )}
        <button
          onClick={() => { setTab('generate'); setResultImage(null); setError(null); }}
          className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            tab === 'generate'
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Generate New
        </button>
      </div>

      {tab === 'enhance' && hasPhoto && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">Current photo will be enhanced with the selected look:</p>
          <img
            src={images[photoIndex].previewUrl}
            alt=""
            className="w-full h-32 object-cover rounded-lg border border-gray-700 mb-3"
          />
          <textarea
            value={enhanceInstruction}
            onChange={e => setEnhanceInstruction(e.target.value)}
            placeholder="Describe how to enhance (e.g., warmer, more contrast, dreamy)..."
            rows={2}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none mb-3"
          />
        </div>
      )}

      {tab === 'generate' && (
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          rows={3}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none mb-3"
        />
      )}

      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-2">Image Look</label>
        <div className="flex flex-wrap gap-1.5">
          {IMAGE_LOOKS.map(look => (
            <button
              key={look.value}
              onClick={() => setSelectedLook(look.value)}
              className={`px-2 py-1 rounded text-xs transition-all border ${
                selectedLook === look.value
                  ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                  : 'border-gray-700 text-gray-500 hover:border-gray-600'
              }`}
            >
              {look.label}
            </button>
          ))}
        </div>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center py-12 border border-gray-800 rounded-xl mb-4">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500 mt-3">
              {tab === 'enhance' ? 'Enhancing photo...' : 'Generating image...'}
            </p>
          </div>
        </div>
      )}

      {resultImage && !isProcessing && (
        <div className="mb-4">
          <img
            src={`data:${resultImage.mime_type};base64,${resultImage.image_base64}`}
            alt="AI Result"
            className="w-full rounded-xl border border-gray-700"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 mb-4">{error}</p>
      )}

      <div className="flex gap-2">
        {!resultImage ? (
          <button
            onClick={tab === 'enhance' ? handleEnhance : handleGenerate}
            disabled={(tab === 'generate' && !prompt.trim()) || isProcessing}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {tab === 'enhance' ? 'Enhance' : 'Generate'}
          </button>
        ) : (
          <>
            <button
              onClick={tab === 'enhance' ? handleEnhance : handleGenerate}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 rounded-lg text-sm text-gray-400 border border-gray-700 hover:border-gray-500 transition-all"
            >
              Retry
            </button>
            <button
              onClick={handleUseImage}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-rose-500 to-violet-600 text-white hover:from-rose-600 hover:to-violet-700 transition-all"
            >
              Use This Image
            </button>
          </>
        )}
      </div>
    </BaseModal>
  );
}
