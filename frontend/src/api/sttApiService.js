const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Single responsibility: sends audio to the backend STT endpoint.
 * @param {Blob} audioBlob - the recorded audio blob
 * @returns {Promise<string>} transcribed text
 */
export async function transcribeAudio(audioBlob) {
  // Derive file extension from MIME type so PyAV/FFmpeg picks the right demuxer
  const ext = audioBlob.type.includes('mp4') ? 'mp4'
    : audioBlob.type.includes('ogg') ? 'ogg'
    : 'webm';
  const form = new FormData();
  form.append('audio', audioBlob, `recording.${ext}`);
  const res = await fetch(`${BASE}/api/stt/transcribe`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).text;
}
