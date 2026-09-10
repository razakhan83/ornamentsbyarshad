'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const CartDrawer = dynamic(() => import('@/components/CartDrawer'), {
  ssr: false,
  loading: () => null,
});

function scheduleDeferredMount(callback) {
  if (typeof window === 'undefined') return () => {};

  let cleanedUp = false;
  let timeoutId = null;
  let idleId = null;

  const detachListeners = () => {
    window.removeEventListener('pointerdown', run);
    window.removeEventListener('keydown', run);
    window.removeEventListener('focus', run);
  };

  const run = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    detachListeners();
    if (timeoutId != null) window.clearTimeout(timeoutId);
    if (idleId != null && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(idleId);
    }
    callback();
  };

  window.addEventListener('pointerdown', run, { once: true, passive: true });
  window.addEventListener('keydown', run, { once: true });
  window.addEventListener('focus', run, { once: true });

  if ('requestIdleCallback' in window) {
    idleId = window.requestIdleCallback(run, { timeout: 1000 });
  } else {
    timeoutId = window.setTimeout(run, 500);
  }

  return () => {
    cleanedUp = true;
    detachListeners();
    if (timeoutId != null) window.clearTimeout(timeoutId);
    if (idleId != null && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(idleId);
    }
  };
}

export default function StoreDeferredChrome({ whatsappNumber = '', storeName = 'Ornaments by Arshad', hasAnnouncementBar = false }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    return scheduleDeferredMount(() => {
      setIsReady(true);
    });
  }, []);

  if (!isReady) return null;

  return (
    <>
      <CartDrawer whatsappNumber={whatsappNumber} storeName={storeName} hasAnnouncementBar={hasAnnouncementBar} />
    </>
  );
}
