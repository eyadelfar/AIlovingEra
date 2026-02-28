import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBookStore from '../../stores/bookStore';
import WizardProgress from './WizardProgress';
import StepSetup from './StepSetup';
import StepPhotoUpload from './StepPhotoUpload';
import StepYourStory from './StepYourStory';
import StepGenerating from './StepGenerating';
import LiveBookPreview from './LiveBookPreview';
import { MIN_IMAGES } from '../../lib/constants';

const steps = [StepSetup, StepPhotoUpload, StepYourStory, StepGenerating];

const MIN_PREVIEW_WIDTH = 200;
const DEFAULT_PREVIEW_WIDTH = 280;

export default function CreatePage() {
  const currentStep = useBookStore(s => s.currentStep);
  const nextStep = useBookStore(s => s.nextStep);
  const prevStep = useBookStore(s => s.prevStep);
  const selectedTemplate = useBookStore(s => s.selectedTemplate);
  const images = useBookStore(s => s.images);
  const isGenerating = useBookStore(s => s.isGenerating);

  const [previewWidth, setPreviewWidth] = useState(DEFAULT_PREVIEW_WIDTH);
  const isDragging = useRef(false);
  const containerRef = useRef(null);

  const StepComponent = steps[currentStep];

  const canAdvance = () => {
    switch (currentStep) {
      case 0: return !!selectedTemplate;
      case 1: return images.length >= MIN_IMAGES;
      case 2: return true;
      default: return false;
    }
  };

  const isLastStepBeforeGenerate = currentStep === 2;
  const showNavButtons = currentStep < 3;
  const showPreview = currentStep < 3;

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const maxWidth = containerRect.width * 0.5;
      // Width = distance from mouse to right edge of container
      const newWidth = containerRect.right - moveEvent.clientX;
      setPreviewWidth(Math.max(MIN_PREVIEW_WIDTH, Math.min(maxWidth, newWidth)));
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, []);

  return (
    <div className="w-[92%] sm:w-[85%] lg:w-[80%] mx-auto py-8 sm:py-12">
      <div className="max-w-3xl mx-auto md:max-w-none">
        <WizardProgress currentStep={currentStep} />
      </div>

      <div
        ref={containerRef}
        className={showPreview ? 'md:flex' : ''}
      >
        <div className="max-w-3xl mx-auto md:max-w-none flex-1 min-w-0">
          {showPreview && (
            <div className="md:hidden mb-6">
              <LiveBookPreview />
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <StepComponent />
            </motion.div>
          </AnimatePresence>

          {showNavButtons && (
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-800">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="px-6 py-2.5 rounded-lg text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!canAdvance() || isGenerating}
                className={`px-8 py-2.5 rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isLastStepBeforeGenerate
                    ? 'bg-gradient-to-r from-rose-500 to-violet-600 text-white hover:from-rose-600 hover:to-violet-700 shadow-lg shadow-rose-900/30'
                    : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {isLastStepBeforeGenerate ? 'Generate My Book' : 'Next'}
              </button>
            </div>
          )}
        </div>

        {showPreview && (
          <div
            onPointerDown={handlePointerDown}
            className="hidden md:flex w-3 flex-shrink-0 cursor-col-resize group items-center justify-center hover:bg-violet-500/10 active:bg-violet-500/20 transition-colors rounded-full mx-1 self-stretch"
            title="Drag to resize preview"
          >
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-1 h-1 rounded-full bg-gray-500" />
              <div className="w-1 h-1 rounded-full bg-gray-500" />
              <div className="w-1 h-1 rounded-full bg-gray-500" />
            </div>
          </div>
        )}

        {showPreview && (
          <div
            className="hidden md:block flex-shrink-0"
            style={{ width: previewWidth }}
          >
            <div className="sticky top-[calc(var(--navbar-h)+2rem)]">
              <LiveBookPreview />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
