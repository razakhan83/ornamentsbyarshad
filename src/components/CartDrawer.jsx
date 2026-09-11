'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, ShieldCheck, Gift } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';

import { useCartActions, useCartItems, useCartUi } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from '@/components/ui/sidebar';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
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

export default function CartDrawer({ whatsappNumber = '', storeName = 'Ornaments by Arshad', hasAnnouncementBar = false }) {
  const { cart } = useCartItems();
  const { isCartOpen } = useCartUi();
  const { updateQuantity, removeFromCart, clearCart, setIsCartOpen } = useCartActions();
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [animationParent] = useAutoAnimate();

  const subtotal = cart.reduce((total, item) => {
    const itemPrice = formatPrice(item.Price || item.price);
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
      <SheetContent 
        side="right" 
        className={cn(
          "data-[side=right]:w-full w-full min-w-0 max-w-none gap-0 bg-[#FAF9F6] p-0 sm:data-[side=right]:w-screen sm:w-screen sm:max-w-none md:!w-[420px] md:data-[side=right]:!w-[420px] md:!min-w-[420px] md:!max-w-[420px] md:data-[side=right]:!max-w-[420px] !top-0 !h-full !pt-0 !z-[250] rounded-none border-l border-[#E8E5DF]"
        )} 
        closeButtonClassName="rounded-none border border-[#E8E5DF] bg-white text-[#121212] top-4 right-4" 
        overlayClassName="!z-[240]"
      >
        <Sidebar className="h-full bg-[#FAF9F6] text-[#121212] border-0 shadow-none pb-0">
          <SidebarHeader className="border-b border-[#E8E5DF] px-5 py-4.5 sm:px-6 sm:py-5 bg-white">
            <div className="flex items-baseline justify-between pr-8">
              <p className="font-serif text-xl sm:text-2xl font-normal tracking-wide text-[#121212]">Your Shopping Bag</p>
              <span className="text-xs uppercase tracking-[0.16em] text-[#737373]">({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
            </div>
          </SidebarHeader>

          <SidebarContent className="bg-[#FAF9F6]">
            <ScrollArea className="min-h-0 flex-1 px-4 py-4 md:px-6 md:py-5">
              {cart.length ? (
                <SidebarGroup className="gap-3 p-0">
                  <div className="flex items-center justify-between gap-3 px-1 pb-2">
                    <SidebarGroupLabel className="px-0 text-[11px] uppercase tracking-[0.18em] text-[#737373] font-medium">
                      Selected Creations
                    </SidebarGroupLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-none px-2 text-[11px] uppercase tracking-wider font-medium text-[#737373] hover:bg-transparent hover:text-destructive active:scale-[0.96]"
                      onClick={handleClearCart}
                      disabled={isClearingAll}
                    >
                      {isClearingAll ? 'Clearing...' : 'Clear All'}
                    </Button>
                  </div>
                  <SidebarGroupContent>
                    <div ref={animationParent} className="flex flex-col gap-3">
                      {cart.map((item, index) => {
                        const primaryImage = getPrimaryProductImage(item);
                        const primaryImageSrc = primaryImage?.url
                          ? optimizeCloudinaryUrl(primaryImage.url, CLOUDINARY_IMAGE_PRESETS.cartItem)
                          : '';
                        const itemTotal = formatPrice(item.Price || item.price) * item.quantity;

                        return (
                          <div
                            key={item.id || item.slug || item._id || item.Name || item.name || index}
                            className="bg-white p-3 rounded-[8px] border border-[#E8E5DF]/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors duration-200"
                          >
                            <div className="flex items-center gap-3">
                              {/* Product Thumbnail with Light Gray BG */}
                              <div className="relative size-16 shrink-0 overflow-hidden rounded-[6px] bg-[#F4F2EE] flex items-center justify-center">
                                {primaryImageSrc ? (
                                  <Image
                                    src={primaryImageSrc}
                                    alt={item.Name || item.name || 'jewelry piece'}
                                    fill
                                    sizes="64px"
                                    className="object-cover p-1"
                                    {...getBlurPlaceholderProps(primaryImage?.blurDataURL)}
                                  />
                                ) : (
                                  <ShoppingBag className="size-4 text-[#737373]/40" />
                                )}
                              </div>

                              {/* Info & Quantity */}
                              <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-serif text-xs sm:text-sm font-normal text-[#121212] truncate leading-tight">
                                      {item.Name || item.name}
                                    </h4>
                                    {(item.selectedMetal || item.selectedSize || item.packLabel) && (
                                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#A67C52]">
                                        {[item.selectedMetal, item.selectedSize, item.packLabel].filter(Boolean).join(' • ')}
                                      </p>
                                    )}
                                    <p className="mt-0.5 text-[11px] font-medium text-[#737373] tabular-nums">
                                      {formatPriceLabel(item.Price || item.price)}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => scheduleRemove(item)}
                                    className="text-[#737373] hover:text-destructive p-1 transition-colors rounded-md"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between pt-1.5">
                                  <div className="inline-flex items-center border border-[#E8E5DF] bg-white rounded-[6px] h-6 overflow-hidden">
                                    <button
                                      type="button"
                                      aria-label="Decrease quantity"
                                      onClick={() => updateQuantity(item, item.quantity - 1)}
                                      className="inline-flex size-6 items-center justify-center text-[#737373] hover:text-[#121212] transition-colors"
                                    >
                                      <Minus className="size-2.5" />
                                    </button>
                                    <span className="inline-flex min-w-6 items-center justify-center text-[11px] font-semibold text-[#121212] tabular-nums">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label="Increase quantity"
                                      onClick={() => updateQuantity(item, item.quantity + 1)}
                                      className="inline-flex size-6 items-center justify-center text-[#737373] hover:text-[#121212] transition-colors"
                                    >
                                      <Plus className="size-2.5" />
                                    </button>
                                  </div>

                                  <span className="text-xs font-semibold text-[#121212] tabular-nums">
                                    Rs.&nbsp;{itemTotal.toLocaleString('en-PK')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SidebarGroupContent>
                </SidebarGroup>
              ) : (
                <SidebarGroup className="p-0">
                  <Empty className="flex min-h-[18rem] flex-col items-center justify-center bg-white rounded-xl border border-[#E8E5DF]/60 px-6 py-12">
                    <EmptyHeader>
                      <div className="mb-3 flex items-center justify-center">
                        <ShoppingBag className="size-10 text-[#A67C52]/40" strokeWidth={1.5} />
                      </div>
                      <EmptyTitle className="font-serif text-xl font-normal text-[#121212]">Your Bag is Empty</EmptyTitle>
                      <EmptyDescription className="max-w-xs text-xs text-[#737373] uppercase tracking-wider leading-relaxed pt-1">
                        Explore our handcrafted fine jewelry collections to discover your signature piece.
                      </EmptyDescription>
                    </EmptyHeader>
                    <div className="mt-6 flex justify-center">
                      <Link href="/products" onClick={continueShopping}>
                        <Button className="rounded-[6px] bg-[#121212] text-white hover:bg-neutral-800 uppercase tracking-[0.18em] text-xs h-11 px-6 font-semibold">
                          Explore Collections
                        </Button>
                      </Link>
                    </div>
                  </Empty>
                </SidebarGroup>
              )}
            </ScrollArea>
          </SidebarContent>

          {cart.length ? (
            <SidebarFooter className="gap-3 border-t border-[#E8E5DF] bg-white px-5 pt-4 pb-[calc(env(safe-area-inset-bottom,0.75rem)+0.75rem)] md:px-6 md:pt-5 md:pb-6">
              <div className="flex items-baseline justify-between border-b border-[#E8E5DF] pb-3">
                <span className="text-xs uppercase tracking-[0.18em] font-semibold text-[#121212]">Subtotal</span>
                <span className="font-serif text-xl font-normal text-[#121212] tabular-nums">
                  Rs.&nbsp;{subtotal.toLocaleString('en-PK')}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <Link 
                  href="/checkout" 
                  onClick={() => setIsCartOpen(false)} 
                  className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-[6px] bg-[#121212] text-white hover:bg-neutral-800 text-xs uppercase tracking-[0.18em] font-semibold transition-all duration-300 cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="size-4" />
                </Link>

                <button
                  type="button"
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-[6px] border border-[#E8E5DF] bg-white hover:bg-[#FAF9F6] text-[#121212] text-xs uppercase tracking-[0.16em] font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98]"
                  onClick={handleWhatsAppDirectCheckout}
                >
                  <WhatsAppIcon className="size-4 text-[#25D366] shrink-0" />
                  <span>Order on WhatsApp Concierge</span>
                </button>
              </div>
            </SidebarFooter>
          ) : null}
        </Sidebar>
      </SheetContent>
    </Sheet>
  );
}
