'use client';

import dynamic from 'next/dynamic';

const InvoiceButton = dynamic(() => import('./InvoiceButton'), { 
  ssr: false,
  loading: () => <div className="h-8 w-16 bg-muted animate-pulse rounded-md" />
});

export default function InvoiceButtonWrapper(props) {
  return <InvoiceButton {...props} />;
}
