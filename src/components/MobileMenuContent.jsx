'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutGrid,
  Phone,
  Store,
  Tag,
  LogOut,
  User,
  X,
} from 'lucide-react';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import dynamic from 'next/dynamic';

const MyOrdersButton = dynamic(() => import('@/components/MyOrdersButton'), { ssr: false });
const MyWishlistButton = dynamic(() => import('@/components/MyWishlistButton'), { ssr: false });

export default function MobileMenuContent({
  pathname,
  categories = [],
  activeCategory,
  handleCategoryClick,
  setIsSidebarOpen,
}) {
  const { data: session } = useSession();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  return (
    <Tabs defaultValue="menu" className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      {/* Header Tabs */}
      <div className="flex w-full shrink-0 items-center p-3.5 pb-2">
        <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
          <TabsTrigger value="menu" className="text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:shadow-xs">
            Menu
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:shadow-xs">
            Categories
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Menu Tab */}
        <TabsContent
          value="menu"
          className="m-0 h-full overflow-y-auto overscroll-contain py-2 px-3.5 focus-visible:outline-none data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-left-4 duration-200 ease-out"
        >
          <SidebarMenu className="gap-1.5">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === '/'}
                className={`gap-3.5 rounded-xl px-3 py-2 h-10 transition-all duration-200 active:scale-[0.98] text-foreground ${
                  pathname === '/'
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'bg-muted/40 hover:bg-muted font-medium'
                }`}
                render={<Link href="/" onClick={() => setIsSidebarOpen(false)} />}
              >
                <Store className="size-4 shrink-0" />
                <span className="text-[13px] sm:text-sm tracking-tight">Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === '/products'}
                className={`gap-3.5 rounded-xl px-3 py-2 h-10 transition-all duration-200 active:scale-[0.98] text-foreground ${
                  pathname === '/products'
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'bg-muted/40 hover:bg-muted font-medium'
                }`}
                render={<Link href="/products" onClick={() => setIsSidebarOpen(false)} />}
              >
                <LayoutGrid className="size-4 shrink-0" />
                <span className="text-[13px] sm:text-sm tracking-tight">All Products</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                className="gap-3.5 rounded-xl px-3 py-2 h-10 transition-all duration-200 active:scale-[0.98] text-foreground bg-muted/40 hover:bg-muted font-medium"
                render={<Link href="/products?price=under300" onClick={() => setIsSidebarOpen(false)} />}
              >
                <Tag className="size-4 shrink-0" />
                <span className="text-[13px] sm:text-sm tracking-tight">Dollar Store</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem className="flex items-center">
              <MyOrdersButton
                isMobile
                className={`gap-3.5 rounded-xl px-3 py-2 h-10 w-full transition-all duration-200 active:scale-[0.98] text-foreground ${
                  pathname.startsWith('/orders')
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'bg-muted/40 hover:bg-muted font-medium'
                }`}
              />
            </SidebarMenuItem>

            <SidebarMenuItem className="flex items-center">
              <MyWishlistButton
                isMobile
                className={`gap-3.5 rounded-xl px-3 py-2 h-10 w-full transition-all duration-200 active:scale-[0.98] text-foreground ${
                  pathname.startsWith('/wishlist')
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'bg-muted/40 hover:bg-muted font-medium'
                }`}
              />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === '/contact'}
                className={`gap-3.5 rounded-xl px-3 py-2 h-10 transition-all duration-200 active:scale-[0.98] text-foreground ${
                  pathname === '/contact'
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'bg-muted/40 hover:bg-muted font-medium'
                }`}
                render={<Link href="/contact" onClick={() => setIsSidebarOpen(false)} />}
              >
                <Phone className="size-4 shrink-0" />
                <span className="text-[13px] sm:text-sm tracking-tight">Contact Us</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent
          value="categories"
          className="m-0 h-full overflow-y-auto overscroll-contain py-2 px-3.5 focus-visible:outline-none data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-right-4 duration-200 ease-out"
        >
          <SidebarMenu className="gap-1.5">
            {categories.map((category) => (
              <SidebarMenuItem key={category.id}>
                <SidebarMenuButton
                  isActive={activeCategory === category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`gap-3.5 rounded-xl px-3 py-2 h-10 transition-all duration-200 active:scale-[0.98] text-foreground ${
                    activeCategory === category.id
                      ? 'bg-primary/10 text-primary font-bold shadow-xs'
                      : 'bg-muted/40 hover:bg-muted font-medium'
                  }`}
                >
                  <Tag className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-[13px] sm:text-sm tracking-tight">{category.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </TabsContent>
      </div>

      {/* Persistent Bottom Footer: Auth / Logout & Social Icons */}
      <div className="shrink-0 flex flex-col gap-2.5 border-t border-border/80 p-3 pb-[calc(env(safe-area-inset-bottom,0.75rem)+0.75rem)] bg-card/90 backdrop-blur-sm">
        {/* Auth / Logout Button */}
        {!session ? (
          <Link href="/auth/signin" onClick={() => setIsSidebarOpen(false)} className="w-full">
            <Button className="w-full bg-[#006B5F] hover:bg-[#00554c] text-white rounded-lg h-9 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] gap-2">
              <User className="size-3.5" />
              Sign In / Register
            </Button>
          </Link>
        ) : (
          <div className="flex items-center justify-between gap-2.5 px-0.5">
            <div className="flex-1 min-w-0 flex items-center gap-2.5">
              <div className="size-7 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                {(session.user?.name || session.user?.email || 'U')[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground truncate leading-tight">{session.user?.name || 'Account'}</p>
                <p className="text-[11px] text-muted-foreground truncate leading-tight">{session.user?.email || ''}</p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setLogoutConfirmOpen(true)}
              className="h-8 px-2.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40 text-xs font-medium transition-all active:scale-95 shadow-none shrink-0 gap-1.5 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="size-3.5 text-red-500 dark:text-red-400" />
              <span>Logout</span>
            </Button>
          </div>
        )}

        {/* Social Icons Row - Clean monochrome icons without background bubbles */}
        <div className="flex items-center justify-center gap-4 pt-0.5">
          {/* Facebook */}
          <a
            href="https://www.facebook.com/ornamentsbyarshad"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
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
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
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
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
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
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
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
  );
}
