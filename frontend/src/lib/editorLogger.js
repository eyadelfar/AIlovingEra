/**
 * Structured logging system for KeepSqueak editor operations.
 * All logs are prefixed with [KS:<category>] for easy filtering in browser console.
 * Last 200 entries are kept in memory for debug dumps via window.__ksLog.dump().
 */

const _log = [];
const MAX_LOG = 200;

const logger = {
  action(category, action, data) {
    const entry = { ts: Date.now(), cat: category, action, ...data };
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[KS:${category}] ${action}`, data || '');
    }
    _log.push(entry);
    if (_log.length > MAX_LOG) _log.shift();
  },

  dump() {
    console.table(_log);
    return _log;
  },

  last(n = 10) {
    return _log.slice(-n);
  },
};

// Expose on window for debug access
if (typeof window !== 'undefined') {
  window.__ksLog = logger;
}

export default logger;
