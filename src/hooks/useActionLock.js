'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Serializes an async action: a synchronous ref rejects re-entry within the
 * same tick (before React re-renders), and `isPending` drives disabled UI.
 *
 *   const { isPending, run } = useActionLock();
 *   <button disabled={isPending} onClick={() => run(async () => { await save(); })} />
 */
export function useActionLock() {
  const lockRef = useRef(false);
  const mountedRef = useRef(true);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (action) => {
    if (lockRef.current) return { skipped: true };
    lockRef.current = true;
    setIsPending(true);
    try {
      const result = await action();
      return { skipped: false, result };
    } finally {
      if (mountedRef.current) {
        setIsPending(false);
      }
      lockRef.current = false;
    }
  }, []);

  return { isPending, run, isLocked: () => lockRef.current };
}
