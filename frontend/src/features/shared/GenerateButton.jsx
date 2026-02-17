/**
 * Single responsibility: gradient button with spinner.
 */
export default function GenerateButton({ isLoading, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-10 py-3 rounded-xl font-semibold hover:from-violet-700 hover:to-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/30 text-sm tracking-wide"
    >
      {isLoading ? (
        <span className="flex items-center gap-3">
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Generating Comic…
        </span>
      ) : (
        'Generate Comic'
      )}
    </button>
  );
}
