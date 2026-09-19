'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { createWhatsAppUrl } from '@/lib/whatsapp';
import { useCartUi } from '@/context/CartContext';
import { cn } from '@/lib/utils';

function FloatingWhatsAppContent({ whatsappNumber = '', storeName = 'Ornaments by Arshad' }) {
  const pathname = usePathname();
  const { isCartOpen = false, isSidebarOpen = false } = useCartUi() || {};
  const [isNavHidden, setIsNavHidden] = useState(false);

  // Listen to data-nav-hidden attribute on documentElement (set by Navbar scroll listener)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const checkNavState = () => {
      const isHidden = document.documentElement.getAttribute('data-nav-hidden') === 'true';
      setIsNavHidden(isHidden);
    };

    checkNavState();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-nav-hidden') {
          checkNavState();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-nav-hidden'] });

    return () => observer.disconnect();
  }, []);

  // Hide on admin routes and checkout page
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/checkout')) {
    return null;
  }

  const whatsappUrl = createWhatsAppUrl(
    whatsappNumber,
    `Salam ${storeName}, I would like to inquire about jewelry pieces & custom designs.`
  );

  if (!whatsappUrl) {
    return null;
  }

  // When bottom nav is hidden (due to scroll down, cart open, or sidebar open), translate down to bottom-4
  const isBottomNavHidden = isNavHidden || isCartOpen || isSidebarOpen;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'whatsapp-float fixed right-4 md:right-6 bottom-[calc(env(safe-area-inset-bottom)+4.6rem)] md:bottom-8 z-[340] inline-flex size-12 sm:size-14 items-center justify-center rounded-full sm:rounded-sm border border-[#F2D6A2]/60 bg-gradient-to-tr from-[#8C6239] via-[#A67C52] to-[#BFA17A] text-white shadow-[0_12px_32px_rgba(166,124,82,0.42)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform transform-gpu hover:scale-110 hover:brightness-105 active:scale-95 group cursor-pointer',
        isBottomNavHidden
          ? 'translate-y-[3.4rem] md:translate-y-0'
          : 'translate-y-0'
      )}
      aria-label="Chat on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <WhatsAppIcon className="size-6 sm:size-7 fill-white text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-300 group-hover:scale-110" />
      <span className="sr-only">Contact on WhatsApp</span>
    </a>
  );
}

export default function FloatingWhatsApp(props) {
  return (
    <Suspense fallback={null}>
      <FloatingWhatsAppContent {...props} />
    </Suspense>
  );
}



