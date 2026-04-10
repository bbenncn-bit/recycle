/**
 * Preload script for Node: run with node -r ./scripts/patch-localstorage.js
 * Fixes broken global localStorage when Node is started with --localstorage-file
 * but without a valid path (e.g. in Cursor's integrated terminal).
 * Must run before any other app code; used by: npm run dev
 */
const g = globalThis;
if (g.localStorage != null && typeof g.localStorage.getItem !== 'function') {
  const noop = () => {};
  g.localStorage = {
    getItem: () => null,
    setItem: noop,
    removeItem: noop,
    clear: noop,
    get length() { return 0; },
    key: () => null,
  };
}
