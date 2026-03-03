import { apiFetch } from '../lib/api';
import i18n from '../lib/i18n';

export async function transcribeAudio(audioBlob) {
  const ext = audioBlob.type.includes('mp4') ? 'mp4'
    : audioBlob.type.includes('ogg') ? 'ogg'
    : 'webm';
  const form = new FormData();
  form.append('audio', audioBlob, `recording.${ext}`);
  if (i18n.language) {
    form.append('language', i18n.language);
  }
  const res = await apiFetch('/api/stt/transcribe', { method: 'POST', body: form });
  return (await res.json()).text;
}
