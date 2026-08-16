export interface IdleTask {
  cancel: () => void;
}

type IdleGlobals = typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Schedules non-urgent work without blocking navigation or gestures.
 * The timeout fallback keeps tests and older runtimes compatible.
 */
export function runWhenIdle(callback: () => void, timeout = 500): IdleTask {
  const idleGlobals = globalThis as IdleGlobals;
  let cancelled = false;

  if (typeof idleGlobals.requestIdleCallback === 'function') {
    const handle = idleGlobals.requestIdleCallback(() => {
      if (!cancelled) callback();
    }, { timeout });
    return {
      cancel: () => {
        cancelled = true;
        idleGlobals.cancelIdleCallback?.(handle);
      },
    };
  }

  const handle = setTimeout(() => {
    if (!cancelled) callback();
  }, 0);
  return {
    cancel: () => {
      cancelled = true;
      clearTimeout(handle);
    },
  };
}
