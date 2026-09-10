'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

function ConditionalLayoutInner({ children }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/checkout')) return null;
  
  return <>{children}</>;
}

export default function ConditionalLayoutElements({ children }) {
  return (
    <Suspense fallback={null}>
      <ConditionalLayoutInner>{children}</ConditionalLayoutInner>
    </Suspense>
  );
}

function HomeOnlyLayoutInner({ children }) {
  const pathname = usePathname();
  if (pathname !== '/') return null;

  return <>{children}</>;
}

export function HomeOnlyLayoutElements({ children }) {
  return (
    <Suspense fallback={null}>
      <HomeOnlyLayoutInner>{children}</HomeOnlyLayoutInner>
    </Suspense>
  );
}
