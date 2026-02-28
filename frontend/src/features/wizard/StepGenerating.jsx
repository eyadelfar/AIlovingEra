import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useBookStore from '../../stores/bookStore';
import GenerationAnimation from './GenerationAnimation';

export default function StepGenerating() {
  const navigate = useNavigate();
  const isGenerating = useBookStore(s => s.isGenerating);
  const generationProgress = useBookStore(s => s.generationProgress);
  const bookDraft = useBookStore(s => s.bookDraft);
  const error = useBookStore(s => s.error);
  const startGeneration = useBookStore(s => s.startGeneration);
  const prevStep = useBookStore(s => s.prevStep);
  const images = useBookStore(s => s.images);
  const cartoonImages = useBookStore(s => s.cartoonImages);

  const hasStarted = useRef(false);
  useEffect(() => {
    if (!bookDraft && !isGenerating && !error && !hasStarted.current) {
      hasStarted.current = true;
      startGeneration();
    }
  }, []);

  useEffect(() => {
    if (bookDraft && !isGenerating) {
      const timer = setTimeout(() => navigate('/book/view?edit=true', { replace: true }), 1000);
      return () => clearTimeout(timer);
    }
  }, [bookDraft, isGenerating, navigate]);

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2 text-red-300">Generation Failed</h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">{error}</p>
        <button
          onClick={prevStep}
          className="px-6 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors"
        >
          Go Back & Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="py-16">
      {bookDraft ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold mb-2">Your book is ready!</h3>
          <p className="text-gray-400">Opening the editor...</p>
        </motion.div>
      ) : (
        <>
          <h3 className="text-2xl font-bold mb-8 text-center">Creating Your Memory Book</h3>
          <GenerationAnimation progress={generationProgress} images={images} cartoonImages={cartoonImages} />
        </>
      )}
    </div>
  );
}
