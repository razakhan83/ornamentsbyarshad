import Link from 'next/link';
import { PackageX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProductNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <PackageX className="size-10 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">Product not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This product doesn&apos;t exist or is no longer available.
        </p>
      </div>
      <Button variant="outline" render={<Link href="/products" />} className="gap-2">
          <ArrowLeft className="size-4" />
          Browse Products
      </Button>
    </div>
  );
}
