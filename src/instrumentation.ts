/**
 * Runs when the Next.js server starts (Node.js only).
 * Patches broken global localStorage when Node is run with --localstorage-file
 * but without a valid path, which can make localStorage.getItem not a function.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { startPurchaseIncrementalAutoSyncIfEnabled } = await import('@/lib/purchase-auto-sync');
  startPurchaseIncrementalAutoSyncIfEnabled();

  const g = globalThis as typeof globalThis & { localStorage?: unknown };
  if (g.localStorage != null && typeof (g.localStorage as { getItem?: unknown }).getItem !== 'function') {
    const noop = () => {};
    const noopReturnNull = () => null as string | null;
    (g as { localStorage: Storage }).localStorage = {
      getItem: noopReturnNull,
      setItem: noop,
      removeItem: noop,
      clear: noop,
      get length() {
        return 0;
      },
      key: () => null,
    };
  }
}
