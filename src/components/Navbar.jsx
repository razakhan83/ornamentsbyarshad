'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
const emptySubscribe = () => () => {};
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ChevronDown,
  LayoutGrid,

  Phone,
  Search,
  ShoppingBag,
  ShoppingCart,
  Clock,
  Store,
  Tag,
  X,
  Heart,
  Home,
  Package,
  MapPin,
  User,
  ArrowRight,
} from 'lucide-react';

import { useCartActions, useCartItems, useCartUi } from '@/context/CartContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Sheet,
  SheetContent,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import StoreLogo from '@/components/StoreLogo';
import { cn } from '@/lib/utils';

import NavbarSearchPanel from '@/components/NavbarSearchPanel';
import NavbarDesktopAccountControl from '@/components/NavbarDesktopAccountControl';

const AuthModal = dynamic(() => import('@/components/AuthModal'), {
  ssr: false,
  loading: () => null,
});

const MobileSearchOverlay = dynamic(() => import('@/components/MobileSearchOverlay'), {
  ssr: false,
});

const NavbarSidebarFooter = dynamic(() => import('@/components/NavbarSidebarFooter'), {
  ssr: false,
  loading: () => <Skeleton className="min-h-10 w-full rounded-xl" aria-hidden="true" />,
});

const MobileBottomNav = dynamic(() => import('@/components/MobileBottomNav'), {
  ssr: false,
  loading: () => null,
});

const MobileMenuContent = dynamic(() => import('@/components/MobileMenuContent'), {
  loading: () => <MobileMenuSkeleton />,
});

function MobileMenuSkeleton() {
  return (
    <div className="flex h-full w-full flex-col bg-sidebar">
      {/* Tabs list skeleton */}
      <div className="flex w-full items-center p-4 pb-2">
        <div className="grid h-10 w-full grid-cols-2 gap-2 rounded-lg bg-muted/40 p-1">
          <Skeleton className="h-8 w-full rounded-md bg-muted/60" />
          <Skeleton className="h-8 w-full rounded-md bg-transparent" />
        </div>
      </div>

      {/* Menu items skeleton */}
      <div className="flex-1 px-4 py-2 space-y-2.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex h-9 items-center gap-4 rounded-lg bg-gray-50/50 px-3 py-1.5 border border-transparent">
            <Skeleton className="size-4 rounded bg-muted/65 shrink-0" />
            <Skeleton className="h-3.5 w-24 rounded bg-muted/50" />
          </div>
        ))}
      </div>

      {/* Bottom section skeleton */}
      <div className="mt-auto flex flex-col gap-4 border-t border-border p-4 bg-background">
        <div className="flex justify-center gap-5 pb-5 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="size-[18px] rounded-full bg-muted/60" />
          ))}
        </div>
        <Skeleton className="h-9 w-full rounded-lg bg-muted/50" />
      </div>
    </div>
  );
}

function normalizeAnnouncementItems(messages = [], announcementText = '') {
  const rawMessages = Array.isArray(messages) && messages.length > 0
    ? messages
    : String(announcementText || '')
        .split(/\r?\n|[|•]+/)
        .map((text, index) => ({ id: `legacy-${index + 1}`, text, isActive: true }));

  return rawMessages
    .filter((item) => item?.isActive !== false)
    .map((item) => String(item?.text || '').trim())
    .filter(Boolean);
}

