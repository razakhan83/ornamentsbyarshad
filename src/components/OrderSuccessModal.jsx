'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Check, Leaf, X, Copy } from 'lucide-react';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import Link from 'next/link';

export default function OrderSuccessModal({ isOpen, onClose, orderId }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Checking if the user is authenticated
  const isSignedIn = status === 'authenticated';
  
  const [copied, setCopied] = useState(false);
  const showConfetti = Boolean(isOpen);

  const handleCopy = () => {
    const textToCopy = orderId || '#123456789-054';
    navigator.clipboard.writeText(textToCopy);
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
        className="p-0 overflow-y-auto border-0 sm:border sm:border-border/80 bg-card text-center w-full h-[100dvh] max-w-full sm:h-auto sm:max-w-md rounded-none sm:rounded-2xl shadow-xl flex flex-col justify-center sm:block"
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes boom {
            0% { transform: scale(0) translate(0, 0); opacity: 1; }
            100% { transform: scale(1) translate(var(--tx), var(--ty)); opacity: 1; }
          }
          @keyframes popIn {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.08); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes slideUpFade {
            0% { transform: translateY(16px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .particle {
            animation: boom 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
          .pop-in {
            animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }
          .slide-up-fade {
            animation: slideUpFade 0.4s ease-out forwards;
          }
        `}} />

        <div className="relative p-6 sm:p-8 pt-12 pb-8 sm:py-8 flex flex-col items-center justify-center my-auto min-h-0 overflow-hidden w-full max-w-md mx-auto">
          
          {/* Party Boom / Confetti Effect SVG */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center top-[-60px] z-0">
               {/* Leaf Particles */}
               <div className="absolute opacity-80 particle" style={{ '--tx': '-120px', '--ty': '-100px' }}><Leaf className="text-primary size-6 rotate-45" strokeWidth={1.5} /></div>
               <div className="absolute opacity-80 particle" style={{ '--tx': '130px', '--ty': '-80px' }}><Leaf className="text-primary size-5 -rotate-12" strokeWidth={1.5} /></div>
               <div className="absolute opacity-80 particle" style={{ '--tx': '-95px', '--ty': '95px' }}><Leaf className="text-primary size-7 rotate-90" strokeWidth={1.5} /></div>
               <div className="absolute opacity-80 particle" style={{ '--tx': '115px', '--ty': '105px' }}><Leaf className="text-primary size-4 -rotate-45" strokeWidth={1.5} /></div>
               {/* Circle Particles */}
               <div className="absolute opacity-80 particle" style={{ '--tx': '-50px', '--ty': '-140px' }}><div className="w-2.5 h-2.5 rounded-full bg-primary" /></div>
               <div className="absolute opacity-80 particle" style={{ '--tx': '75px', '--ty': '-120px' }}><div className="w-3 h-3 rounded-full bg-primary/60" /></div>
               <div className="absolute opacity-80 particle" style={{ '--tx': '-140px', '--ty': '30px' }}><div className="w-2.5 h-2.5 rounded-full bg-primary/80" /></div>
               <div className="absolute opacity-80 particle" style={{ '--tx': '130px', '--ty': '40px' }}><div className="w-2 h-2 rounded-full bg-primary" /></div>
            </div>
          )}

          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full transition-colors z-10"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>

          {/* 10-Point Scallop Rosette Success Badge */}
          <div className="relative mb-6 z-10 pop-in flex items-center justify-center">
            <div className="relative size-20 sm:size-18 flex items-center justify-center">
              <svg
                viewBox="0 0 64 64"
                className="absolute inset-0 size-full drop-shadow-md"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M25.82 12.98 A7 7 0 0 1 38.18 12.98 A7 7 0 0 1 48.18 20.24 A7 7 0 0 1 52.00 32.00 A7 7 0 0 1 48.18 43.76 A7 7 0 0 1 38.18 51.02 A7 7 0 0 1 25.82 51.02 A7 7 0 0 1 15.82 43.76 A7 7 0 0 1 12.00 32.00 A7 7 0 0 1 15.82 20.24 A7 7 0 0 1 25.82 12.98 Z"
                  className="fill-white stroke-primary stroke-[2.2] dark:fill-card dark:stroke-primary"
                  strokeLinejoin="round"
                />
              </svg>
              <Check className="size-8 sm:size-7 text-primary stroke-[3] relative z-10" />
            </div>
          </div>

          <DialogHeader className="mb-3 space-y-2 relative z-10 slide-up-fade">
            <DialogTitle className="text-2xl sm:text-xl font-bold text-foreground">Order Confirmed!</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm max-w-[300px] mx-auto leading-relaxed flex flex-col items-center">
              Your order has been placed successfully.
              <span className="flex items-center justify-between gap-3 mt-4 font-semibold text-foreground text-sm tracking-wide bg-muted/50 border border-border/80 px-4 py-2.5 rounded-xl w-full max-w-[280px]">
                <span className="font-mono">{orderId || '#123456789-054'}</span>
                <button 
                  onClick={handleCopy} 
                  className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-card hover:bg-muted p-1.5 rounded-lg border border-border/70 shadow-2xs active:scale-95"
                  aria-label="Copy Order ID"
                >
                  {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
                </button>
              </span>
            </DialogDescription>
          </DialogHeader>

          <p className="text-foreground font-semibold mb-8 text-[15px] sm:text-sm relative z-10">
            Thank you for your purchase!
          </p>

          <div className="w-full space-y-3 relative z-10 slide-up-fade">
            {isSignedIn ? (
              <>
                <button 
                  type="button"
                  onClick={(e) => handleLinkClick(e, '/')}
                  className="flex w-full items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                >
                  Continue Shopping
                </button>
                <button 
                  type="button"
                  onClick={(e) => handleLinkClick(e, '/orders')}
                  className="flex w-full items-center justify-center py-3.5 rounded-xl text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted/50 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                >
                  View my order
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button"
                  onClick={(e) => handleLinkClick(e, '/orders')}
                  className="flex w-full items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                >
                  Track your order
                </button>
                
                <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-2.5 font-normal text-center">Want to view full order history?</p>
                    <button 
                      type="button"
                      onClick={(e) => handleLinkClick(e, '/auth/signin?callbackUrl=/orders')}
                      className="flex w-full items-center justify-center py-3 rounded-xl text-xs font-semibold border border-border bg-card text-foreground hover:bg-muted/50 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                    >
                      Sign in to your account
                    </button>
                </div>
              </>
            )}
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
