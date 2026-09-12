'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut, signIn } from 'next-auth/react';
import {
  LayoutGrid,
  Phone,
  Store,
  Tag,
  LogOut,
  User,
  X,
  Heart,
  Package,
  Sparkles,
  ChevronRight,
  Menu as MenuIcon,
} from 'lucide-react';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export default function MobileMenuContent({
  pathname,
  categories = [],
  activeCategory,
  handleCategoryClick,
  setIsSidebarOpen,
}) {
  const { data: session } = useSession();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const menuItems = [
    { href: '/', label: 'Home', icon: Store, exact: true },
    { href: '/products', label: 'All Jewelry', icon: Sparkles, exact: true },
    { href: '/categories', label: 'Collections', icon: LayoutGrid, exact: false },
    { href: '/orders', label: 'Track Your Order', icon: Package, exact: false },
    { href: '/wishlist', label: 'Wishlist', icon: Heart, exact: false },
    { href: '/about-us', label: 'Our Story', icon: Store, exact: true },
    { href: '/contact-us', label: 'Contact Us', icon: Phone, exact: false },
  ];

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-[#FAF9F6] text-[#121212] overflow-hidden">
      {/* Top Header Bar (Matching Cart Drawer) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E8E5DF] bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <MenuIcon className="size-4.5 text-[#A67C52]" />
          <h2 className="font-serif text-base sm:text-lg font-normal tracking-wide text-[#121212] uppercase">
            Menu
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="size-8.5 rounded-full flex items-center justify-center text-[#737373] hover:text-[#121212] hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X className="size-4.5" />
        </button>
      </div>

      <Tabs defaultValue="menu" className="flex flex-1 min-h-0 w-full flex-col overflow-hidden bg-[#FAF9F6]">
        {/* Header Tabs */}
        <div className="flex w-full shrink-0 items-center px-4 pt-3 pb-2.5 border-b border-[#E8E5DF]">
          <TabsList className="grid h-9 w-full grid-cols-2 rounded-lg bg-[#EFECE6] p-1">
            <TabsTrigger 
              value="menu" 
              className="text-[11px] font-sans uppercase tracking-[0.16em] font-semibold rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-[#121212] data-[state=active]:shadow-xs text-[#737373]"
            >
              Menu
            </TabsTrigger>
            <TabsTrigger 
              value="categories" 
              className="text-[11px] font-sans uppercase tracking-[0.16em] font-semibold rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-[#121212] data-[state=active]:shadow-xs text-[#737373]"
            >
              Collections
            </TabsTrigger>
          </TabsList>
        </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Menu Tab */}
        <TabsContent
          value="menu"
          className="m-0 h-full overflow-y-auto overscroll-contain py-3 px-3.5 focus-visible:outline-none data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-left-4 duration-200 ease-out"
        >
          <div className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : (pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href)));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg text-xs font-sans tracking-[0.14em] uppercase transition-all duration-200 whitespace-nowrap",
                    isActive
                      ? "bg-[#121212] text-white font-semibold shadow-xs"
                      : "text-[#121212]/90 hover:bg-[#EFECE6] hover:text-[#121212] font-medium"
                  )}
                >
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent
          value="categories"
          className="m-0 h-full overflow-y-auto overscroll-contain py-3 px-3.5 focus-visible:outline-none data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-right-4 duration-200 ease-out"
        >
          <div className="flex flex-col gap-1">
            {categories.map((category) => {
              const catId = category.id || category._id || category.slug;
              const isActive = activeCategory === catId || activeCategory === category.slug;

              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => handleCategoryClick(category.slug || category.id || category._id)}
                  className={cn(
                    "w-full flex items-center px-4 py-3 rounded-lg text-xs font-sans tracking-[0.14em] uppercase transition-all duration-200 text-left cursor-pointer whitespace-nowrap",
                    isActive
                      ? "bg-[#121212] text-white font-semibold shadow-xs"
                      : "text-[#121212]/90 hover:bg-[#EFECE6] hover:text-[#121212] font-medium"
                  )}
                >
                  <span className="truncate">{category.label || category.name}</span>
                </button>
              );
            })}
          </div>
        </TabsContent>
      </div>

      {/* Persistent Bottom Footer: Auth / Logout & Social Icons */}
      <div className="shrink-0 flex flex-col gap-3 border-t border-[#E8E5DF] p-3.5 pb-[calc(env(safe-area-inset-bottom,0.75rem)+0.75rem)] bg-[#FAF9F6]">
        {/* Auth / Logout Button */}
        {!session ? (
          <button
            type="button"
            onClick={() => {
              setIsSidebarOpen(false);
              signIn('google');
            }}
            className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-neutral-50 active:scale-[0.98] text-[#121212] border border-[#E8E5DF] rounded-lg h-10 px-4 text-xs font-medium font-sans shadow-xs transition-all duration-200 cursor-pointer"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2.5 bg-white p-2.5 rounded-lg border border-[#E8E5DF]">
            <div className="flex-1 min-w-0 flex items-center gap-2.5">
              <div className="size-7.5 rounded-full bg-[#121212] text-white font-semibold text-xs flex items-center justify-center shrink-0">
                {(session.user?.name || session.user?.email || 'U')[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#121212] truncate leading-tight">{session.user?.name || 'Account'}</p>
                <p className="text-[11px] text-[#737373] truncate leading-tight">{session.user?.email || ''}</p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLogoutConfirmOpen(true)}
              className="h-7.5 px-2 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] font-medium transition-all active:scale-95 shadow-none shrink-0 gap-1 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="size-3.5 text-red-500" />
              <span>Logout</span>
            </Button>
          </div>
        )}

        {/* Social Icons Row - Clean monochrome icons */}
        <div className="flex items-center justify-center gap-5 pt-0.5">
          {/* Facebook */}
          <a
            href="https://www.facebook.com/ornamentsbyarshad"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-[#737373] hover:text-[#121212] transition-colors p-1"
          >
            <svg viewBox="0 0 24 24" className="size-4.5 fill-current">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>

          {/* WhatsApp */}
          <a
            href="https://wa.me/923000000000"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="text-[#737373] hover:text-[#121212] transition-colors p-1"
          >
            <svg viewBox="0 0 24 24" className="size-4.5 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/ornamentsbyarshad"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-[#737373] hover:text-[#121212] transition-colors p-1"
          >
            <svg viewBox="0 0 24 24" className="size-4.5 fill-current">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.822a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </a>

          {/* TikTok */}
          <a
            href="https://www.tiktok.com/@ornamentsbyarshad"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="text-[#737373] hover:text-[#121212] transition-colors p-1"
          >
            <svg viewBox="0 0 24 24" className="size-4.5 fill-current">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.02c-.01 1.69-.52 3.26-1.57 4.42-1.16 1.34-2.86 2.14-4.59 2.27-1.96.15-3.92-.43-5.36-1.72-1.44-1.27-2.36-3.08-2.45-5.04-.08-1.98.68-3.95 2.14-5.31 1.44-1.37 3.38-2.07 5.37-2.04.1.01.21.01.31.02v4.04c-1.3-.06-2.58.45-3.48 1.44-.81.87-1.15 2.05-1 3.23.11 1.09.73 2.06 1.67 2.62.94.57 2.12.7 3.16.39 1.01-.32 1.83-1.07 2.22-2.05.27-.67.36-1.4.35-2.12V.02h4.15Z" />
            </svg>
          </a>
        </div>
      </div>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent className="max-w-[320px] p-5 rounded-2xl gap-4" showCloseButton={false}>
          <div className="flex justify-between items-start">
            <AlertDialogHeader className="text-left space-y-1">
              <AlertDialogTitle className="text-base font-semibold text-foreground">Log out of your account?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                You will need to sign in again to access your orders and saved details.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-md -mt-1 -mr-1 text-muted-foreground hover:bg-muted"
              onClick={() => setLogoutConfirmOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <AlertDialogFooter className="mt-1 flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutConfirmOpen(false)}
              className="flex-1 rounded-lg text-xs h-9 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setLogoutConfirmOpen(false);
                setIsSidebarOpen(false);
                signOut();
              }}
              className="flex-1 rounded-lg text-xs h-9 font-semibold bg-red-600 hover:bg-red-700 text-white"
            >
              Log Out
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
    </div>
  );
}

