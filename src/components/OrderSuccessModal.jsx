'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Check, Copy, ShoppingBag, Truck, ArrowRight, X, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function OrderSuccessModal({ isOpen, onClose, orderId }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isSignedIn = status === 'authenticated';
  const [copied, setCopied] = useState(false);

  const displayOrderId = orderId || '#ORD-' + Math.floor(100000 + Math.random() * 900000);

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
        className="p-0 overflow-hidden border border-[#E8E5DF] bg-[#FAF9F6] text-center w-full max-w-lg rounded-none shadow-2xl transition-all"
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

        {/* Top Gold Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#8F673F] via-[#B8976C] to-[#8F673F]" />

        <div className="relative p-7 sm:p-10 flex flex-col items-center">
          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-[#737373] hover:text-[#121212] hover:bg-black/5 rounded-none transition-colors"
            aria-label="Close"
          >
            <X className="size-4.5" />
          </button>

          {/* Animated Gold Checkmark Badge */}
          <div className="animate-circle-scale relative size-20 rounded-full bg-[#F4F2EE] border border-[#A67C52]/40 flex items-center justify-center mb-6">
            <svg className="size-10 text-[#A67C52]" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="14 25 21 32 34 17" className="animate-draw-check" />
            </svg>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="size-4 text-[#A67C52] animate-pulse" />
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="animate-luxury-1 space-y-2">
            <p className="text-[11px] font-sans uppercase tracking-[0.25em] text-[#A67C52] font-semibold">
              Payment Confirmed & Verified
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#121212] uppercase tracking-wider font-normal [text-wrap:balance]">
              Order Successfully Placed
            </h2>
            <p className="text-xs sm:text-sm text-[#737373] max-w-sm mx-auto leading-relaxed [text-wrap:pretty]">
              Thank you for trusting Ornaments by Arshad. Your jewelry piece is now being prepared with utmost care.
            </p>
          </div>

          {/* Order ID Box */}
          <div className="animate-luxury-2 mt-6 w-full max-w-xs bg-white border border-[#E8E5DF] p-3.5 flex items-center justify-between shadow-2xs">
            <div className="text-left">
              <span className="block text-[10px] uppercase font-mono tracking-widest text-[#737373]">
                Order Reference
              </span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-[#121212] tracking-wider">
                {displayOrderId}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#121212] hover:text-[#A67C52] bg-[#FAF9F6] hover:bg-[#F4F2EE] border border-[#E8E5DF] transition-colors"
              title="Copy Order ID"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  <span className="text-[11px] text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Action CTAs */}
          <div className="animate-luxury-3 mt-8 w-full max-w-xs space-y-3">
            {isSignedIn ? (
              <>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, '/orders')}
                  className="w-full flex items-center justify-center gap-2 bg-[#121212] hover:bg-neutral-800 text-white py-3.5 text-xs uppercase tracking-[0.2em] font-medium transition-colors"
                >
                  <Truck className="size-4" />
                  <span>View & Track Order</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, '/products')}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-[#F4F2EE] border border-[#E8E5DF] text-[#121212] py-3.5 text-xs uppercase tracking-[0.2em] font-medium transition-colors"
                >
                  <ShoppingBag className="size-4 text-[#A67C52]" />
                  <span>Continue Shopping</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, '/track-order')}
                  className="w-full flex items-center justify-center gap-2 bg-[#121212] hover:bg-neutral-800 text-white py-3.5 text-xs uppercase tracking-[0.2em] font-medium transition-colors"
                >
                  <Truck className="size-4" />
                  <span>Track Your Order</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, '/products')}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-[#F4F2EE] border border-[#E8E5DF] text-[#121212] py-3.5 text-xs uppercase tracking-[0.2em] font-medium transition-colors"
                >
                  <ShoppingBag className="size-4 text-[#A67C52]" />
                  <span>Continue Shopping</span>
                </button>
                <p className="text-[11px] text-[#737373] pt-1">
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
