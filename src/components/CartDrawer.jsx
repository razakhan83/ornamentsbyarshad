'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';

import { useCartActions, useCartItems, useCartUi } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import { getPrimaryProductImage } from '@/lib/productImages';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { buildCartWhatsAppMessage, createWhatsAppUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

const formatPrice = (raw) => {
  const clean = String(raw).replace(/[^\d.]/g, '');
  return clean ? Number(clean) : 0;
};

const formatPriceLabel = (raw) => `Rs. ${formatPrice(raw).toLocaleString('en-PK')}`;
const EXIT_ANIMATION_MS = 180;

export default function CartDrawer({ whatsappNumber = '', storeName = 'Ornaments by Arshad', hasAnnouncementBar = false }) {
  const { cart } = useCartItems();
  const { isCartOpen } = useCartUi();
  const { updateQuantity, removeFromCart, clearCart, setIsCartOpen } = useCartActions();
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [animationParent] = useAutoAnimate();

  const subtotal = cart.reduce((total, item) => {
    const itemPrice = item.discountedPrice != null ? item.discountedPrice : formatPrice(item.Price || item.price);
    return total + itemPrice * item.quantity;
  }, 0);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  function continueShopping() {
    setIsCartOpen(false);
  }

  function scheduleRemove(item) {
    removeFromCart(item);
  }

  function handleClearCart() {
    if (!cart.length || isClearingAll) return;

    setIsClearingAll(true);
    clearCart();
    setIsClearingAll(false);
  }

  function handleWhatsAppDirectCheckout() {
    if (!cart.length) return;
    const message = buildCartWhatsAppMessage({ items: cart, subtotal, storeName });
    const whatsappUrl = createWhatsAppUrl(whatsappNumber, message);
    if (!whatsappUrl) return;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent side="right" className={cn("data-[side=right]:w-full w-full min-w-0 max-w-none gap-0 bg-background p-0 sm:data-[side=right]:w-screen sm:w-screen sm:max-w-none md:!w-[25vw] md:data-[side=right]:!w-[25vw] md:!min-w-[400px] md:!max-w-[25vw] md:data-[side=right]:!max-w-[25vw] md:!top-0 md:!h-full md:!pt-0 md:!z-[250]", hasAnnouncementBar ? "max-md:!top-[96px] max-md:!h-[calc(100dvh-96px)]" : "max-md:!top-[64px] max-md:!h-[calc(100dvh-64px)]")} closeButtonClassName="max-md:hidden" overlayClassName="md:!z-[250]">
        <Sidebar className="h-full bg-transparent text-inherit border-0 shadow-none pb-0">
          <SidebarHeader className="max-md:hidden border-b border-sidebar-border px-5 pb-4 pt-5">
            <p className="text-xl font-bold text-sidebar-foreground [text-wrap:balance]">Your Cart</p>
          </SidebarHeader>

          <SidebarContent>
            <ScrollArea className="min-h-0 flex-1 px-4 py-3 md:px-5 md:py-4">
              {cart.length ? (
                <SidebarGroup className="gap-3 p-0">
                  <div className="flex items-center justify-between gap-3 px-1 py-0.5">
                    <SidebarGroupLabel className="px-0 text-sidebar-foreground/65">
                      Cart Items ({cartCount})
                    </SidebarGroupLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-md px-2 text-xs font-medium text-muted-foreground transition-[transform,color,background-color] duration-150 hover:bg-muted hover:text-destructive active:scale-[0.96]"
                      onClick={handleClearCart}
                      disabled={isClearingAll}
                    >
                      {isClearingAll ? 'Clearing...' : 'Clear All'}
                    </Button>
                  </div>
                  <SidebarGroupContent>
                    <div ref={animationParent} className="flex flex-col gap-2">
                      {cart.map((item, index) => {
                        const primaryImage = getPrimaryProductImage(item);
                        const primaryImageSrc = primaryImage?.url
                          ? optimizeCloudinaryUrl(primaryImage.url, CLOUDINARY_IMAGE_PRESETS.cartItem)
                          : '';
                        const itemTotal = formatPrice(item.discountedPrice != null ? item.discountedPrice : item.Price || item.price) * item.quantity;

                        return (
                          <div
                            key={item.id || item.slug || item._id || item.Name || item.name || index}
                          >
                            <div className="min-h-0">
                              <Card
                                size="sm"
                                className="gap-0 border border-border/50 bg-card hover:border-border/80 py-0 shadow-none transition-[background-color,border-color] duration-150"
                              >
                                <CardContent className="px-2.5 py-2">
                                  <div className="flex items-stretch gap-2.5">
                                    <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-muted outline outline-1 outline-black/5 md:size-[4.75rem] flex items-center justify-center">
                                      {primaryImageSrc ? (
                                        <Image
                                          src={primaryImageSrc}
                                          alt={item.Name || item.name || 'product'}
                                          fill
                                          sizes="64px"
                                          className="object-cover"
                                          {...getBlurPlaceholderProps(primaryImage?.blurDataURL)}
                                        />
                                      ) : (
                                        <ShoppingBag className="size-5 text-muted-foreground/40" />
                                      )}
                                    </div>
                                    <div className="flex min-w-0 flex-1 items-stretch justify-between gap-2">
                                      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                                        <div className="min-w-0">
                                          <CardTitle className="line-clamp-2 text-[0.85rem] leading-[1.05rem] [text-wrap:pretty]">
                                            {item.Name || item.name}
                                          </CardTitle>
                                          <p className="mt-0.5 text-[0.88rem] font-medium leading-none text-primary tabular-nums">
                                            {formatPriceLabel(item.discountedPrice != null ? item.discountedPrice : item.Price || item.price)}
                                          </p>
                                        </div>
                                        <div className="inline-flex h-8 sm:h-7 items-stretch gap-1 self-start">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            aria-label="Decrease quantity"
                                            onClick={() => updateQuantity(item, item.quantity - 1)}
                                            className="relative h-full min-h-0 w-8 sm:w-7 rounded-[var(--radius-md)] bg-muted/70 px-0 text-muted-foreground transition-[transform,color,background-color] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.96] after:absolute after:-inset-1 after:content-['']"
                                          >
                                            <Minus />
                                          </Button>
                                          <span className="inline-flex h-full w-8 sm:w-7 items-center justify-center px-0 text-[0.84rem] font-semibold leading-none tabular-nums">
                                            {item.quantity}
                                          </span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            aria-label="Increase quantity"
                                            onClick={() => updateQuantity(item, item.quantity + 1)}
                                            className="relative h-full min-h-0 w-8 sm:w-7 rounded-[var(--radius-md)] bg-muted/70 px-0 text-muted-foreground transition-[transform,color,background-color] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.96] after:absolute after:-inset-1 after:content-['']"
                                          >
                                            <Plus />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="flex min-h-full flex-col items-end justify-between py-0.5 text-right">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() => scheduleRemove(item)}
                                          className="relative size-8 sm:size-7 rounded-[var(--radius-lg)] text-red-500 hover:text-red-600 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-950/30 transition-[transform,color,background-color] duration-150 active:scale-[0.96] [&_svg]:size-3.5 after:absolute after:-inset-1.5 after:content-['']"
                                          aria-label="Remove item"
                                        >
                                          <Trash2 />
                                        </Button>
                                        <div className="flex flex-col items-end gap-1">
                                          <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
                                            Total
                                          </p>
                                          <p className="text-[0.92rem] font-semibold leading-none text-foreground tabular-nums">
                                            Rs.&nbsp;{itemTotal.toLocaleString('en-PK')}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SidebarGroupContent>
                </SidebarGroup>
              ) : (
                <SidebarGroup className="p-0">
                  <Empty className="flex min-h-[16rem] flex-col items-center justify-center rounded-[1.35rem] px-6 py-10">
                    <EmptyHeader>
                      <div className="mb-2 flex items-center justify-center">
                        <Image
                          src="/undraw_empty-cart_574u.svg"
                          alt="Empty cart illustration"
                          width={130}
                          height={130}
                          className="h-auto w-[130px] select-none"
                          priority={false}
                        />
                      </div>
                      <EmptyTitle className="text-lg font-semibold text-foreground [text-wrap:balance]">Your cart is empty</EmptyTitle>
                      <EmptyDescription className="max-w-xs [text-wrap:pretty]">
                        Start adding premium kitchenware and decor to build your order.
                      </EmptyDescription>
                    </EmptyHeader>
                    <div className="mt-6 flex justify-center">
                      <Link href="/products" onClick={continueShopping}>
                        <Button className="min-h-11 rounded-xl px-5 active:scale-[0.96]">Continue Shopping</Button>
                      </Link>
                    </div>
                  </Empty>
                </SidebarGroup>
              )}
            </ScrollArea>
          </SidebarContent>

          {cart.length ? (
            <SidebarFooter className="gap-2.5 border-t border-sidebar-border bg-background px-4 pt-3.5 pb-[calc(env(safe-area-inset-bottom,0.75rem)+0.75rem)] md:px-5 md:pt-4 md:pb-5">
              <Card size="sm" className="gap-0 border border-sidebar-border/80 bg-muted/30 py-0 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between gap-3 px-3.5 py-2.5 md:px-4 md:py-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Subtotal</CardTitle>
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    Rs.&nbsp;{subtotal.toLocaleString('en-PK')}
                  </p>
                </CardHeader>
              </Card>
              <div className="flex items-center gap-2.5 mt-1">
                <button
                  type="button"
                  className="flex-1 h-11 px-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground text-[12.5px] sm:text-sm font-bold shadow-none transition-all duration-200 active:scale-[0.98] cursor-pointer"
                  onClick={handleWhatsAppDirectCheckout}
                >
                  <WhatsAppIcon className="size-4.5 shrink-0 text-[#25D366]" />
                  <span className="truncate text-foreground font-bold">Order on WhatsApp</span>
                </button>
                
                <Link 
                  href="/checkout" 
                  onClick={() => setIsCartOpen(false)} 
                  className="flex-1 inline-flex h-11 px-3 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] sm:text-sm font-bold shadow-none transition-all active:scale-[0.98]"
                >
                  <span className="truncate">Checkout</span> <ArrowRight className="ml-1.5 size-4 shrink-0" />
                </Link>
              </div>
            </SidebarFooter>
          ) : null}
        </Sidebar>
      </SheetContent>
    </Sheet>
  );
}
