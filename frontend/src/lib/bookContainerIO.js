/**
 * Book Container I/O — embed/extract book JSON data from any file container.
 *
 * Binary format (appended after the original file bytes):
 *   [original file bytes][deflate-compressed JSON][8-byte payload length (BigUint64LE)][8-byte magic "KSQB0001"]
 *
 * The magic marker at the very end makes detection trivial:
 *   1. Read last 16 bytes
 *   2. Check if last 8 bytes === "KSQB0001"
 *   3. Read preceding 8 bytes as BigUint64LE → compressed payload length
 *   4. Slice the compressed payload, decompress, parse JSON
 */

const MAGIC = 'KSQB0001';
const MAGIC_BYTES = new TextEncoder().encode(MAGIC); // 8 bytes

/**
 * Compress a string using the Compression Streams API (deflate).
 * @param {string} str
 * @returns {Promise<Uint8Array>}
 */
async function compressString(str) {
  const encoded = new TextEncoder().encode(str);
  const cs = new CompressionStream('deflate');
  const writer = cs.writable.getWriter();
  writer.write(encoded);
  writer.close();
  const reader = cs.readable.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Decompress a deflate-compressed Uint8Array back to a string.
 * @param {Uint8Array} compressed
 * @returns {Promise<string>}
 */
async function decompressToString(compressed) {
  const ds = new DecompressionStream('deflate');
  const writer = ds.writable.getWriter();
  writer.write(compressed);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(result);
}

/**
 * Embed book JSON data into any file container (video, PDF, etc.).
 * Returns a new Blob with the original bytes + compressed JSON footer.
 *
 * @param {Blob} containerBlob - The original file blob (video, PDF, etc.)
 * @param {string} jsonString - The book JSON string to embed
 * @returns {Promise<Blob>}
 */
export async function embedBookData(containerBlob, jsonString) {
  const compressed = await compressString(jsonString);

  // 8-byte length (BigUint64LE)
  const lengthBuf = new ArrayBuffer(8);
  new DataView(lengthBuf).setBigUint64(0, BigInt(compressed.length), true);

  return new Blob(
    [containerBlob, compressed, new Uint8Array(lengthBuf), MAGIC_BYTES],
    { type: containerBlob.type },
  );
}

/**
 * Extract embedded book JSON data from a file.
 * Returns the parsed JSON string, or null if no embedded data found.
 *
 * @param {File|Blob} file
 * @returns {Promise<string|null>} The JSON string, or null
 */
export async function extractBookData(file) {
  const fileSize = file.size;
  if (fileSize < 16) return null;

  // Read the last 16 bytes: [8-byte length][8-byte magic]
  const tailSlice = file.slice(fileSize - 16, fileSize);
  const tailBuf = await tailSlice.arrayBuffer();
  const tailBytes = new Uint8Array(tailBuf);

  // Check magic
  const magicSlice = tailBytes.slice(8, 16);
  for (let i = 0; i < 8; i++) {
    if (magicSlice[i] !== MAGIC_BYTES[i]) return null;
  }

  // Read compressed payload length
  const lengthView = new DataView(tailBuf, 0, 8);
  const payloadLength = Number(lengthView.getBigUint64(0, true));

  if (payloadLength <= 0 || payloadLength > fileSize - 16) return null;

  // Read the compressed payload
  const payloadStart = fileSize - 16 - payloadLength;
  const payloadSlice = file.slice(payloadStart, payloadStart + payloadLength);
  const payloadBuf = await payloadSlice.arrayBuffer();
  const compressed = new Uint8Array(payloadBuf);

  // Decompress
  const jsonString = await decompressToString(compressed);
  return jsonString;
}

/**
 * Quick check whether a file has embedded book data (checks magic marker only).
 *
 * @param {File|Blob} file
 * @returns {Promise<boolean>}
 */
export async function hasEmbeddedBookData(file) {
  if (file.size < 16) return false;
  const tailSlice = file.slice(file.size - 8, file.size);
  const tailBuf = await tailSlice.arrayBuffer();
  const tailBytes = new Uint8Array(tailBuf);
  for (let i = 0; i < 8; i++) {
    if (tailBytes[i] !== MAGIC_BYTES[i]) return false;
  }
  return true;
}
