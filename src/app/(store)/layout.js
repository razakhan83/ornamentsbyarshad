import { cacheLife, cacheTag } from 'next/cache';
import { getStoreCategories, getStoreSettings } from "@/lib/data";
import LayoutWrapper from "@/components/LayoutWrapper";
import TrackingScripts from "@/components/TrackingScripts";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";

export default async function StoreLayout({ children }) {
  'use cache';
  cacheLife('foreverish');
  cacheTag('categories', 'settings');

  const [categories, settings] = await Promise.all([getStoreCategories(), getStoreSettings()]);

  return (
    <CartProvider>
      <WishlistProvider>
        <TooltipProvider>
          <LayoutWrapper categories={categories} settings={settings}>
            {children}
          </LayoutWrapper>
          <TrackingScripts
            enabled={settings.trackingEnabled === true}
            facebookPixelId={settings.facebookPixelId}
            tiktokPixelId={settings.tiktokPixelId}
          />
        </TooltipProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
