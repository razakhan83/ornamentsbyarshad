'use client';

import { Star, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PAKISTANI_TESTIMONIALS = [
  {
    id: 't-1',
    userName: 'Ayesha Khan',
    city: 'Karachi',
    rating: 5,
    comment: 'The finishing and gold polish on my bridal set was beyond expectation. Truly master craftsmanship!',
  },
  {
    id: 't-2',
    userName: 'Maham Tariq',
    city: 'Lahore',
    rating: 5,
    comment: 'Ordered earrings for a family event, received non-stop compliments. Safe delivery and magnificent packaging.',
  },
  {
    id: 't-3',
    userName: 'Sana Javed',
    city: 'Islamabad',
    rating: 5,
    comment: 'Authentic Pakistani jewelry at its finest. The gemstones sparkle with incredible natural brilliance.',
  },
  {
    id: 't-4',
    userName: 'Fatima Zahra',
    city: 'Faisalabad',
    rating: 5,
    comment: 'Loved the intricate detailing. It looks and feels like pure timeless heirloom luxury.',
  },
  {
    id: 't-5',
    userName: 'Zara Sheikh',
    city: 'Multan',
    rating: 5,
    comment: 'Customer support on WhatsApp was extremely courteous and helpful. 10/10 experience!',
  },
  {
    id: 't-6',
    userName: 'Hira Mani',
    city: 'Rawalpindi',
    rating: 5,
    comment: 'The polish and weight are perfect. MashAllah such fine, detailed master artisan work.',
  },
  {
    id: 't-7',
    userName: 'Anum Bilal',
    city: 'Peshawar',
    rating: 5,
    comment: 'Exquisite pieces! Was cautious ordering online, but the quality exceeded all expectations.',
  },
  {
    id: 't-8',
    userName: 'Zoya Ali',
    city: 'Sialkot',
    rating: 5,
    comment: 'Got my order delivered safely on time in tamper-proof luxury packaging. Truly grateful.',
  },
  {
    id: 't-9',
    userName: 'Maryam Nawaz',
    city: 'Gujranwala',
    rating: 5,
    comment: 'Such royal and elegant jewelry. Wore it to a wedding reception and everyone asked where it was from!',
  },
  {
    id: 't-10',
    userName: 'Nimra Ahmed',
    city: 'Hyderabad',
    rating: 5,
    comment: 'Super premium quality and stunning presentation. Will definitely be ordering more for future events.',
  },
  {
    id: 't-11',
    userName: 'Samina Kashif',
    city: 'Karachi',
    rating: 5,
    comment: 'The detail in the Kundan work is unmatched. Beautifully handcrafted and comfortable to wear.',
  },
  {
    id: 't-12',
    userName: 'Rabia Asif',
    city: 'Lahore',
    rating: 5,
    comment: 'Extremely satisfied! The gold luster remains spotless and radiant. Truly royal collection.',
  },
];

export default function PakistaniTestimonialsCarousel() {
  // Double array for continuous seamless marquee scroll
  const marqueeItems = [...PAKISTANI_TESTIMONIALS, ...PAKISTANI_TESTIMONIALS];

  return (
    <section className="relative w-full border-t border-[#E8E5DF] bg-[#FAF9F6] py-16 md:py-24 overflow-hidden select-none">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 mb-10 text-center">
        <div className="text-[#A67C52] text-[10.5px] sm:text-xs font-sans uppercase tracking-[0.26em] font-semibold mb-2">
          <span>Cherished Patrons</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal tracking-wide text-[#121212] uppercase">
          Words of Appreciation
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-neutral-500 font-sans max-w-lg mx-auto">
          Honored to be a part of life&apos;s most memorable moments across Pakistan.
        </p>
      </div>

      {/* Auto-scrolling Marquee Row */}
      <div className="relative w-full overflow-hidden mask-edge group">
        <div className="flex w-max gap-4 sm:gap-6 animate-marquee hover:[animation-play-state:paused] py-2">
          {marqueeItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="w-[280px] sm:w-[340px] shrink-0 rounded-none border border-[#E8E5DF] bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all duration-300 hover:border-[#121212]/40 hover:shadow-md"
            >
              <div>
                {/* 5-Star Rating */}
                <div className="flex items-center gap-1 text-[#D97706] mb-3.5">
                  {Array.from({ length: 5 }).map((_, sIdx) => (
                    <Star key={sIdx} className="size-3.5 fill-current" />
                  ))}
                </div>

                {/* Review Text Quote */}
                <p className="font-sans text-xs sm:text-[13px] leading-relaxed text-[#121212]/85 italic">
                  &ldquo;{item.comment}&rdquo;
                </p>
              </div>

              {/* Author & City Footer */}
              <div className="mt-5 pt-3.5 border-t border-[#F0ECE1] flex items-center justify-between">
                <div>
                  <h4 className="font-sans text-xs sm:text-[13px] font-semibold text-[#121212]">
                    {item.userName}
                  </h4>
                  <span className="text-[10.5px] font-sans text-[#8C827A] uppercase tracking-wider">
                    {item.city}, Pakistan
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[#A67C52] text-[10.5px] font-sans font-medium uppercase tracking-wider">
                  <ShieldCheck className="size-3.5" />
                  <span>Verified</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
