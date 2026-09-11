'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';

function ConditionalHideContent({ children }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/checkout')) return null;

  return <>{children}</>;
}

export default function ConditionalLayoutElements({ children }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <ConditionalHideContent>{children}</ConditionalHideContent>
    </Suspense>
  );
}

function HomeOnlyContent({ children }) {
  const pathname = usePathname();
  if (pathname !== '/') return null;

  return <>{children}</>;
}

export function HomeOnlyLayoutElements({ children }) {
  return (
    <Suspense fallback={null}>
      <HomeOnlyContent>{children}</HomeOnlyContent>
    </Suspense>
  );
}