function AnnouncementMarquee({ items = [] }) {
  if (items.length === 0) return null;

  const totalCharacters = items.reduce((count, item) => count + item.length, 0);
  const durationSeconds = Math.min(120, Math.max(56, totalCharacters * 0.7));

  const marqueeItems = Array.from({ length: 4 }, (_, repeatIndex) =>
    items.map((text) => ({
      id: `${repeatIndex}-${text}`,
      text,
    }))
  ).flat();

  return (
    <div
      className="announcement-marquee mask-edge"
      style={{ '--announcement-marquee-duration': `${durationSeconds}s` }}
    >
      <div className="announcement-marquee__track">
        {[0, 1].map((copyIndex) => (
          <div
            key={copyIndex}
            className="announcement-marquee__content"
            aria-hidden={copyIndex === 1 ? 'true' : undefined}
          >
            {marqueeItems.map(({ id, text }, index) => (
              <span key={`${copyIndex}-${id}`} className="announcement-marquee__item">
                <span className="announcement-marquee__label">{text}</span>
                {index < marqueeItems.length - 1 ? (
                  <span className="announcement-marquee__separator" aria-hidden="true">
                    <span className="size-1 rounded-full bg-current opacity-60" />
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function NavbarContent({
  categories,
  storeName = 'Ornaments by Arshad',
  lightLogoUrl = '',
  darkLogoUrl = '',
  logoScalePercent = 100,
  announcementBarEnabled = true,
  announcementBarText = '',
  announcementBarMessages = [],
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { cartCount = 0, isInitialized: isCartInitialized = false } = useCartItems() || {};
  const { activeCategory = 'all', isSidebarOpen = false, isCartOpen = false } = useCartUi() || {};
  const {
    setActiveCategory = () => {},
    setIsSidebarOpen = () => {},
    openSidebar = () => {},
    openCart = () => {},
    setIsCartOpen = () => {},
  } = useCartActions() || {};

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);
  const [isNavbarHidden, setIsNavbarHidden] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const { data: session, status } = useSession() || {};

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-nav-hidden', isNavbarHidden ? 'true' : 'false');
    }
  }, [isNavbarHidden]);
  
  const [isCartBumping, setIsCartBumping] = useState(false);

  useEffect(() => {
    function handleCartLanded() {
      setIsCartBumping(true);
      window.setTimeout(() => setIsCartBumping(false), 380);
    }

    window.addEventListener('cart-item-landed', handleCartLanded);
    return () => window.removeEventListener('cart-item-landed', handleCartLanded);
  }, []);

  const closeCategoriesTimeoutRef = useRef(null);
  const isNavbarHiddenRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const scrollAnchorYRef = useRef(0);

  useEffect(() => {
    return () => {
      if (closeCategoriesTimeoutRef.current) {
        window.clearTimeout(closeCategoriesTimeoutRef.current);
      }
    };
  }, []);

  // Removed artificial 600ms loading skeleton to ensure menu opens instantly

  function revealNavbar() {
    if (isNavbarHiddenRef.current) {
      isNavbarHiddenRef.current = false;
      setIsNavbarHidden(false);
    }

    scrollAnchorYRef.current = window.scrollY;
  }

  useEffect(() => {
    function handleReveal() {
      revealNavbar();
    }

    window.addEventListener('reveal-navbar', handleReveal);
    return () => window.removeEventListener('reveal-navbar', handleReveal);
  }, []);

  useEffect(() => {
    if (isCartOpen) {
      const frameId = window.requestAnimationFrame(() => {
        revealNavbar();
      });
      return () => window.cancelAnimationFrame(frameId);
    }
  }, [isCartOpen]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    scrollAnchorYRef.current = window.scrollY;

    let frameId = null;

    const updateNavbarVisibility = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      if (Math.abs(delta) < 3) {
        lastScrollYRef.current = currentScrollY;
        frameId = null;
        return;
      }

      const distanceFromAnchor = currentScrollY - scrollAnchorYRef.current;

      if (currentScrollY <= 16) {
        if (isNavbarHiddenRef.current) {
          isNavbarHiddenRef.current = false;
          setIsNavbarHidden(false);
        }
        scrollAnchorYRef.current = currentScrollY;
      } else if (!(isSearchOpen || isSidebarOpen || isAccountDrawerOpen || isCartOpen)) {
        if (!isNavbarHiddenRef.current && distanceFromAnchor > 56 && delta > 0 && currentScrollY > 80) {
          isNavbarHiddenRef.current = true;
          setIsNavbarHidden(true);
          scrollAnchorYRef.current = currentScrollY;
        } else if (isNavbarHiddenRef.current && distanceFromAnchor < -12 && delta < 0) {
          isNavbarHiddenRef.current = false;
          setIsNavbarHidden(false);
          scrollAnchorYRef.current = currentScrollY;
        } else if (Math.sign(delta) !== Math.sign(distanceFromAnchor) && Math.abs(distanceFromAnchor) > 6) {
          scrollAnchorYRef.current = lastScrollYRef.current;
        }
      }

      lastScrollYRef.current = currentScrollY;
      frameId = null;
    };

    const handleScroll = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateNavbarVisibility);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isAccountDrawerOpen, isCartOpen, isSearchOpen, isSidebarOpen]);

  function handleCategoryClick(categoryId) {
    setActiveCategory(categoryId);
    setIsSidebarOpen(false);
    setIsCategoriesOpen(false);
    const url = categoryId === 'all' ? '/products' : `/products?category=${categoryId}`;
    router.push(url, { scroll: true });
  }

  function handleSearchToggle() {
    revealNavbar();
    setIsSidebarOpen(false);
    setIsAccountDrawerOpen(false);
    setIsSearchOpen((value) => !value);
  }

  function handleSearchOpenChange(open) {
    const nextOpen = open === true;

    if (nextOpen) {
      revealNavbar();
      setIsSidebarOpen(false);
      setIsAccountDrawerOpen(false);
    }

    setIsSearchOpen(nextOpen);
  }

  function handleMobileNavigate(href) {
    setIsSearchOpen(false);
    setIsAccountDrawerOpen(false);
    router.push(href);
  }

  function handleDesktopNavigate(href) {
    setIsSearchOpen(false);
    setIsAccountDrawerOpen(false);
    setIsCategoriesOpen(false);
    setIsSidebarOpen(false);
    router.push(href, { scroll: true });
  }

  function handleAccountDrawerChange(open) {
    if (open) {
      revealNavbar();
      setIsSearchOpen(false);
      setIsSidebarOpen(false);
    }
    setIsAccountDrawerOpen(open);
  }

  function handleSidebarOpen() {
    revealNavbar();
    setIsCartOpen(false);
    openSidebar();
  }

  function navLinkClass(path) {
    return cn(
      'inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-sm transition-[color,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]',
      pathname === path
        ? 'font-bold text-primary'
        : 'font-medium text-muted-foreground hover:text-foreground'
    );
  }

  function desktopNavButtonClass(isActive = false) {
    return cn(
      'inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-sm transition-[color,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]',
      isActive
        ? 'font-bold text-primary'
        : 'font-medium text-muted-foreground hover:text-foreground'
    );
  }

  function cancelCategoriesClose() {
    if (closeCategoriesTimeoutRef.current) {
      window.clearTimeout(closeCategoriesTimeoutRef.current);
      closeCategoriesTimeoutRef.current = null;
    }
  }

  function scheduleCategoriesClose() {
    cancelCategoriesClose();
    closeCategoriesTimeoutRef.current = window.setTimeout(() => {
      setIsCategoriesOpen(false);
      closeCategoriesTimeoutRef.current = null;
    }, 120);
  }

  const mobileItems = [
    { href: '/', label: 'Home', icon: Store },
    { href: '/products', label: 'All Products', icon: LayoutGrid },
  ];
  const mobileMenuButtonClass =
    'min-h-10 rounded-xl px-2.5 py-2 text-sidebar-foreground transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground data-[active=true]:text-sidebar-primary-foreground active:scale-[0.99]';
  const navActionButtonClass =
    'nav-icon-button relative rounded-none md:border border-transparent md:border-border/60 bg-transparent md:bg-background p-0 text-foreground transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#A67C52]/40 hover:bg-[#F4F2EE] hover:text-[#A67C52] hover:shadow-[0_4px_16px_rgba(166,124,82,0.12)] active:scale-95 active:translate-y-0';
  const announcementItems = normalizeAnnouncementItems(announcementBarMessages, announcementBarText);
  const showAnnouncementBar = announcementBarEnabled && announcementItems.length > 0;

  if (pathname?.startsWith('/checkout')) {
    return null;
  }

  return (
    <>
      <div className={cn(
        "navbar-shell sticky top-0 z-[200] overflow-visible bg-[#F7F3EE] border-b border-[#E8E5DF] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] will-change-transform shadow-[0_1px_3px_rgba(0,0,0,0.03)]",
        isNavbarHidden ? '-translate-y-full' : 'translate-y-0'
      )}>

      <div className="relative z-50">
          {/* Tier 1: Main Header Row */}
          <header className="relative mx-auto flex h-14 sm:h-16 md:h-[68px] max-w-[1440px] items-center justify-between px-4 sm:px-6 xl:px-10">
            {/* Left Zone: Mobile Hamburger & PC Left-Aligned Logo */}
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => isSidebarOpen ? setIsSidebarOpen(false) : handleSidebarOpen()} 
                aria-label={isSidebarOpen ? "Close menu" : "Open menu"} 
                className="lg:hidden relative rounded-full hover:bg-white hover:text-[#A67C52] hover:shadow-[0_2px_10px_rgba(166,124,82,0.15)] text-[#121212] size-10 transition-all duration-300 ease-out active:scale-95 cursor-pointer"
              >
                <span className="relative flex size-5.5 items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('absolute inset-0 size-full transition-all duration-300', isSidebarOpen ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100 rotate-0')}>
                    <line x1="3.5" y1="7" x2="20.5" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3.5" y1="12" x2="20.5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3.5" y1="17" x2="20.5" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <X strokeWidth={2} className={cn('absolute inset-0 size-full transition-all duration-300', isSidebarOpen ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90')} />
                </span>
              </Button>

              {/* Desktop Left-Aligned Logo */}
              <div className="hidden lg:flex items-center">
                <StoreLogo
                  storeName={storeName}
                  lightLogoUrl={lightLogoUrl}
                  darkLogoUrl={darkLogoUrl}
                  logoScalePercent={logoScalePercent * 0.95}
                  variant="light-surface"
                  priority
                  onClick={(event) => {
                    event.preventDefault();
                    handleDesktopNavigate('/');
                  }}
                  className="transition-transform duration-300 hover:scale-[1.01] cursor-pointer"
                  isLink={false}
                />
              </div>
            </div>

            {/* Mobile Center Logo */}
            <div className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
              <StoreLogo
                storeName={storeName}
                lightLogoUrl={lightLogoUrl}
                darkLogoUrl={darkLogoUrl}
                logoScalePercent={logoScalePercent * 0.78}
                variant="light-surface"
                priority
                onClick={(event) => {
                  event.preventDefault();
                  handleDesktopNavigate('/');
                }}
                className="transition-transform duration-300 hover:scale-[1.01] cursor-pointer"
                isLink={false}
              />
            </div>

            {/* PC Center Open Search Bar with live suggestions & collections */}
            <div className="hidden lg:flex flex-1 max-w-lg xl:max-w-xl mx-6 xl:mx-10 relative">
              <NavbarSearchPanel
                open={true}
                onOpenChange={() => {}}
                placeholder="Search rings, necklaces, bracelets, gold..."
                inlineSuggestions={false}
              />
            </div>

            {/* Right Zone: Wishlist, Account, Cart with Premium Micro-Interactions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Wishlist Button (Desktop) */}
              <Link 
                href="/wishlist" 
                className="group hidden sm:inline-flex items-center justify-center size-10 rounded-full text-[#121212] transition-all duration-300 ease-out hover:bg-white hover:text-[#A67C52] hover:shadow-[0_2px_12px_rgba(166,124,82,0.18)] hover:scale-105 active:scale-95 select-none"
                title="Wishlist"
              >
                <Heart className={cn("size-5 transition-transform duration-300 group-hover:scale-110", pathname === '/wishlist' && "fill-current text-[#A67C52]")} strokeWidth={1.8} />
              </Link>

              {/* Desktop Account Control */}
              <NavbarDesktopAccountControl navActionButtonClass="rounded-full hover:bg-white hover:text-[#A67C52] hover:shadow-[0_2px_12px_rgba(166,124,82,0.18)] hover:scale-105 transition-all duration-300 ease-out active:scale-95" />

              {/* Cart Drawer Trigger Button */}
              <Button
                id="nav-cart-button"
                data-cart-target="true"
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isCartOpen) {
                    setIsCartOpen(false);
                  } else {
                    setIsSidebarOpen(false);
                    openCart();
                  }
                }}
                className={cn(
                  'relative rounded-full text-[#121212] size-10 transition-all duration-300 ease-out hover:bg-white hover:text-[#A67C52] hover:shadow-[0_2px_12px_rgba(166,124,82,0.18)] hover:scale-105 active:scale-95 select-none cursor-pointer',
                  isCartBumping && 'scale-115'
                )}
                aria-label={isCartOpen ? "Close cart" : "Open cart"}
                title={isCartOpen ? "Close Cart" : "Cart"}
              >
                {isCartOpen ? (
                  <X strokeWidth={1.8} className="size-5 transition-transform duration-300 rotate-0" />
                ) : (
                  <ShoppingBag strokeWidth={1.8} className="size-5 transition-transform duration-300 hover:scale-105" />
                )}
                {isCartInitialized && cartCount > 0 && !isCartOpen ? (
                  <span className={cn(
                    "absolute -top-0.5 -right-0.5 inline-flex size-5 items-center justify-center rounded-full bg-[#A67C52] text-[10.5px] font-sans font-bold leading-none text-white shadow-sm pointer-events-none transition-transform",
                    isCartBumping && "scale-125"
                  )}>
                    {cartCount}
                  </span>
                ) : null}
              </Button>
            </div>
          </header>

          {/* Tier 2: Sub-Navbar for PC Navigation Links */}
          <div className="hidden lg:block border-t border-[#E8E5DF] bg-[#F7F3EE]">
            <nav className="mx-auto flex h-9 max-w-[1440px] items-center justify-center gap-4 sm:gap-6 xl:gap-8 px-4 text-[10px] sm:text-[10.5px] font-sans uppercase tracking-[0.16em]">
              <Link 
                href="/" 
                className={cn(
                  "px-2 py-1 font-medium text-[#121212]/80 hover:text-[#A67C52] transition-colors",
                  pathname === '/' && "text-[#121212] font-bold border-b-2 border-[#A67C52]"
                )}
              >
                Home
              </Link>

              <Link 
                href="/products" 
                className={cn(
                  "px-2 py-1 font-medium text-[#121212]/80 hover:text-[#A67C52] transition-colors",
                  pathname === '/products' && "text-[#121212] font-bold border-b-2 border-[#A67C52]"
                )}
              >
                All Jewelry
              </Link>

              {/* Collections Hover Dropdown */}
              <div 
                className="group relative py-1"
                onMouseEnter={() => {
                  if (closeCategoriesTimeoutRef.current) clearTimeout(closeCategoriesTimeoutRef.current);
                  setIsCategoriesOpen(true);
                }}
                onMouseLeave={() => {
                  closeCategoriesTimeoutRef.current = setTimeout(() => {
                    setIsCategoriesOpen(false);
                  }, 180);
                }}
              >
                <Link
                  href="/categories"
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 font-medium text-[#121212]/80 group-hover:text-[#A67C52] hover:text-[#A67C52] transition-colors outline-none cursor-pointer uppercase",
                    (pathname?.includes('/categories') || isCategoriesOpen) && "text-[#121212] font-bold border-b-2 border-[#A67C52]"
                  )}
                >
                  <span>Collections</span>
                  <ChevronDown className={cn("size-3 transition-transform duration-200 opacity-60 group-hover:rotate-180 group-hover:text-[#A67C52]", isCategoriesOpen && "rotate-180 text-[#A67C52]")} />
                </Link>

                {/* Dropdown Menu with Hover Bridge */}
                <div 
                  className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 z-[300] min-w-64 pt-1 transition-all duration-150",
                    "before:content-[''] before:absolute before:-top-2 before:inset-x-0 before:h-3",
                    isCategoriesOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto"
                  )}
                  onMouseEnter={() => {
                    if (closeCategoriesTimeoutRef.current) clearTimeout(closeCategoriesTimeoutRef.current);
                    setIsCategoriesOpen(true);
                  }}
                  onMouseLeave={() => {
                    closeCategoriesTimeoutRef.current = setTimeout(() => {
                      setIsCategoriesOpen(false);
                    }, 180);
                  }}
                >
                  <div className="bg-[#FAF9F6] border border-[#E8E5DF] shadow-[0_16px_36px_rgba(0,0,0,0.12)] p-2 animate-in fade-in-0 zoom-in-95 duration-150">
                    <Link 
                      href="/categories" 
                      onClick={() => setIsCategoriesOpen(false)}
                      className="w-full flex items-center justify-between font-bold text-[#121212] px-3 py-2 text-[10.5px] hover:bg-black/5 hover:text-[#A67C52] transition-colors border-b border-[#E8E5DF]"
                    >
                      <span>Explore All Collections</span>
                      <ArrowRight className="size-3" />
                    </Link>

                    <div className="flex flex-col py-1 max-h-[70vh] overflow-y-auto overscroll-contain divide-y divide-[#E8E5DF]/40">
                      {Array.isArray(categories) && categories.length > 0 ? (
                        categories.map((cat) => {
                          const categoryTitle = cat.name || cat.label || '';
                          const categoryHref = cat.slug 
                            ? `/products?category=${encodeURIComponent(cat.slug)}` 
                            : `/products?category=${encodeURIComponent(cat.id || cat._id || '')}`;

                          if (!categoryTitle) return null;

                          return (
                            <Link
                              key={cat._id || cat.id || cat.slug || categoryTitle}
                              href={categoryHref}
                              onClick={() => setIsCategoriesOpen(false)}
                              className="px-3 py-2 text-xs font-medium text-[#121212]/85 hover:bg-black/5 hover:text-[#A67C52] transition-colors normal-case tracking-normal flex items-center justify-between"
                            >
                              <span>{categoryTitle}</span>
                              <ChevronDown className="size-3 -rotate-90 opacity-40" />
                            </Link>
                          );
                        })
                      ) : (
                        <>
                          <Link href="/products?category=necklace-sets" onClick={() => setIsCategoriesOpen(false)} className="px-3 py-2 text-xs font-medium text-[#121212]/85 hover:bg-black/5 hover:text-[#A67C52] transition-colors normal-case tracking-normal">Necklace Sets</Link>
                          <Link href="/products?category=bracelets" onClick={() => setIsCategoriesOpen(false)} className="px-3 py-2 text-xs font-medium text-[#121212]/85 hover:bg-black/5 hover:text-[#A67C52] transition-colors normal-case tracking-normal">Bracelets & Bangles</Link>
                          <Link href="/products?category=rings" onClick={() => setIsCategoriesOpen(false)} className="px-3 py-2 text-xs font-medium text-[#121212]/85 hover:bg-black/5 hover:text-[#A67C52] transition-colors normal-case tracking-normal">Diamond & Gold Rings</Link>
                          <Link href="/products?category=earrings" onClick={() => setIsCategoriesOpen(false)} className="px-3 py-2 text-xs font-medium text-[#121212]/85 hover:bg-black/5 hover:text-[#A67C52] transition-colors normal-case tracking-normal">Earrings</Link>
                          <Link href="/products?category=bridal-sets" onClick={() => setIsCategoriesOpen(false)} className="px-3 py-2 text-xs font-medium text-[#121212]/85 hover:bg-black/5 hover:text-[#A67C52] transition-colors normal-case tracking-normal">Bridal Sets</Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Link 
                href="/about-us" 
                className={cn(
                  "px-2 py-1 font-medium text-[#121212]/80 hover:text-[#A67C52] transition-colors",
                  pathname === '/about-us' && "text-[#121212] font-bold border-b-2 border-[#A67C52]"
                )}
              >
                About Us
              </Link>

              <Link 
                href="/contact-us" 
                className={cn(
                  "px-2 py-1 font-medium text-[#121212]/80 hover:text-[#A67C52] transition-colors",
                  (pathname === '/contact-us' || pathname === '/contact') && "text-[#121212] font-bold border-b-2 border-[#A67C52]"
                )}
              >
                Contact Us
              </Link>

              <Link 
                href="/track-order" 
                className={cn(
                  "px-2 py-1 font-medium text-[#121212]/80 hover:text-[#A67C52] transition-colors",
                  (pathname === '/track-order' || pathname === '/orders') && "text-[#121212] font-bold border-b-2 border-[#A67C52]"
                )}
              >
                Track Your Order
              </Link>
            </nav>
          </div>

          <MobileSearchOverlay 
            open={isSearchOpen}
            onOpenChange={setIsSearchOpen}
          />
        </div>

      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-full sm:!w-[340px] md:!w-[360px] max-w-full sm:max-w-[360px] border-r border-[#E8E5DF] bg-[#FAF9F6] p-0 text-[#121212] flex flex-col h-full max-h-[100dvh] overflow-hidden data-[state=closed]:duration-300 data-[state=open]:duration-300 shadow-2xl z-[500]"
          >
            {isSidebarOpen && (
              <MobileMenuContent
                pathname={pathname}
                categories={categories}
                activeCategory={activeCategory}
                handleCategoryClick={handleCategoryClick}
                setIsSidebarOpen={setIsSidebarOpen}
                setIsAuthModalOpen={setIsAuthModalOpen}
                mobileMenuButtonClass={mobileMenuButtonClass}
              />
            )}
          </SheetContent>
        </Sheet>

      </div>

      {!pathname.startsWith('/checkout') && (
        <MobileBottomNav
          pathname={pathname}
          isNavbarHidden={isNavbarHidden}
          isSidebarOpen={isSidebarOpen}
          isCartOpen={isCartOpen}
          isSearchOpen={isSearchOpen}
          onSearchOpenChange={handleSearchOpenChange}
          accountOpen={isAccountDrawerOpen}
          onAccountOpenChange={handleAccountDrawerChange}
          isAuthOpen={isAuthModalOpen}
          onAuthOpenChange={setIsAuthModalOpen}
          onNavigate={handleMobileNavigate}
        />
      )}
      {isAuthModalOpen ? <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} /> : null}
    </>
  );
}

