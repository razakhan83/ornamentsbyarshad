'use client';

import { useSyncExternalStore } from 'react';
import { useVisitorTracker } from '@/hooks/use-visitor-tracker';

const emptySubscribe = () => () => {};

function TrackerClient() {
  useVisitorTracker();
  return null;
}

export default function VisitorTracker() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    return null;
  }

  return <TrackerClient />;
}
