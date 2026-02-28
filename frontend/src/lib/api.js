const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res;
}

export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  return res.json();
}

export async function apiBlob(path, options = {}) {
  const res = await apiFetch(path, options);
  return res.blob();
}