export function NavbarStaticShell({
  storeName = 'Ornaments by Arshad',
  lightLogoUrl = '',
  darkLogoUrl = '',
  logoScalePercent = 100,
}) {
  return (
    <div className="navbar-shell sticky top-0 z-[200] overflow-visible bg-[#F7F3EE] border-b border-[#E8E5DF] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="relative z-50">
        <header className="relative mx-auto flex h-16 sm:h-18 md:h-20 max-w-[1440px] items-center justify-between px-4 sm:px-6 xl:px-10">
          {/* Left Zone: Mobile Hamburger Placeholder & Desktop Left Logo */}
          <div className="flex items-center gap-4">
            <div className="lg:hidden flex size-10.5 items-center justify-center text-[#121212]">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-6">
                <line x1="3.5" y1="7" x2="20.5" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3.5" y1="12" x2="20.5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3.5" y1="17" x2="20.5" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <div className="hidden lg:flex items-center">
              <StoreLogo
                storeName={storeName}
                lightLogoUrl={lightLogoUrl}
                darkLogoUrl={darkLogoUrl}
                logoScalePercent={logoScalePercent * 0.95}
                variant="light-surface"
                priority
                isLink={false}
              />
            </div>
          </div>

          {/* Mobile Center Logo */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            <StoreLogo
              storeName={storeName}
              lightLogoUrl={lightLogoUrl}
              darkLogoUrl={darkLogoUrl}
              logoScalePercent={logoScalePercent * 0.78}
              variant="light-surface"
              priority
              isLink={false}
            />
          </div>

          {/* Desktop Center Search Bar Placeholder */}
          <div className="hidden lg:flex flex-1 max-w-lg xl:max-w-xl mx-6 xl:mx-10 relative">
            <div className="relative flex h-9.5 w-full items-center border border-[#E8E5DF] bg-white/80 px-4 text-xs font-sans text-neutral-400">
              <Search className="mr-2.5 size-4 text-neutral-400" />
              <span>Search rings, necklaces, bracelets, gold...</span>
            </div>
          </div>

          {/* Right Zone */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="hidden sm:inline-flex items-center justify-center size-10 text-[#121212]">
              <Heart strokeWidth={1.8} className="size-5" />
            </div>
            <div className="hidden sm:inline-flex items-center justify-center size-10 text-[#121212]">
              <User strokeWidth={1.8} className="size-5" />
            </div>
            <div className="inline-flex items-center justify-center size-10 text-[#121212]">
              <ShoppingBag strokeWidth={1.8} className="size-5" />
            </div>
          </div>
        </header>

        {/* Tier 2: Sub-Navbar for PC only */}
        <div className="hidden lg:block border-t border-[#E8E5DF] bg-[#F7F3EE]">
          <div className="mx-auto flex h-8.5 max-w-[1440px] items-center justify-center gap-4 sm:gap-6 xl:gap-8 px-4 text-[10px] sm:text-[10.5px] font-sans uppercase tracking-[0.16em] text-[#121212]/80">
            <span className="px-2 py-1 font-medium">Home</span>
            <span className="px-2 py-1 font-medium">All Jewelry</span>
            <span className="px-2 py-1 font-medium">Collections</span>
            <span className="px-2 py-1 font-medium">About Us</span>
            <span className="px-2 py-1 font-medium">Contact Us</span>
            <span className="px-2 py-1 font-medium">Track Your Order</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Navbar({
  categories = [],
  storeName = 'Ornaments by Arshad',
  lightLogoUrl = '',
  darkLogoUrl = '',
  logoScalePercent = 100,
  announcementBarEnabled = true,
  announcementBarText = '',
  announcementBarMessages = [],
}) {
  return (
    <Suspense
      fallback={
        <NavbarStaticShell
          storeName={storeName}
          lightLogoUrl={lightLogoUrl}
          darkLogoUrl={darkLogoUrl}
          logoScalePercent={logoScalePercent}
          announcementBarEnabled={announcementBarEnabled}
          announcementBarText={announcementBarText}
          announcementBarMessages={announcementBarMessages}
        />
      }
    >
      <NavbarContent
        categories={categories}
        storeName={storeName}
        lightLogoUrl={lightLogoUrl}
        darkLogoUrl={darkLogoUrl}
        logoScalePercent={logoScalePercent}
        announcementBarEnabled={announcementBarEnabled}
        announcementBarText={announcementBarText}
        announcementBarMessages={announcementBarMessages}
      />
    </Suspense>
  );
}
