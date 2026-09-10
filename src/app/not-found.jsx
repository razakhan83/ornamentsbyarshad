import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: '404 - Page Not Found | Ornaments by Arshad',
  description: 'The luxury collection page you were looking for does not exist or has been moved.',
};

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <div className="mb-5 flex items-center justify-center select-none">
        <Image
          src="/undraw_page-not-found_6wni (1).svg"
          alt="Page not found"
          width={240}
          height={170}
          className="h-auto w-[180px] sm:w-[240px] object-contain"
          priority
        />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        Page Not Found
      </h1>

      <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="h-10 px-5 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm shadow-none transition-all active:scale-[0.98]"
        >
          Back to Home
        </Link>
        <Link
          href="/products"
          className="h-10 px-5 inline-flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground font-bold text-xs sm:text-sm shadow-none transition-all active:scale-[0.98]"
        >
          Explore Catalog
        </Link>
      </div>
    </div>
  );
}
