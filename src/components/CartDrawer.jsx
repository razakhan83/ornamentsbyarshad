'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, X } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';

import { useCartActions, useCartItems, useCartUi } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import { getPrimaryProductImage } from '@/lib/productImages';
import { getProductCategoryBgColor } from '@/lib/productCategories';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { buildCartWhatsAppMessage, createWhatsAppUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

const formatPrice = (raw) => {
  const clean = String(raw).replace(/[^\d.]/g, '');
  return clean ? Number(clean) : 0;
};

const formatPriceLabel = (raw) => `Rs.\u00A0${formatPrice(raw).toLocaleString('en-PK')}`;

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
        showCloseButton={false}
        className="w-full sm:w-[440px] md:w-[460px] max-w-full sm:max-w-[460px] border-l border-[#E8E5DF] bg-[#FAF9F6] p-0 text-[#121212] flex flex-col h-full max-h-[100dvh] overflow-hidden shadow-2xl z-[500]"
      >
        <div className="flex flex-col h-full w-full min-w-0 bg-[#FAF9F6] text-[#121212] overflow-hidden">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E8E5DF] bg-white shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-4.5 text-[#A67C52]" />
              <h2 className="font-serif text-base sm:text-lg font-normal tracking-wide text-[#121212] uppercase">
                Shopping Bag {cartCount > 0 ? `(${cartCount})` : ''}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="size-8.5 rounded-full flex items-center justify-center text-[#737373] hover:text-[#121212] hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="size-4.5" />
            </button>
          </div>

          {/* Main Cart Items Area */}
          <div className="flex-1 min-h-0 relative overflow-hidden bg-[#FAF9F6]">
            <ScrollArea className="h-full w-full px-3.5 sm:px-5 py-3 sm:py-4">
              {cart.length ? (
                <div className="flex flex-col gap-3">
                  {/* Subtle items count and clear all row */}
                  <div className="flex items-center justify-between gap-3 px-1 pb-0.5">
                    <span className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.18em] text-[#737373] font-medium">
                      Selected Items ({cartCount})
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 rounded-none px-1.5 text-[10.5px] uppercase tracking-wider font-medium text-[#737373] hover:bg-transparent hover:text-destructive active:scale-[0.96] cursor-pointer"
                      onClick={handleClearCart}
                      disabled={isClearingAll}
                    >
                      {isClearingAll ? 'Clearing...' : 'Clear All'}
                    </Button>
                  </div>

                  <div ref={animationParent} className="flex flex-col gap-2.5 sm:gap-3">
                    {cart.map((item, index) => {
                      const primaryImage = getPrimaryProductImage(item);
                      const primaryImageSrc = primaryImage?.url
                        ? optimizeCloudinaryUrl(primaryImage.url, CLOUDINARY_IMAGE_PRESETS.cartItem)
                        : '';
                      const itemTotal = formatPrice(item.Price || item.price) * item.quantity;

                      return (
                        <div
                          key={item.id || item.slug || item._id || item.Name || item.name || index}
                          className="bg-white p-3 sm:p-3.5 rounded-xl border border-[#E8E5DF] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors duration-200"
                        >
                          <div className="flex items-center gap-3">
                            {/* Product Thumbnail */}
                            <div 
                              className="relative size-16 sm:size-18 shrink-0 overflow-hidden rounded-lg flex items-center justify-center border border-[#E8E5DF]/50"
                              style={{ backgroundColor: getProductCategoryBgColor(item) }}
                            >
                              {primaryImageSrc ? (
                                <Image
                                  src={primaryImageSrc}
                                  alt={item.Name || item.name || 'jewelry piece'}
                                  fill
                                  sizes="72px"
                                  className="object-cover p-1"
                                  {...getBlurPlaceholderProps(primaryImage?.blurDataURL)}
                                />
                              ) : (
                                <ShoppingBag className="size-4 text-[#737373]/40" />
                              )}
                            </div>

                            {/* Info & Quantity Controls */}
                            <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-serif text-xs sm:text-sm font-medium text-[#121212] truncate leading-tight">
                                    {item.Name || item.name}
                                  </h4>
                                  {(item.selectedMetal || item.selectedSize || item.packLabel) && (
                                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#A67C52] font-medium">
                                      {[item.selectedMetal, item.selectedSize, item.packLabel].filter(Boolean).join(' • ')}
                                    </p>
                                  )}
                                  <p className="mt-0.5 text-[11px] font-normal text-[#737373] tabular-nums">
                                    {formatPriceLabel(item.Price || item.price)} each
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => scheduleRemove(item)}
                                  className="text-[#737373] hover:text-destructive p-1 transition-colors rounded-md cursor-pointer -mr-1"
                                  aria-label="Remove item"
                                  title="Remove item"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                {/* Quantity Stepper */}
                                <div className="inline-flex items-center border border-[#E8E5DF] bg-white rounded-md h-6.5 overflow-hidden">
                                  <button
                                    type="button"
                                    aria-label="Decrease quantity"
                                    onClick={() => updateQuantity(item, item.quantity - 1)}
                                    className="inline-flex size-6.5 items-center justify-center text-[#737373] hover:text-[#121212] transition-colors cursor-pointer hover:bg-neutral-50"
                                  >
                                    <Minus className="size-2.5" />
                                  </button>
                                  <span className="inline-flex min-w-6 items-center justify-center text-[11px] font-semibold text-[#121212] tabular-nums px-1">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label="Increase quantity"
                                    onClick={() => updateQuantity(item, item.quantity + 1)}
                                    className="inline-flex size-6.5 items-center justify-center text-[#737373] hover:text-[#121212] transition-colors cursor-pointer hover:bg-neutral-50"
                                  >
                                    <Plus className="size-2.5" />
                                  </button>
                                </div>

                                <span className="text-xs sm:text-sm font-semibold text-[#121212] tabular-nums whitespace-nowrap">
                                  Rs.&nbsp;{itemTotal.toLocaleString('en-PK')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[16rem] w-full flex-col items-center justify-center bg-white rounded-xl border border-[#E8E5DF]/60 px-4 py-8 my-auto text-center">
                  <div className="mb-3 flex items-center justify-center">
                    <ShoppingBag className="size-9 text-[#A67C52]/40" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-base sm:text-lg font-normal text-[#121212] whitespace-nowrap leading-none">
                    Your Bag is Empty
                  </h3>
                  <div className="mt-4 flex justify-center">
                    <Link href="/products" onClick={continueShopping}>
                      <Button className="rounded-md bg-[#121212] text-white hover:bg-neutral-800 uppercase tracking-[0.16em] text-[10.5px] h-8 px-4 font-semibold shadow-none transition-all active:scale-[0.98] cursor-pointer">
                        Explore Collections
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Persistent Footer with Subtotal and Checkout */}
          {cart.length ? (
            <div className="shrink-0 flex flex-col gap-2.5 border-t border-[#E8E5DF] bg-white px-4 sm:px-5 pt-3 sm:pt-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
              <div className="flex items-baseline justify-between border-b border-[#E8E5DF] pb-2">
                <span className="text-[11px] sm:text-xs uppercase tracking-[0.16em] font-medium text-[#737373]">Subtotal</span>
                <span className="font-serif text-base sm:text-lg font-semibold text-[#121212] tabular-nums">
                  Rs.&nbsp;{subtotal.toLocaleString('en-PK')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Main Checkout Button */}
                <Link 
                  href="/checkout" 
                  onClick={() => setIsCartOpen(false)} 
                  className="flex-1 h-10.5 sm:h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[#121212] text-white hover:bg-neutral-800 text-[11px] sm:text-xs uppercase tracking-[0.16em] font-semibold transition-all duration-200 cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <span>Checkout</span>
                  <ArrowRight className="size-3.5 sm:size-4" />
                </Link>

                {/* WhatsApp Quick Order Button */}
                <button
                  type="button"
                  title="Order on WhatsApp"
                  className="size-10.5 sm:size-11 shrink-0 inline-flex items-center justify-center rounded-lg border border-[#E8E5DF] bg-white hover:bg-[#FAF9F6] text-[#121212] transition-all duration-200 cursor-pointer active:scale-[0.98]"
                  onClick={handleWhatsAppDirectCheckout}
                >
                  <WhatsAppIcon className="size-4.5 text-[#25D366] shrink-0" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
