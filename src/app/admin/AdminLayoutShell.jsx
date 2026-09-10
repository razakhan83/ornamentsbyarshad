'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Bell,
  Box,
  ChartColumn,
  CirclePlus,
  CreditCard,
  ExternalLink,
  Globe,
  House,
  Images,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  FileText,
  Settings,
  Shield,
  Smartphone,
  ShoppingCart,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Tags,
  Truck,
  Users,
  Activity,
} from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const AdminNotificationCenter = dynamic(() => import('@/components/AdminNotificationCenter'), {
  ssr: false,
});

// 1. Dashboard & Live Traffic
const primaryNavItems = [
  { href: '/admin', label: 'Dashboard', icon: ChartColumn, match: (pathname) => pathname === '/admin' },
  { href: '/admin/live-traffic', label: 'Live Traffic', icon: Activity, match: (pathname) => pathname.startsWith('/admin/live-traffic') },
];

// 2. Products Management
const productNavItems = [
  { href: '/admin/products', label: 'Product List', icon: Box, match: (pathname) => pathname.startsWith('/admin/products') },
  { href: '/admin/restock-requests', label: 'Restock Requests', icon: Bell, match: (pathname) => pathname.startsWith('/admin/restock-requests') },
  { href: '/admin/vendors', label: 'Vendors', icon: Store, match: (pathname) => pathname.startsWith('/admin/vendors') },
  { href: '/admin/categories', label: 'Categories', icon: LayoutGrid, match: (pathname) => pathname.startsWith('/admin/categories') },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare, match: (pathname) => pathname.startsWith('/admin/reviews') },
];

// 3. Orders & Sales Management
const ordersNavItems = [
  { href: '/admin/orders', label: 'View All Orders', icon: ShoppingCart, match: (pathname) => pathname.startsWith('/admin/orders') },
  { href: '/admin/abandoned-carts', label: 'Abandoned Carts', icon: ShoppingBag, match: (pathname) => pathname.startsWith('/admin/abandoned-carts') },
  { href: '/admin/invoices', label: 'Invoices', icon: FileText, match: (pathname) => pathname.startsWith('/admin/invoices') },
  { href: '/admin/payments', label: 'Payments Received', icon: CreditCard, match: (pathname) => pathname.startsWith('/admin/payments') },
];

// 4. Customers
const customersNavItems = [
  { href: '/admin/users', label: 'Customer List / Users', icon: Users, match: (pathname) => pathname.startsWith('/admin/users') },
  { href: '/admin/manual-customers', label: 'Manual Customers', icon: Users, match: (pathname) => pathname.startsWith('/admin/manual-customers') },
  { href: '/admin/feedback', label: 'Website Feedback', icon: MessageSquare, match: (pathname) => pathname.startsWith('/admin/feedback') },
];

// 5. Marketing
const marketingNavItems = [
  { href: '/admin/marketing/featured', label: 'Featured (Ads)', icon: Sparkles, match: (pathname) => pathname.startsWith('/admin/marketing/featured') },
  { href: '/admin/marketing/campaigns', label: 'Special Offers', icon: Tag, match: (pathname) => pathname.startsWith('/admin/marketing/campaigns') },
  { href: '/admin/marketing/coupons', label: 'Coupon Codes', icon: Tags, match: (pathname) => pathname.startsWith('/admin/marketing/coupons') },
  { href: '/admin/marketing/social', label: 'Social & Tracking', icon: Globe, match: (pathname) => pathname.startsWith('/admin/marketing/social') },
];

// 6. Website Management
const websiteNavItems = [
  { href: '/admin/website/general', label: 'General Information', icon: FileText, match: (pathname) => pathname.startsWith('/admin/website/general') },
  { href: '/admin/home-page', label: 'Home Layout Settings', icon: LayoutGrid, match: (pathname) => pathname.startsWith('/admin/home-page') },
  { href: '/admin/store-setup', label: 'Store Setup', icon: Store, match: (pathname) => pathname.startsWith('/admin/store-setup') },
  { href: '/admin/cover-photos', label: 'Cover photo/Banner', icon: Images, match: (pathname) => pathname.startsWith('/admin/cover-photos') },
];

// 8. Pages Management
const pagesNavItems = [
  { href: '/admin/custom-pages', label: 'Custom Pages', icon: FileText, match: (pathname) => pathname.startsWith('/admin/custom-pages') },
];

