'use client';

import { useEffect } from 'react';

export default function ProductPageScrollReset() {
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    scrollToTop();
    const frameId = window.requestAnimationFrame(scrollToTop);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return null;
}
