import React from 'react';

const ComicViewer = ({ comicResult, onClose }) => {
  if (!comicResult) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Your Generated Comic</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comicResult.pages.map((page) => (
              <div key={page.id} className="border-2 border-yellow-400 rounded-lg overflow-hidden shadow-lg bg-yellow-50">
                <div className="p-2 bg-yellow-400 text-center">
                  <span className="font-bold">Page {page.id}</span>
                </div>
                <img 
                  src={page.imageUrl} 
                  alt={`Comic page ${page.id}`} 
                  className="w-full h-64 object-contain"
                />
                {page.panels && page.panels.length > 0 && (
                  <div className="p-2 bg-gray-100">
                    <p className="text-xs text-gray-600">Panels: {page.panels.length}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t text-center">
          <button 
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComicViewer;