import Link from 'next/link';

export const metadata = {
  title: '404 - Page Not Found | Ornaments by Arshad',
  description: 'The luxury collection page you were looking for does not exist or has been moved.',
};

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#FAF9F6] px-4 py-16 text-center">
      <span className="font-serif text-6xl sm:text-8xl font-light text-[#A67C52] tracking-widest block mb-2">
        404
      </span>

      <h1 className="font-serif text-2xl sm:text-3xl font-normal tracking-wide text-[#121212] uppercase">
        Piece or Page Not Found
      </h1>

      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#737373] max-w-md mx-auto leading-relaxed">
        The creation or salon you are looking for does not exist or has been archived by our atelier.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="h-12 px-8 inline-flex items-center justify-center rounded-none bg-[#121212] text-white hover:bg-neutral-800 font-semibold text-xs uppercase tracking-[0.18em] transition-all"
        >
          Return to Home
        </Link>
        <Link
          href="/products"
          className="h-12 px-8 inline-flex items-center justify-center rounded-none border border-[#121212] bg-white hover:bg-[#FAF9F6] text-[#121212] font-semibold text-xs uppercase tracking-[0.18em] transition-all"
        >
          Explore Creations
        </Link>
      </div>
    </div>
  );
}
