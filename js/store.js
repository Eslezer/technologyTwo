/* Tiny persistence layer. The prototype keeps state in localStorage so it
   survives reloads on GitHub Pages; a real build would call an API.
   Every access is guarded because storage can be blocked (private mode). */
window.Store = (function () {
  const KEY = "jcu-support-demo-v1";
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { state = {}; }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  return {
    get(key, fallback) {
      return key in state ? state[key] : fallback;
    },
    set(key, value) {
      state[key] = value;
      save();
    },
    reset() {
      state = {};
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    },
  };
})();
