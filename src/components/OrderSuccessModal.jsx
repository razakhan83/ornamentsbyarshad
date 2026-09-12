'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Check, Copy, ShoppingBag, Truck, X } from 'lucide-react';
import Link from 'next/link';

export default function OrderSuccessModal({ isOpen, onClose, orderId, paymentMethod = 'cod' }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isSignedIn = status === 'authenticated';
  const [copied, setCopied] = useState(false);

  const displayOrderId = orderId || '#ORD-' + Math.floor(100000 + Math.random() * 900000);
  const isOnlinePayment = paymentMethod === 'online' || paymentMethod === 'card' || paymentMethod === 'bank' || paymentMethod === 'bank_transfer' || paymentMethod === 'stripe';

  const handleCopy = () => {
    navigator.clipboard.writeText(displayOrderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    if (href === '/') {
      handleClose();
      return;
    }
    router.push(href);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent 
        showCloseButton={false} 
        className="p-0 overflow-hidden border border-[#E8E5DF] bg-[#FAF9F6] text-center w-full max-w-md rounded-2xl shadow-2xl transition-all"
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes drawCheck {
            0% { stroke-dashoffset: 48; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes circleScale {
            0% { transform: scale(0.6); opacity: 0; }
            50% { transform: scale(1.08); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes goldAura {
            0% { box-shadow: 0 0 0 0 rgba(166, 124, 82, 0.3); }
            70% { box-shadow: 0 0 0 16px rgba(166, 124, 82, 0); }
            100% { box-shadow: 0 0 0 0 rgba(166, 124, 82, 0); }
          }
          @keyframes luxuryFadeUp {
            0% { opacity: 0; transform: translateY(14px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-draw-check {
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: drawCheck 0.7s cubic-bezier(0.65, 0, 0.45, 1) 0.25s forwards;
          }
          .animate-circle-scale {
            animation: circleScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards, goldAura 2s infinite 0.8s;
          }
          .animate-luxury-1 {
            animation: luxuryFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
          }
          .animate-luxury-2 {
            animation: luxuryFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
          }
          .animate-luxury-3 {
            animation: luxuryFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both;
          }
        `}} />

        <div className="relative p-6 sm:p-8 flex flex-col items-center">
          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute top-3.5 right-3.5 p-1.5 text-[#737373] hover:text-[#121212] hover:bg-black/5 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>

          {/* Animated Gold Checkmark Badge */}
          <div className="animate-circle-scale relative size-16 sm:size-18 rounded-full bg-[#F4F2EE] border border-[#A67C52]/40 flex items-center justify-center mb-4 sm:mb-5">
            <svg className="size-8 sm:size-9 text-[#A67C52]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="14 25 21 32 34 17" className="animate-draw-check" />
            </svg>
          </div>

          {/* Dynamic Header: Online vs COD */}
          <div className="animate-luxury-1 space-y-1.5">
            <p className="text-[10px] sm:text-[10.5px] font-sans uppercase tracking-[0.22em] text-[#A67C52] font-semibold">
              {isOnlinePayment ? 'Payment Confirmed & Verified' : 'Order Placed'}
            </p>
            <h2 className="font-serif text-xl sm:text-2xl text-[#121212] uppercase tracking-wider font-normal">
              Order Successfully Placed
            </h2>
            <p className="text-xs text-[#737373] max-w-xs mx-auto leading-relaxed pt-0.5">
              {isOnlinePayment 
                ? 'Thank you! Your order is being prepared with utmost care.'
                : 'Thank you! Your order is confirmed and will be dispatched via insured courier.'
              }
            </p>
          </div>

          {/* Minimal Order ID Card */}
          <div className="animate-luxury-2 mt-4 sm:mt-5 w-full max-w-xs bg-white border border-[#E8E5DF] rounded-xl p-3 flex items-center justify-between shadow-xs">
            <div className="text-left">
              <span className="block text-[9.5px] uppercase font-sans tracking-widest text-[#737373] font-medium">
                Order ID
              </span>
              <span className="font-mono text-xs sm:text-[13px] font-semibold text-[#121212] tracking-wide">
                {displayOrderId}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#121212] hover:text-[#A67C52] bg-[#FAF9F6] hover:bg-[#F4F2EE] border border-[#E8E5DF] rounded-lg transition-colors cursor-pointer"
              title="Copy Order ID"
            >
              {copied ? (
                <>
                  <Check className="size-3 text-emerald-600" />
                  <span className="text-[10.5px] text-emerald-600 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span className="text-[10.5px]">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Action CTAs */}
          <div className="animate-luxury-3 mt-5 sm:mt-6 w-full max-w-xs space-y-2">
            {isSignedIn ? (
              <>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, '/orders')}
                  className="w-full flex items-center justify-center gap-2 bg-[#121212] hover:bg-neutral-800 text-white h-11 text-xs uppercase tracking-[0.18em] font-semibold rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-xs"
                >
                  <Truck className="size-3.5" />
                  <span>View & Track Order</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, '/products')}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-[#FAF9F6] border border-[#E8E5DF] text-[#121212] h-10.5 text-xs uppercase tracking-[0.16em] font-semibold rounded-lg transition-all active:scale-[0.98] cursor-pointer"
                >
                  <ShoppingBag className="size-3.5 text-[#A67C52]" />
                  <span>Continue Shopping</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, '/track-order')}
                  className="w-full flex items-center justify-center gap-2 bg-[#121212] hover:bg-neutral-800 text-white h-11 text-xs uppercase tracking-[0.18em] font-semibold rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-xs"
                >
                  <Truck className="size-3.5" />
                  <span>Track Your Order</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, '/products')}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-[#FAF9F6] border border-[#E8E5DF] text-[#121212] h-10.5 text-xs uppercase tracking-[0.16em] font-semibold rounded-lg transition-all active:scale-[0.98] cursor-pointer"
                >
                  <ShoppingBag className="size-3.5 text-[#A67C52]" />
                  <span>Continue Shopping</span>
                </button>
                <p className="text-[10.5px] text-[#737373] pt-1">
                  Want full history?{' '}
                  <Link 
                    href="/auth/signin?callbackUrl=/orders" 
                    className="text-[#A67C52] hover:underline font-medium"
                    onClick={() => handleClose()}
                  >
                    Sign in to account
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
