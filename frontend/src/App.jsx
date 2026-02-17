import { useComicGenerator } from './hooks/useComicGenerator';
import ImageUploader from './features/upload/ImageUploader';
import ImagePreviewGrid from './features/upload/ImagePreviewGrid';
import ComicSettings from './features/comic/ComicSettings';
import GenerateButton from './features/shared/GenerateButton';
import ComicBook from './features/comic/ComicBook';
import VoiceRecorder from './features/voice/VoiceRecorder';

export default function App() {
  const {
    images, textInput, setTextInput,
    panelsPerPage, setPanelsPerPage,
    artStyle, setArtStyle,
    isLoading, comicBook, error,
    addImages, removeImage, generateComic, reset,
  } = useComicGenerator();

  function handleTranscribed(text) {
    setTextInput(prev => prev ? `${prev} ${text}` : text);
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <header className="text-center py-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Powered by Gemini AI</span>
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
            AI Comic{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Studio
            </span>
          </h1>
          <p className="text-gray-400 text-sm">Transform your images and stories into comics with AI</p>
        </header>

        {/* Main card — hidden once comic is ready */}
        {!comicBook && (
          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl p-6 space-y-8">

            {/* Upload section */}
            <section>
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-gradient-to-b from-violet-500 to-cyan-500 rounded-full" />
                Upload Images
              </h2>
              <ImageUploader onFilesSelected={addImages} />
              <ImagePreviewGrid images={images} onRemove={removeImage} />
            </section>

            {/* Story description + voice */}
            <section>
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-gradient-to-b from-violet-500 to-cyan-500 rounded-full" />
                Story Description
              </h2>
              <div className="flex gap-3 items-start">
                <textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Describe the story, characters, style preferences… or use the mic button to dictate."
                  rows={4}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors resize-none text-sm"
                />
                <VoiceRecorder onTranscribed={handleTranscribed} disabled={isLoading} />
              </div>
            </section>

            {/* Settings */}
            <section>
              <ComicSettings
                panelsPerPage={panelsPerPage} artStyle={artStyle}
                setPanelsPerPage={setPanelsPerPage} setArtStyle={setArtStyle}
              />
            </section>

            {/* Error */}
            {error && (
              <div className="bg-red-950/50 border border-red-500/50 text-red-300 rounded-xl p-3 text-sm">
                {error}
              </div>
            )}

            {/* Generate button */}
            <div className="flex justify-center">
              <GenerateButton
                isLoading={isLoading}
                disabled={images.length === 0 && !textInput.trim()}
                onClick={generateComic}
              />
            </div>
          </div>
        )}

        {/* Visual comic book result */}
        {comicBook && (
          <ComicBook comicBook={comicBook} onReset={reset} />
        )}

        <footer className="text-center py-8 text-gray-600 text-xs">
          AI Comic Studio — Powered by Gemini AI &amp; faster-whisper
        </footer>
      </div>
    </div>
  );
}
