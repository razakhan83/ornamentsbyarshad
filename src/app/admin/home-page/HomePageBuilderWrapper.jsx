'use client';

import dynamic from 'next/dynamic';
import { AdminHomePageBuilderSkeleton } from '@/components/AdminDashboardSkeleton';

const HomePageBuilderClient = dynamic(() => import('./HomePageBuilderClient'), {
  ssr: false,
  loading: () => <AdminHomePageBuilderSkeleton />,
});

export default function HomePageBuilderWrapper(props) {
  return <HomePageBuilderClient {...props} />;
}
