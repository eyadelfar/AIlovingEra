import { removeBackground as imglyRemoveBg } from '@imgly/background-removal';
import log from './editorLogger';

let ortConfigured = false;

async function configureOrt() {
  if (ortConfigured) return;
  ortConfigured = true;
  try {
    const ort = await import('onnxruntime-web');
    if (ort.env?.wasm) ort.env.wasm.numThreads = 1;
  } catch {
    // onnxruntime-web not directly importable — warnings are cosmetic only
  }
}

export async function removeBackground(imageUrl) {
  log.action('bgRemoval', 'start');
  await configureOrt();
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const resultBlob = await imglyRemoveBg(blob, { model: 'isnet_fp16' });
  log.action('bgRemoval', 'complete', { inputSize: blob.size, outputSize: resultBlob.size });
  return URL.createObjectURL(resultBlob);
}