// 9. Settings
const settingsNavItems = [
  { href: '/admin/settings/payment', label: 'Payment Methods', icon: CreditCard, match: (pathname) => pathname.startsWith('/admin/settings/payment') },
  { href: '/admin/shipping', label: 'Shipping Settings', icon: Truck, match: (pathname) => pathname.startsWith('/admin/shipping') },
  { href: '/admin/settings/whatsapp', label: 'WhatsApp Order Notifications', icon: Smartphone, match: (pathname) => pathname.startsWith('/admin/settings/whatsapp') },
  { href: '/admin/settings/email', label: 'Email Notifications', icon: Bell, match: (pathname) => pathname.startsWith('/admin/settings/email') },
  { href: '/admin/settings/dark-mode', label: 'Dark Mode', icon: Moon, match: (pathname) => pathname.startsWith('/admin/settings/dark-mode') },
];

// 10. User Roles & Permissions / Access Management
const accessNavItems = [
  { href: '/admin/roles/access', label: 'Access Management', icon: Shield, match: (pathname) => pathname.startsWith('/admin/roles/access') },
];

const compactDesktopNavItems = [
  ...primaryNavItems,
  { href: '/admin/products', label: 'Products', icon: Box, match: (pathname) => productNavItems.some(i => i.match(pathname)) },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, match: (pathname) => ordersNavItems.some(i => i.match(pathname)) },
  { href: '/admin/users', label: 'Customers', icon: Users, match: (pathname) => customersNavItems.some(i => i.match(pathname)) },
  { href: '/admin/marketing/coupons', label: 'Marketing', icon: Megaphone, match: (pathname) => marketingNavItems.some(i => i.match(pathname)) },
  { href: '/admin/home-page', label: 'Website', icon: Globe, match: (pathname) => websiteNavItems.some(i => i.match(pathname)) },
  { href: '/admin/custom-pages', label: 'Pages', icon: FileText, match: (pathname) => pagesNavItems.some(i => i.match(pathname)) },
  { href: '/admin/settings/payment', label: 'Settings', icon: Settings, match: (pathname) => settingsNavItems.some(i => i.match(pathname)) },
  { href: '/admin/roles/access', label: 'Access', icon: Shield, match: (pathname) => accessNavItems.some(i => i.match(pathname)) },
];

const mobileBottomNavItems = [
  { href: '/admin', label: 'Dashboard', icon: ChartColumn, match: (pathname) => pathname === '/admin' },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, match: (pathname) => pathname.startsWith('/admin/orders') },
  { href: '/admin/products', label: 'Products', icon: Box, match: (pathname) => pathname.startsWith('/admin/products') },
  { href: '/admin/home-page', label: 'Layout', icon: LayoutGrid, match: (pathname) => pathname.startsWith('/admin/home-page') },
];

function getOpenSections(pathname) {
  return [
    productNavItems.some((item) => item.match(pathname)) ? 'products' : null,
    ordersNavItems.some((item) => item.match(pathname)) ? 'orders' : null,
    customersNavItems.some((item) => item.match(pathname)) ? 'customers' : null,
    marketingNavItems.some((item) => item.match(pathname)) ? 'marketing' : null,
    websiteNavItems.some((item) => item.match(pathname)) ? 'website' : null,
    pagesNavItems.some((item) => item.match(pathname)) ? 'pages' : null,
    settingsNavItems.some((item) => item.match(pathname)) ? 'settings' : null,
    accessNavItems.some((item) => item.match(pathname)) ? 'access' : null,
  ].filter(Boolean);
}

function getPageMeta(pathname) {
  if (pathname.startsWith('/admin/live-traffic')) return { title: 'Live Visitor Radar' };
  if (pathname.startsWith('/admin/abandoned-carts')) return { title: 'Abandoned Carts' };
  if (pathname.startsWith('/admin/orders')) return { title: 'Orders' };
  if (pathname.startsWith('/admin/products')) return { title: 'Products' };
  if (pathname.startsWith('/admin/vendors')) return { title: 'Vendors' };
  if (pathname.startsWith('/admin/categories')) return { title: 'Categories' };
  if (pathname.startsWith('/admin/reviews')) return { title: 'Reviews' };
  if (pathname.startsWith('/admin/restock-requests')) return { title: 'Restock Requests' };
  if (pathname.startsWith('/admin/stock')) return { title: 'Stock Management' };
  if (pathname.startsWith('/admin/users')) return { title: 'Customers / Users' };
  if (pathname.startsWith('/admin/shipping')) return { title: 'Shipping Settings' };
  if (pathname.startsWith('/admin/store-setup')) return { title: 'Store Setup' };
  if (pathname.startsWith('/admin/home-page')) return { title: 'Home Layout Settings' };
  if (pathname.startsWith('/admin/cover-photos')) return { title: 'Cover Photos' };
  if (pathname.startsWith('/admin/custom-pages')) return { title: 'Custom Pages' };
  if (pathname.startsWith('/admin/marketing')) return { title: 'Marketing' };
  if (pathname.startsWith('/admin/analytics')) return { title: 'Analytics' };
  if (pathname.startsWith('/admin/website')) return { title: 'Website Management' };
  if (pathname.startsWith('/admin/pages')) return { title: 'Pages Management' };
  if (pathname.startsWith('/admin/settings')) return { title: 'Settings' };
  if (pathname.startsWith('/admin/roles')) return { title: 'Access Management' };

  return { title: 'Dashboard' };
}

