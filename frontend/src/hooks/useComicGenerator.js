import { useState } from 'react';
import { generateComic as apiGenerateComic } from '../api/comicApiService';

/**
 * Single responsibility: owns all state and calls the API service.
 * Returns no JSX — pure logic hook.
 */
export function useComicGenerator() {
  const [images, setImages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [panelsPerPage, setPanelsPerPage] = useState(4);
  const [artStyle, setArtStyle] = useState('superhero');
  const [isLoading, setIsLoading] = useState(false);
  const [comicBook, setComicBook] = useState(null);
  const [error, setError] = useState(null);

  function addImages(files) {
    const newImages = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));
    setImages(prev => [...prev, ...newImages]);
  }

  function removeImage(id) {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }

  function reset() {
    setComicBook(null);
    setError(null);
    setImages([]);
    setTextInput('');
  }

  async function generateComic() {
    if (images.length === 0 && !textInput.trim()) {
      setError('Please upload at least one image or enter a story description.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const result = await apiGenerateComic({ images, textInput, panelsPerPage, artStyle });
      setComicBook(result);
    } catch (err) {
      setError(err.message ?? 'Failed to generate comic. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return {
    images,
    textInput,
    setTextInput,
    panelsPerPage,
    setPanelsPerPage,
    artStyle,
    setArtStyle,
    isLoading,
    comicBook,
    error,
    addImages,
    removeImage,
    generateComic,
    reset,
  };
}
