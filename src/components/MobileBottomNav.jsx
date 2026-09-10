'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, LogOut, Home, Search, Settings, ShoppingBag, ShoppingCart, Package, User, UserPlus, X, MapPin } from 'lucide-react';

import { useCartActions, useCartUi } from '@/context/CartContext';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

function MobileNavButton({
  active = false,
  icon: Icon,
  label,
  onClick,
  href,
  iconSwap,
}) {
  const content = (
    <div className="relative flex flex-col items-center gap-1 justify-center w-full h-full">
      <span
        className={cn(
          'transition-transform duration-300 ease-out flex items-center justify-center',
          active ? 'scale-110 text-primary' : 'scale-100 text-muted-foreground'
        )}
      >
        {iconSwap ? (
          iconSwap
        ) : (
          <Icon className={cn('w-6 h-6 transition-all duration-300', active ? 'stroke-[2.2]' : 'stroke-[1.5]')} />
        )}
      </span>
      <span
        className={cn(
          'text-[10px] font-medium transition-colors duration-200',
          active ? 'text-primary font-bold' : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
    </div>
  );

  const baseClassName = 'relative flex flex-1 flex-col items-center justify-center pt-2 pb-1.5 outline-none w-full h-full min-h-[50px]';

  if (href) {
    return (
      <Link href={href} aria-current={active ? 'page' : undefined} onClick={onClick} className={baseClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={baseClassName}>
      {content}
    </button>
  );
}

function AccountMenuButton({ icon: Icon, label, onClick, destructive = false }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'h-auto w-full justify-start rounded-2xl px-4 py-3 text-left',
        destructive
          ? 'text-destructive hover:bg-destructive/8 hover:text-destructive'
          : 'text-foreground hover:bg-muted/70'
      )}
    >
      <Icon data-icon="inline-start" />
      {label}
    </Button>
  );
}

export default function MobileBottomNav({
  pathname,
  isNavbarHidden = false,
  isSidebarOpen: isSidebarOpenProp,
  isCartOpen: isCartOpenProp,
  isSearchOpen,
  onSearchOpenChange,
  onAccountOpenChange,
  accountOpen,
  isAuthOpen = false,
  onAuthOpenChange,
  onNavigate,
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [accountLoading, setAccountLoading] = useState(false);
  const { setIsCartOpen = () => {}, setIsSidebarOpen = () => {} } = useCartActions() || {};
  const { isCartOpen: isCartOpenCtx = false, isSidebarOpen: isSidebarOpenCtx = false } = useCartUi() || {};
  const isSidebarOpen = isSidebarOpenProp ?? isSidebarOpenCtx;
  const isCartOpen = isCartOpenProp ?? isCartOpenCtx;

  const isScrollHidePage = pathname === '/' || pathname === '/products' || pathname.startsWith('/products');
  const isHiddenOnScroll = isScrollHidePage && isNavbarHidden;
  const isHidden = isSidebarOpen || isCartOpen || (isHiddenOnScroll && !isSearchOpen);

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const mobileDrawerReservedLane = 'calc(env(safe-area-inset-bottom) + var(--mobile-bottom-nav-offset))';
  const mobileDrawerOverlayClassName =
    'z-[60] md:hidden';
  const mobileDrawerContentClassName =
    'pointer-events-none z-[60] border-0 bg-transparent shadow-none md:hidden data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:max-h-none data-[vaul-drawer-direction=bottom]:rounded-none';
  const mobileDrawerPanelClassName =
    'pointer-events-auto mx-auto w-full max-w-xl max-h-[calc(80vh-var(--mobile-bottom-nav-offset))] overflow-y-auto rounded-t-[1.35rem] border-t border-border/80 bg-popover text-sm text-popover-foreground shadow-[0_-18px_50px_rgba(15,23,42,0.12)]';
  const mobileDrawerShellClassName =
    'pointer-events-none mx-auto flex w-full max-w-xl flex-col justify-end';
  const accountPanelOpen = session ? accountOpen : isAuthOpen;

  useEffect(() => {
    if (pathname?.startsWith('/auth/signin')) {
      const frameId = window.requestAnimationFrame(() => {
        setAccountLoading(false);
      });
      return () => window.cancelAnimationFrame(frameId);
    }
  }, [pathname]);

  useEffect(() => {
    if (session?.user?.email) {
      router.prefetch('/orders');
      router.prefetch('/auth/signin');
    } else {
      router.prefetch('/auth/signin');
    }
  }, [router, session?.user?.email]);

  const lastClosedTime = useRef(0);

  function closeSearch() {
    onSearchOpenChange?.(false);
  }

  function closeAccountPanel() {
    if (accountPanelOpen) {
      lastClosedTime.current = Date.now();
    }
    if (session) {
      onAccountOpenChange(false);
      return;
    }

    onAuthOpenChange?.(false);
  }

  function openAccountPanel() {
    if (Date.now() - lastClosedTime.current < 300) return;
    
    if (session) {
      onAccountOpenChange(true);
      return;
    }

    setAccountLoading(true);
    onAuthOpenChange?.(true);
  }

  function closeMobilePanels() {
    closeSearch();
    closeAccountPanel();
    setIsCartOpen(false);
    setIsSidebarOpen(false);
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 md:hidden bg-background border-t border-border/70 shadow-[0_-8px_22px_rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out",
          isHidden ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100 pointer-events-auto"
        )}
        style={{ zIndex: 350 }}
      >
        <div className="mx-auto w-full max-w-xl">
          <nav
            aria-label="Mobile navigation"
            className="flex items-stretch justify-around px-1 pb-[calc(env(safe-area-inset-bottom)+0.4rem)]"
          >
            <MobileNavButton
              icon={Home}
              label="Home"
              href="/"
              onClick={() => {
                closeMobilePanels();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              active={pathname === '/'}
            />
            <MobileNavButton
              icon={Search}
              label="Search"
              onClick={() => {
                if (isSearchOpen) {
                  closeSearch();
                  return;
                }

                closeMobilePanels();
                onSearchOpenChange?.(true);
              }}
              active={isSearchOpen}
              iconSwap={isSearchOpen ? <X className="size-5" strokeWidth={2.5} /> : undefined}
            />
            <MobileNavButton
              icon={session ? Package : MapPin}
              label={session ? "My Orders" : "Track Order"}
              onClick={() => {
                closeMobilePanels();
                onNavigate?.('/orders');
              }}
              active={pathname.startsWith('/orders')}
            />
            <MobileNavButton
              icon={User}
              label="Account"
              onClick={() => {
                if (accountPanelOpen) {
                  closeAccountPanel();
                  return;
                }

                closeMobilePanels();
                openAccountPanel();
              }}
              active={accountPanelOpen || pathname.startsWith('/settings')}
              iconSwap={
                accountLoading && !session
                  ? <Spinner className="size-5" />
                  : accountPanelOpen
                    ? <X className="size-5" strokeWidth={2.5} />
                    : undefined
              }
            />
          </nav>
        </div>
      </div>

      <Drawer 
        open={accountOpen} 
        onOpenChange={(open) => {
          if (!open) lastClosedTime.current = Date.now();
          onAccountOpenChange?.(open);
        }} 
        shouldScaleBackground={false}
      >
        <DrawerContent
          overlayClassName={mobileDrawerOverlayClassName}
          className={mobileDrawerContentClassName}
          overlayStyle={{ bottom: mobileDrawerReservedLane }}
        >
          <div className={mobileDrawerShellClassName}>
            <div className={mobileDrawerPanelClassName}>
              <DrawerHeader className="px-5 pb-3 pt-5 text-left">
                <DrawerTitle>{session ? 'Your account' : 'Join Ornaments by Arshad'}</DrawerTitle>
                <DrawerDescription>
                  {session
                    ? 'Manage your orders, wishlist, and settings.'
                    : 'Create an account to save favorites, track orders, and check out faster.'}
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex flex-col gap-4 px-5 pb-4 pt-1">
                {session ? (
                  <>
                    <div className="flex items-center gap-3 rounded-[1.4rem] border border-border/70 bg-muted/45 px-4 py-3.5">
                      <Avatar className="size-11">
                        <AvatarImage src={session.user?.image} alt={session.user?.name || 'User'} />
                        <AvatarFallback>{(session.user?.name || 'U').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{session.user?.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{session.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <AccountMenuButton
                        icon={Settings}
                        label="Account Settings"
                        onClick={() => onNavigate('/settings')}
                      />
                      <AccountMenuButton
                        icon={Package}
                        label="My Orders"
                        onClick={() => onNavigate('/orders')}
                      />
                      <AccountMenuButton
                        icon={Heart}
                        label="Wishlist"
                        onClick={() => onNavigate('/wishlist')}
                      />
                    </div>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <p className="px-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        More actions
                      </p>
                      <AccountMenuButton
                        icon={LogOut}
                        label="Log out"
                        destructive
                        onClick={() => {
                          onAccountOpenChange(false);
                          setTimeout(() => {
                            setLogoutConfirmOpen(true);
                          }, 350);
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-border/70 bg-muted/45 px-4 py-4">
                      <p className="text-sm leading-6 text-muted-foreground">
                        Save the pieces you love, track your deliveries, and keep your next checkout effortless.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => {
                        onAccountOpenChange(false);
                        onAuthOpenChange?.(true);
                      }}
                      className="h-12 rounded-xl"
                    >
                      <UserPlus data-icon="inline-start" />
                      Sign Up
                    </Button>
                  </>
                )}
                <div className="md:hidden w-full shrink-0" style={{ height: 'calc(env(safe-area-inset-bottom) + 3.5rem)' }} />
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent className="max-w-[300px] p-5 rounded-xl gap-4" showCloseButton={false}>
          <div className="flex justify-between items-start">
            <AlertDialogTitle className="text-base font-semibold">Are you sure to logout?</AlertDialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="size-7 rounded-md -mt-1.5 -mr-1.5 text-muted-foreground hover:bg-muted"
              onClick={() => setLogoutConfirmOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <AlertDialogFooter className="mt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setLogoutConfirmOpen(false);
                signOut();
              }}
              className="w-full rounded-lg font-semibold"
            >
              Logout
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
