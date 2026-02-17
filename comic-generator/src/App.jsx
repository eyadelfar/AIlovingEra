import { useState, useRef } from 'react';
import GeminiComicGenerator from './gemini-api';
import ComicViewer from './components/ComicViewer';
import './App.css';

function App() {
  const [images, setImages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [numImages, setNumImages] = useState(4);
  const [numPages, setNumPages] = useState(2);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [comicResult, setComicResult] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [showComicViewer, setShowComicViewer] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name
    }));
    
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleGenerateComic = async () => {
    if (!apiKey) {
      alert('Please enter your Gemini API key');
      return;
    }

    if (images.length === 0 && !textInput.trim()) {
      alert('Please upload at least one image or enter some text');
      return;
    }

    setIsLoading(true);
    
    try {
      // Initialize the Gemini comic generator
      const generator = new GeminiComicGenerator(apiKey);
      await generator.initializeModel();

      // Extract raw File objects from our image objects
      const imageFiles = images.map(img => img.file);

      // Generate the comic using Gemini
      const comicStructure = await generator.generateComicFromImagesAndText(
        imageFiles,
        textInput,
        numPages,
        numImages
      );

      // Process the comic structure into a format for display
      // For now, we'll simulate image generation using placeholders
      // In a real implementation, you would generate actual comic images
      const processedPages = comicStructure.pages.map((page, idx) => ({
        id: page.pageNumber || idx + 1,
        imageUrl: `https://placehold.co/600x800?text=Comic+Page+${idx+1}&font=roboto`,
        panels: page.panels || []
      }));

      setComicResult({
        pages: processedPages
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error generating comic:', error);
      alert('Failed to generate comic. Please check your API key and try again.');
      setIsLoading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center py-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">Comic Generator</h1>
          <p className="text-gray-600">Transform your images and text into amazing comics with AI</p>
        </header>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b">
            <button 
              className={`flex-1 py-4 px-6 text-center font-medium ${activeTab === 'upload' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload & Configure
            </button>
            <button 
              className={`flex-1 py-4 px-6 text-center font-medium ${activeTab === 'generate' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('generate')}
              disabled={images.length === 0 && !textInput.trim()}
            >
              Generate Comic
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'upload' && (
              <div className="space-y-8">
                {/* API Key Input */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-2">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    id="api-key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Don't have an API key? Get one from Google AI Studio
                  </p>
                </div>

                {/* Image Upload Section */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Images</h2>
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={triggerFileSelect}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600 mb-2">Click to upload images</p>
                      <p className="text-sm text-gray-500">Supports JPG, PNG, WEBP (Max 10MB each)</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                  </div>

                  {/* Uploaded Images Preview */}
                  {images.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-medium text-gray-700 mb-3">Uploaded Images ({images.length})</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {images.map((image) => (
                          <div key={image.id} className="relative group">
                            <img 
                              src={image.previewUrl} 
                              alt={image.name}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <button
                              onClick={() => removeImage(image.id)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <p className="text-xs text-gray-500 mt-1 truncate">{image.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Text Input Section */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Context</h2>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Describe the story you want to create, characters, style preferences, etc."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Configuration Options */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Comic Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Images per Page
                      </label>
                      <select
                        value={numImages}
                        onChange={(e) => setNumImages(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {[2, 3, 4, 6, 8].map(num => (
                          <option key={num} value={num}>{num} images</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Pages
                      </label>
                      <select
                        value={numPages}
                        onChange={(e) => setNumPages(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10].map(num => (
                          <option key={num} value={num}>{num} pages</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'generate' && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Generate Comic</h2>
                  <p className="text-gray-600">
                    Based on your uploaded images and settings, we'll generate a custom comic using Gemini AI.
                  </p>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleGenerateComic}
                    disabled={isLoading || !apiKey || (images.length === 0 && !textInput.trim())}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Comic...
                      </span>
                    ) : (
                      'Generate Comic with Gemini'
                    )}
                  </button>
                </div>

                {comicResult && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Generated Comic</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {comicResult.pages.map(page => (
                        <div key={page.id} className="border rounded-lg overflow-hidden shadow-md">
                          <img 
                            src={page.imageUrl} 
                            alt={`Comic page ${page.id}`} 
                            className="w-full h-64 object-cover"
                          />
                          <div className="p-3 bg-gray-50">
                            <p className="text-sm text-gray-600">Page {page.id}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowComicViewer(true)}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
                      >
                        View Full Comic
                      </button>
                    </div>
                  </div>
                )}
                
                {showComicViewer && comicResult && (
                  <ComicViewer 
                    comicResult={comicResult} 
                    onClose={() => setShowComicViewer(false)} 
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="text-center py-8 text-gray-600 text-sm">
          <p>Powered by Gemini AI • Transform your images and stories into amazing comics</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
