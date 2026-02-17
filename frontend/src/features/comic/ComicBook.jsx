import { useState } from 'react';
import ComicPanel from './ComicPanel';
import { downloadComicPdf } from '../../api/comicApiService';

/**
 * Single responsibility: renders the full visual comic book with page navigation and PDF download.
 */
export default function ComicBook({ comicBook, onReset }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!comicBook) return null;

  const pages = comicBook.pages ?? [];
  const page = pages[currentPage];
  const totalPages = pages.length;

  async function handleDownloadPdf() {
    setIsDownloading(true);
    try {
      await downloadComicPdf(comicBook, comicBook.title || 'comic');
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  }

  // Build panel grid: 2-col for ≤4 panels, 3-col for ≥5
  const panels = page?.panels ?? [];
  const cols = panels.length <= 4 ? 2 : 3;

  return (
    <div className="mt-8 space-y-4">
      {/* ── Comic header ──────────────────────────────────────────────────── */}
      <div className="bg-gray-900/80 border border-gray-700/50 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">{comicBook.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-900/60 text-violet-300 border border-violet-700/50 capitalize">
                {comicBook.genre}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 capitalize">
                {comicBook.art_style}
              </span>
              <span className="text-xs text-gray-500">{totalPages} pages · {pages.reduce((s, p) => s + p.panels.length, 0)} panels</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-violet-700 hover:to-cyan-700 disabled:opacity-50 transition-all"
            >
              {isDownloading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {isDownloading ? 'Generating PDF…' : 'Download PDF'}
            </button>

            <button
              onClick={onReset}
              className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              New Comic
            </button>
          </div>
        </div>
      </div>

      {/* ── Comic page ────────────────────────────────────────────────────── */}
      <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
        {/* Page header */}
        <div className="bg-gray-950 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors p-1"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <span className="text-white font-bold text-sm">Page {currentPage + 1}</span>
            <span className="text-gray-500 text-sm"> / {totalPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors p-1"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Panel grid — comic book layout */}
        <div
          className="p-2 gap-1"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            backgroundColor: '#000',
            gap: 4,
          }}
        >
          {panels.map(panel => (
            <ComicPanel
              key={panel.panel_number}
              panel={panel}
              className={`
                ${panel.layout === 'full' ? `col-span-${cols}` : ''}
                ${panel.layout === 'wide' && cols === 2 ? 'col-span-2' : ''}
                ${panel.layout === 'wide' && cols === 3 ? 'col-span-2' : ''}
              `}
              style={{ minHeight: 200 }}
            />
          ))}
        </div>

        {/* Page dots navigation */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1.5 py-3 bg-gray-950">
            {pages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                className={`rounded-full transition-all ${
                  idx === currentPage
                    ? 'w-4 h-2 bg-violet-500'
                    : 'w-2 h-2 bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
