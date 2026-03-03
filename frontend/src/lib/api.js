import { supabase } from './supabase';
import useAuthStore from '../stores/authStore';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const DEFAULT_TIMEOUT = 60_000; // 60s
const MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 4000]; // exponential backoff

/**
 * Get the current access token without blocking on supabase.auth.getSession().
 * Primary source: the zustand-persisted authStore (instant, synchronous read).
 * Fallback: supabase.auth.getSession() with a short timeout.
 * This avoids the navigator.locks contention that causes getSession() to hang.
 */
export async function getAccessToken() {
  // 1. Try the zustand store first — instant, no lock contention
  const storeSession = useAuthStore.getState().session;
  if (storeSession?.access_token) {
    return storeSession.access_token;
  }

  // 2. Fallback: ask Supabase directly (with timeout to prevent hang)
  if (supabase) {
    try {
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('session_timeout')), 3000)),
      ]);
      return result?.data?.session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

function isRetryable(status) {
  return status >= 500 || status === 0; // 5xx or network error (status 0)
}

export async function apiFetch(path, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, retries = MAX_RETRIES, ...fetchOpts } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Wire external signal to our internal controller
    if (fetchOpts.signal) {
      if (fetchOpts.signal.aborted) {
        clearTimeout(timeoutId);
        throw new DOMException('Aborted', 'AbortError');
      }
      fetchOpts.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      // Inject auth header if we have a session
      const token = await getAccessToken();
      if (token) {
        fetchOpts.headers = { ...(fetchOpts.headers || {}), Authorization: `Bearer ${token}` };
      }

      const res = await fetch(`${BASE}${path}`, {
        ...fetchOpts,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // Don't retry client errors (4xx)
        if (res.status >= 400 && res.status < 500) {
          throw await buildError(res);
        }
        // Retry 5xx errors
        if (isRetryable(res.status) && attempt < retries) {
          lastError = await buildError(res);
          await delay(RETRY_DELAYS[attempt] || 4000);
          continue;
        }
        throw await buildError(res);
      }

      return res;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        if (fetchOpts.signal?.aborted) {
          throw err; // User-initiated abort, don't retry
        }
        // Timeout — retry if we have attempts left
        lastError = new Error('Request timed out');
        if (attempt < retries) {
          await delay(RETRY_DELAYS[attempt] || 4000);
          continue;
        }
        throw lastError;
      }

      // Network error — retry
      if (attempt < retries) {
        lastError = err;
        await delay(RETRY_DELAYS[attempt] || 4000);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Request failed');
}

async function buildError(res) {
  const text = await res.text();
  let message = text || `Request failed: ${res.status}`;
  try {
    const json = JSON.parse(text);
    if (json.detail) {
      if (Array.isArray(json.detail)) {
        message = json.detail.map(d => {
          const loc = Array.isArray(d.loc) ? d.loc.filter(l => l !== 'body').join('.') : '';
          return loc ? `${loc}: ${d.msg}` : d.msg;
        }).join('; ');
      } else if (typeof json.detail === 'string') {
        message = json.detail;
      }
    } else if (json.message) {
      message = json.message;
    }
  } catch {
    // text wasn't JSON, use as-is
  }
  return new Error(message);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  return res.json();
}

export async function apiBlob(path, options = {}) {
  const res = await apiFetch(path, options);
  return res.blob();
}
