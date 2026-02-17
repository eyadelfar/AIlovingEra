import { useVoiceRecorder } from './useVoiceRecorder';

/**
 * Single responsibility: mic button UI with pulse animation while recording
 * and spinner while transcribing.
 */
export default function VoiceRecorder({ onTranscribed, disabled }) {
  const { isRecording, isTranscribing, error, startRecording, stopRecording } =
    useVoiceRecorder({ onTranscribed });

  function handleClick() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        title={isRecording ? 'Stop recording' : 'Record voice description'}
        className={`
          relative w-10 h-10 rounded-full flex items-center justify-center transition-all
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-900
          disabled:opacity-40 disabled:cursor-not-allowed
          ${isRecording
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
          }
        `}
      >
        {/* Pulsing ring while recording */}
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
        )}

        {isTranscribing ? (
          /* Spinner */
          <svg className="animate-spin h-5 w-5 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          /* Microphone icon */
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white relative z-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-1 15.93V21h2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
          </svg>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-400 max-w-[200px] text-center">{error}</p>
      )}
    </div>
  );
}
