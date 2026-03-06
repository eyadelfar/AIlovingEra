const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const FLUSH_INTERVAL = 10_000; // 10 seconds
const MAX_BUFFER = 20;

let _buffer = [];
let _flushTimer = null;
let _sessionId = null;

function getSessionId() {
  if (_sessionId) return _sessionId;
  try {
    _sessionId = sessionStorage.getItem('ks_session_id');
    if (!_sessionId) {
      _sessionId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
      sessionStorage.setItem('ks_session_id', _sessionId);
    }
  } catch {
    _sessionId = Math.random().toString(36).slice(2);
  }
  return _sessionId;
}

function getDeviceType() {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getAuthToken() {
  try {
    const raw = localStorage.getItem('sb-auth-token');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.access_token || null;
    }
    // Try supabase session key pattern
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('supabase') && key?.includes('auth')) {
        const val = JSON.parse(localStorage.getItem(key));
        return val?.access_token || null;
      }
    }
  } catch { /* ignore */ }
  return null;
}

async function flush() {
  if (_buffer.length === 0) return;
  const events = [..._buffer];
  _buffer = [];

  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    await fetch(`${API_BASE}/api/events/track`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events }),
    });
  } catch {
    // Re-add to buffer on failure (but cap to prevent memory leaks)
    _buffer = [...events.slice(-MAX_BUFFER), ..._buffer].slice(0, MAX_BUFFER * 2);
  }
}

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    flush();
  }, FLUSH_INTERVAL);
}

/**
 * Track an event. Events are buffered and sent in batches.
 * @param {string} eventType - e.g. 'step_entered', 'text_edited'
 * @param {string} category - e.g. 'wizard', 'editor', 'auth'
 * @param {object} [payload={}] - Additional event data
 */
export function trackEvent(eventType, category, payload = {}) {
  _buffer.push({
    event_type: eventType,
    event_category: category,
    payload,
    page_path: window.location.pathname,
    device_type: getDeviceType(),
    session_id: getSessionId(),
  });

  if (_buffer.length >= MAX_BUFFER) {
    flush();
  } else {
    scheduleFlush();
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && _buffer.length > 0) {
      const headers = { type: 'application/json' };
      const body = JSON.stringify({ events: _buffer });
      _buffer = [];
      try {
        navigator.sendBeacon(
          `${API_BASE}/api/events/track`,
          new Blob([body], headers)
        );
      } catch { /* ignore */ }
    }
  });
}
