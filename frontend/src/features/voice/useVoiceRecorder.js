import { useState, useRef } from 'react';
import { transcribeAudio } from '../../api/sttApiService';

/**
 * Picks the best supported MIME type for recording.
 * Priority: webm/opus (Chrome/Edge) → ogg/opus (Firefox) → mp4 (Safari/iOS).
 * faster-whisper/PyAV can decode all three via FFmpeg.
 */
function getBestMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}

/**
 * Single responsibility: MediaRecorder lifecycle + transcription call.
 * Fires onTranscribed(text) when the backend returns a result.
 */
export function useVoiceRecorder({ onTranscribed }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeTypeRef = useRef('');

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getBestMimeType();
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        // Send full blob (not individual chunks) — PyAV needs a complete container
        const blob = new Blob(chunksRef.current, {
          type: mimeTypeRef.current || 'audio/webm',
        });
        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(blob);
          onTranscribed(text);
        } catch (err) {
          setError(err.message ?? 'Transcription failed');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied: ' + (err.message ?? 'unknown error'));
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  return { isRecording, isTranscribing, error, startRecording, stopRecording };
}
