'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

const WishlistContext = createContext(null);
const GUEST_WISHLIST_STORAGE_KEY = 'china_unique_guest_wishlist';
const GUEST_WISHLIST_ITEMS_STORAGE_KEY = 'china_unique_guest_wishlist_items';

function getWishlistItemId(item) {
  return String(item?._id || item?.id || item?.slug || '').trim();
}

function fireAddToWishlist(product, eventId) {
  const itemId = getWishlistItemId(product);
  if (!itemId || typeof window === 'undefined' || typeof window.fbq !== 'function') return;

  const payload = {
    content_ids: [itemId],
    content_name: product?.Name || product?.name || 'Product',
    content_type: 'product',
    value: Number(product?.discountedPrice ?? product?.Price ?? product?.price ?? 0),
    currency: 'PKR',
  };

  window.fbq('track', 'AddToWishlist', payload, eventId ? { eventID: eventId } : undefined);
}

function postMetaAddToWishlist(product, eventId) {
  if (typeof window === 'undefined') return;

  const itemId = getWishlistItemId(product);
  if (!itemId) return;

  fetch('/api/tracking/meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName: 'AddToWishlist',
      eventId,
      eventSourceUrl: window.location.href,
      customData: {
        currency: 'PKR',
        value: Number(product?.discountedPrice ?? product?.Price ?? product?.price ?? 0),
        content_type: 'product',
        content_ids: [itemId],
        content_name: product?.Name || product?.name || 'Product',
      },
    }),
    keepalive: true,
  }).catch((error) => {
    console.error('Meta AddToWishlist CAPI failed:', error);
  });
}

function readGuestWishlistIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((id) => String(id).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function readGuestWishlistItems() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_ITEMS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestWishlistSnapshot(ids, items) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_WISHLIST_STORAGE_KEY, JSON.stringify(ids));
  localStorage.setItem(GUEST_WISHLIST_ITEMS_STORAGE_KEY, JSON.stringify(items));
}

function clearGuestWishlistSnapshot() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
  localStorage.removeItem(GUEST_WISHLIST_ITEMS_STORAGE_KEY);
}

function getInitialWishlistState() {
  return {
    items: [],
    ids: [],
    isLoading: true,
  };
}

function buildNextWishlistState(current, itemId, product, shouldRemove) {
  const optimisticProduct = {
    ...product,
    _id: itemId,
    id: product?.id || itemId,
    slug: product?.slug || itemId,
  };

  const ids = shouldRemove
    ? current.ids.filter((id) => id !== itemId)
    : [itemId, ...current.ids.filter((id) => id !== itemId)];
  const items = shouldRemove
    ? current.items.filter((item) => getWishlistItemId(item) !== itemId)
    : [optimisticProduct, ...current.items.filter((item) => getWishlistItemId(item) !== itemId)];

  return {
    ...current,
    ids,
    items,
  };
}

export function WishlistProvider({ children }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState(getInitialWishlistState);

  useEffect(() => {
    let ignore = false;

    async function loadWishlist() {
      if (status === 'loading') return;

      const guestIds = readGuestWishlistIds();
      const guestItems = readGuestWishlistItems();

      if (!session) {
        if (!ignore) {
          setState({
            items: guestItems,
            ids: guestIds,
            isLoading: false,
          });
        }
        return;
      }

      if (!ignore) {
        setState((current) => ({ ...current, isLoading: true }));
      }

      try {
        if (guestIds.length > 0) {
          const syncResponse = await fetch('/api/wishlist', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: guestIds }),
          });
          const syncData = await syncResponse.json();

          if (!syncResponse.ok || !syncData?.success) {
            throw new Error(syncData?.error || 'Failed to sync wishlist');
          }

          const nextItems = Array.isArray(syncData?.data?.items) ? syncData.data.items : [];
          const nextIds = Array.isArray(syncData?.data?.ids) ? syncData.data.ids : [];

          if (!ignore) {
            setState({
              items: nextItems,
              ids: nextIds,
              isLoading: false,
            });
          }

          clearGuestWishlistSnapshot();
          return;
        }

        const response = await fetch('/api/wishlist', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load wishlist');
        }

        if (!ignore) {
          const nextItems = Array.isArray(data?.data?.items) ? data.data.items : [];
          const nextIds = Array.isArray(data?.data?.ids) ? data.data.ids : [];
          setState({
            items: nextItems,
            ids: nextIds,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Failed to load wishlist', error);
        if (!ignore) {
          setState({
            items: guestItems,
            ids: guestIds,
            isLoading: false,
          });
        }
      }
    }

    loadWishlist();
    return () => {
      ignore = true;
    };
  }, [session, status]);

  const toggleWishlist = useCallback(async (product) => {
    const itemId = getWishlistItemId(product);
    if (!itemId) return { success: false, isWishlisted: false };

    const isWishlisted = state.ids.includes(itemId);
    const eventId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${itemId}`;

    const optimisticState = buildNextWishlistState(state, itemId, product, isWishlisted);
    setState(optimisticState);

    if (!session) {
      if (optimisticState) {
        writeGuestWishlistSnapshot(optimisticState.ids, optimisticState.items);
      }

      if (!isWishlisted) {
        fireAddToWishlist(product, eventId);
        postMetaAddToWishlist(product, eventId);
      }

      return { success: true, isWishlisted: !isWishlisted };
    }

    try {
      const response = await fetch('/api/wishlist', {
        method: isWishlisted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: itemId }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Failed to update wishlist');
      }

      setState((current) => ({
        ...current,
        ids: Array.isArray(data?.data?.ids) ? data.data.ids : current.ids,
        items: Array.isArray(data?.data?.items) ? data.data.items : current.items,
      }));

      if (!isWishlisted) {
        fireAddToWishlist(product, eventId);
        postMetaAddToWishlist(product, eventId);
      }

      return { success: true, isWishlisted: !isWishlisted };
    } catch (error) {
      console.error('Failed to toggle wishlist', error);
      const rollbackState = buildNextWishlistState(optimisticState, itemId, product, !isWishlisted);
      setState(rollbackState);
      writeGuestWishlistSnapshot(rollbackState.ids, rollbackState.items);

      return { success: false, isWishlisted };
    }
  }, [session, state]);

  const value = useMemo(
    () => ({
      items: state.items,
      ids: state.ids,
      isLoading: state.isLoading,
      wishlistCount: state.ids.length,
      isWishlisted(productId) {
        return state.ids.includes(String(productId || '').trim());
      },
      toggleWishlist,
    }),
    [state, toggleWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext);
}