export default function AdminLayoutShell({ children, sessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const pageMeta = getPageMeta(pathname);

  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => {
      document.body.classList.remove('admin-theme');
    };
  }, []);

  // Global Frontend Interceptor for Demo Mode
  useEffect(() => {
    if (!sessionUser?.isDemo) return;

    const showDemoAlert = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toast.error("Demo Mode: Actions are disabled. You have read-only access.", {
        id: "demo-lock-toast"
      });
    };

    const handleAction = (e) => {
      const target = e.target.closest('button, input[type="submit"], input[type="button"], [role="menuitem"]');
      if (!target) return;
      
      // Allow navigation links disguised as buttons
      if (target.closest('a')) return;
      
      // Explicitly allowed buttons (e.g., sidebar toggles, theme toggles, dropdown triggers)
      if (target.hasAttribute('data-demo-allow') || target.hasAttribute('aria-haspopup') || target.hasAttribute('aria-expanded')) return;
      
      // Allow common navigation menu items
      if (target.getAttribute('role') === 'menuitem' && (target.textContent?.toLowerCase().includes('logout') || target.textContent?.toLowerCase().includes('back'))) {
         return;
      }

      const text = target.textContent?.toLowerCase() || '';
      const isMutation = 
        target.type === 'submit' ||
        target.getAttribute('role') === 'menuitem' ||
        ['save', 'delete', 'update', 'add ', 'create ', 'submit', 'remove', 'confirm', 'apply'].some(k => text.includes(k));

      if (isMutation) {
        showDemoAlert(e);
      }
    };

    const handleSubmit = (e) => {
      // Allow search forms to submit by checking if it's a GET method or has a specific class
      if (e.target.method?.toLowerCase() === 'get' || e.target.querySelector('input[type="search"]')) return;
      showDemoAlert(e);
    };

    window.addEventListener('click', handleAction, true);
    window.addEventListener('submit', handleSubmit, true);

    return () => {
      window.removeEventListener('click', handleAction, true);
      window.removeEventListener('submit', handleSubmit, true);
    };
  }, [sessionUser?.isDemo]);

  if (pathname === '/admin/login') return <>{children}</>;

  function toggleDesktopSidebar() {
    setDesktopSidebarCollapsed((current) => !current);
  }

  function renderPrimaryNavLink({ href, label, icon: Icon, match }, collapsed = false) {
    const active = match(pathname);

    return (
      <Link
        key={href}
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'flex min-h-8 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-[background-color,color,transform] duration-200 active:scale-[0.98]',
          active
            ? 'bg-[#D0FAE5] text-emerald-950 font-semibold'
            : 'text-foreground/70 hover:bg-muted/70 hover:text-foreground',
          collapsed && 'justify-center px-0'
        )}
        title={collapsed ? label : undefined}
      >
        <Icon className={cn('size-3.5 shrink-0', active ? 'text-emerald-900' : '')} />
        <span className={cn('truncate', collapsed && 'hidden')}>{label}</span>
      </Link>
    );
  }

  function renderNestedNavLink({ href, label, icon: Icon, match }) {
    const active = match(pathname);

    return (
      <Link
        key={href}
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'group flex min-h-7 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-[background-color,color,transform] duration-200 active:scale-[0.98]',
          active
            ? 'bg-[#ECFDF5] text-emerald-950 font-semibold'
            : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground'
        )}
      >
        <Icon className={cn('size-3 shrink-0 transition-opacity', active ? 'text-emerald-800 opacity-100' : 'opacity-60 group-hover:opacity-85')} />
        <span className={cn('truncate', active ? 'font-semibold text-emerald-950' : 'font-normal')}>{label}</span>
      </Link>
    );
  }

  function renderSectionTrigger({ icon: Icon, label, value }) {
    let active = false;
    if (value === 'products') active = productNavItems.some((item) => item.match(pathname));
    else if (value === 'orders') active = ordersNavItems.some((item) => item.match(pathname));
    else if (value === 'marketing') active = marketingNavItems.some((item) => item.match(pathname));
    else if (value === 'website') active = websiteNavItems.some((item) => item.match(pathname));
    else if (value === 'pages') active = pagesNavItems.some((item) => item.match(pathname));
    else if (value === 'settings') active = settingsNavItems.some((item) => item.match(pathname));
    else if (value === 'access') active = accessNavItems.some((item) => item.match(pathname));

    return (
      <AccordionTrigger
        className={cn(
          'min-h-8 rounded-lg border-0 px-2.5 py-1.5 text-[12px] font-medium hover:no-underline transition-colors',
          active
            ? 'bg-[#D0FAE5] text-emerald-950 font-semibold'
            : 'bg-transparent text-foreground/70 hover:bg-muted/60 hover:text-foreground'
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('size-3.5 shrink-0', active ? 'text-emerald-900' : 'text-foreground/85')} />
          <span className={cn('text-[12px]', active ? 'font-semibold text-emerald-950' : 'font-medium text-foreground/85')}>{label}</span>
        </div>
      </AccordionTrigger>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-3 bg-white px-2.5 py-2.5 text-foreground md:px-3 md:py-3 overflow-y-auto">
      <div className={cn('flex items-center gap-2 px-0.5 py-0.5', desktopSidebarCollapsed && 'justify-center')}>
        <div className="flex size-7 items-center justify-center rounded-md border border-border bg-muted/45">
          <PanelsTopLeft className="size-3.5 text-foreground" />
        </div>
        <div className={cn('min-w-0', desktopSidebarCollapsed && 'hidden')}>
          <p className="truncate text-[13px] font-bold tracking-[0.06em] text-foreground">Admin Panel</p>
          <p className="truncate text-[10px] tracking-wider text-muted-foreground">Store Code: CUS786</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {desktopSidebarCollapsed ? (
          compactDesktopNavItems.map((item) => renderPrimaryNavLink(item, true))
        ) : (
          <>
            {primaryNavItems.map((item) => renderPrimaryNavLink(item))}

            <Accordion
              key={pathname}
              multiple
              defaultValue={getOpenSections(pathname)}
              className="flex w-full flex-col gap-1.5"
            >
              <AccordionItem value="products" className="border-none">
                {renderSectionTrigger({ icon: Box, label: 'Products Management', value: 'products' })}
                <AccordionContent className="px-0 pb-0 pt-2 [&_a]:no-underline [&_a:hover]:no-underline">
                  <div className="ml-5 flex flex-col gap-1">
                    {productNavItems.map((item) => renderNestedNavLink(item))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="orders" className="border-none">
                {renderSectionTrigger({ icon: ShoppingCart, label: 'Orders Management', value: 'orders' })}
                <AccordionContent className="px-0 pb-0 pt-2 [&_a]:no-underline [&_a:hover]:no-underline">
                  <div className="ml-5 flex flex-col gap-1">
                    {ordersNavItems.map((item) => renderNestedNavLink(item))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="customers" className="border-none">
                {renderSectionTrigger({ icon: Users, label: 'Customers', value: 'customers' })}
                <AccordionContent className="px-0 pb-0 pt-2 [&_a]:no-underline [&_a:hover]:no-underline">
                  <div className="ml-5 flex flex-col gap-1">
                    {customersNavItems.map((item) => renderNestedNavLink(item))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="marketing" className="border-none">
                {renderSectionTrigger({ icon: Megaphone, label: 'Marketing', value: 'marketing' })}
                <AccordionContent className="px-0 pb-0 pt-2 [&_a]:no-underline [&_a:hover]:no-underline">
                  <div className="ml-5 flex flex-col gap-1">
                    {marketingNavItems.map((item) => renderNestedNavLink(item))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="website" className="border-none">
                {renderSectionTrigger({ icon: Globe, label: 'Website Management', value: 'website' })}
                <AccordionContent className="px-0 pb-0 pt-2 [&_a]:no-underline [&_a:hover]:no-underline">
                  <div className="ml-5 flex flex-col gap-1">
                    {websiteNavItems.map((item) => renderNestedNavLink(item))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pages" className="border-none">
                {renderSectionTrigger({ icon: FileText, label: 'Pages Management', value: 'pages' })}
                <AccordionContent className="px-0 pb-0 pt-2 [&_a]:no-underline [&_a:hover]:no-underline">
                  <div className="ml-5 flex flex-col gap-1">
                    {pagesNavItems.map((item) => renderNestedNavLink(item))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="settings" className="border-none">
                {renderSectionTrigger({ icon: Settings, label: 'Settings', value: 'settings' })}
                <AccordionContent className="px-0 pb-0 pt-2 [&_a]:no-underline [&_a:hover]:no-underline">
                  <div className="ml-5 flex flex-col gap-1">
                    {settingsNavItems.map((item) => renderNestedNavLink(item))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="access" className="border-none">
                {renderSectionTrigger({ icon: Shield, label: 'User Roles & Permissions', value: 'access' })}
                <AccordionContent className="px-0 pb-0 pt-2 [&_a]:no-underline [&_a:hover]:no-underline">
                  <div className="ml-5 flex flex-col gap-1">
                    {accessNavItems.map((item) => renderNestedNavLink(item))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-1.5 border-t border-border pt-3">
        <Link
          href="/"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            'flex min-h-8 items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-[background-color,transform,border-color] duration-200 hover:bg-muted/70 active:scale-[0.98]',
            desktopSidebarCollapsed && 'justify-center px-0'
          )}
          title="Back to Store"
        >
          <House className="size-3.5" />
          <span className={cn(desktopSidebarCollapsed && 'hidden')}>Back to Store</span>
        </Link>

        <div className={cn('flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2', desktopSidebarCollapsed && 'justify-center px-1.5')}>
          <Avatar className="size-7 border border-border">
            <AvatarImage src={sessionUser?.image} alt={sessionUser?.name || 'Admin'} />
            <AvatarFallback className="bg-muted text-foreground">{(sessionUser?.name || 'A').charAt(0)}</AvatarFallback>
          </Avatar>
          <div className={cn('flex min-w-0 flex-col', desktopSidebarCollapsed && 'hidden')}>
            <p className="truncate text-[12px] font-semibold">{sessionUser?.name || 'Admin'}</p>
            <p className="truncate text-[10px] text-muted-foreground">{sessionUser?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className={cn(
            'flex min-h-8 items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-[background-color,transform,border-color] duration-200 hover:bg-muted/70 active:scale-[0.98]',
            desktopSidebarCollapsed && 'justify-center px-0'
          )}
          title="Logout"
        >
          <LogOut className="size-3.5" />
          <span className={cn(desktopSidebarCollapsed && 'hidden')}>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-theme min-h-screen">
      <div className="admin-shell-grid">
        <aside
          className="admin-shell-sidebar hidden shrink-0 md:block"
          data-collapsed={desktopSidebarCollapsed ? 'true' : 'false'}
        >
          {sidebar}
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
            <div className="flex min-h-12 items-center justify-between gap-2 px-2.5 py-1.5 sm:px-3 md:min-h-13 md:px-5 xl:px-6">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="admin-touch-target size-9 md:hidden" onClick={() => setSidebarOpen(true)}>
                  <Menu />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden size-8 md:inline-flex"
                  onClick={toggleDesktopSidebar}
                  title={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {desktopSidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                </Button>
                <div className="hidden lg:block">
                  <p className="text-[13px] font-semibold leading-tight text-foreground md:text-sm">{pageMeta.title}</p>
                </div>
              </div>



              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex h-8 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground sm:px-2.5 sm:text-xs"
                  onClick={() => router.push('/')}
                >
                  <House className="size-3.5 shrink-0" data-icon="inline-start" />
                  <span className="sm:hidden">Store</span>
                  <span className="hidden sm:inline">Back to Store</span>
                </Button>

                <AdminNotificationCenter />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative size-8 md:size-10 rounded-full p-0">
                      <Avatar className="size-7 md:size-9 border border-border">
                        <AvatarImage src={sessionUser?.image} alt={sessionUser?.name || 'Admin'} />
                        <AvatarFallback className="bg-muted text-[11px] md:text-sm text-foreground">{(sessionUser?.name || 'A').charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-52" align="end" sideOffset={6}>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[13px] font-medium leading-none">{sessionUser?.name || 'Admin'}</p>
                          <p className="text-[11px] leading-none text-muted-foreground">{sessionUser?.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/')}>
                        <House data-icon="inline-start" />
                        Back to Store
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => signOut({ callbackUrl: '/admin/login' })}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      >
                        <LogOut data-icon="inline-start" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 min-w-0 px-2 py-2 pb-6 sm:px-3 sm:pb-6 md:px-4 md:py-4 md:pb-4 xl:px-6">
            <div className="w-full min-w-0">{children}</div>
          </main>
        </div>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[min(84vw,16rem)] bg-white p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin navigation</SheetTitle>
            <SheetDescription>Navigate between admin sections.</SheetDescription>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>
    </div>
  );
}

