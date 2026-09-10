'use client';

import { createContext, startTransition, useContext, useEffect, useMemo, useOptimistic, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, ShoppingCart } from 'lucide-react';

import { trackAddToCartEvent } from '@/lib/clientTracking';

const CART_STORAGE_KEY = 'kifayatly_cart_v2';

const CartItemsContext = createContext(null);
const CartUiContext = createContext(null);
const CartActionsContext = createContext(null);

function getCartItemId(item) {
  if (item?.id && item?.packLabel && typeof item.id === 'string' && item.id.endsWith(item.packLabel)) {
    return item.id;
  }
  const baseId = item?.slug || item?._id || item?.id || item?.productId || item?.Name || item?.name;
  return item?.packLabel ? `${baseId}-${item.packLabel}` : baseId;
}

function normalizeCartItem(item) {
  const basePrice = Number(item.Price || item.price || 0);
  const discountPercentage = Math.max(0, Number(item.discountPercentage || 0));
  const isDiscounted = item.isDiscounted === true;
  const discountedPrice = item.discountedPrice != null
    ? Number(item.discountedPrice)
    : isDiscounted && discountPercentage > 0
      ? Math.round(basePrice * (1 - discountPercentage / 100))
      : null;

  const packLabel = item.packLabel || '';
  const originalName = item.originalName || item.Name || item.name || 'Untitled Product';
  const finalName = packLabel && !originalName.includes(`(${packLabel})`) 
      ? `${originalName} (${packLabel})` 
      : originalName;

  return {
    id: getCartItemId(item),
    slug: item.slug || item.id || item._id || '',
    _id: item._id || item.id || item.slug || '',
    Name: finalName,
    originalName,
    packLabel,
    Price: basePrice,
    discountedPrice,
    discountPercentage,
    isDiscounted,
    isFreeDelivery: item.isFreeDelivery === true,
    Category: Array.isArray(item.Category) ? item.Category : item.Category ? [item.Category] : [],
    Images: item.Images || [],
    quantity: Math.max(1, Number(item.quantity || 1)),
  };
}

function mergeCartItems(currentCart, nextItem) {
  const existingIndex = currentCart.findIndex((item) => item.id === nextItem.id);
  if (existingIndex > -1) {
    const nextCart = [...currentCart];
    nextCart[existingIndex] = {
      ...nextCart[existingIndex],
      quantity: nextCart[existingIndex].quantity + nextItem.quantity,
    };
    return nextCart;
  }

  return [...currentCart, nextItem];
}

function applyOptimisticCartMutation(currentCart, mutation) {
  if (!mutation || typeof mutation !== 'object') return currentCart;

  switch (mutation.type) {
    case 'add':
      return mergeCartItems(currentCart, mutation.item);
    default:
      return currentCart;
  }
}

function CartProviderContent({ children }) {
  const [cart, setCart] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [optimisticCart, addOptimisticCart] = useOptimistic(cart, applyOptimisticCartMutation);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        const nextCart = Array.isArray(parsed?.items) ? parsed.items.map(normalizeCartItem) : [];
        setCart(nextCart);
      }
    } catch (error) {
      console.error('Failed to parse cart from local storage', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    persistCartSnapshot(cart);
  }, [cart, isInitialized]);

  function persistCartSnapshot(nextCart) {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          version: 2,
          items: nextCart,
        })
      );
      return true;
    } catch (error) {
      console.error('Failed to persist cart to local storage', error);
      return false;
    }
  }

  const actions = useMemo(
    () => ({
      setActiveCategory,
      setIsCartOpen,
      setIsSidebarOpen,
      openCart() {
        setIsSidebarOpen(false);
        setIsCartOpen(true);
      },
      openSidebar() {
        setIsCartOpen(false);
        setIsSidebarOpen(true);
      },
      async addToCart(product, qtyToAdd = 1) {
        const normalized = normalizeCartItem({ ...product, quantity: qtyToAdd });
        if (!normalized.id) {
          toast.error('This item could not be added to the cart.');
          return { success: false, error: 'Invalid product' };
        }

        startTransition(() => {
          addOptimisticCart({ type: 'add', item: normalized });
          setCart((prev) => mergeCartItems(prev, normalized));
        });

        try {
          trackAddToCartEvent({
            productId: normalized.slug || normalized._id || normalized.id,
            name: normalized.Name,
            category: Array.isArray(normalized.Category) ? normalized.Category.join(', ') : '',
            value: normalized.discountedPrice ?? normalized.Price,
            quantity: normalized.quantity,
          });
        } catch (error) {
          console.error('Failed to track add to cart event', error);
        }

        const toastId = toast(
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Added to your cart</span>
                </div>
                <button 
                    type="button" 
                    onClick={() => { setIsSidebarOpen(false); setIsCartOpen(true); toast.dismiss(toastId); }} 
                    className="text-[13px] font-bold text-primary hover:text-primary/80 transition-colors shrink-0 uppercase tracking-wide"
                >
                    View Cart
                </button>
            </div>,
            { 
                position: 'bottom-center', 
                duration: 3500,
                className: 'mb-[72px] lg:mb-6 mx-auto rounded-full border border-border/60 shadow-lg !p-3 !px-4 !max-w-max !w-auto bg-background/95 backdrop-blur-md',
                style: { width: 'auto', minWidth: '0' }
            }
        );

        return { success: true, item: normalized };
      },
      removeFromCart(product) {
        const itemId = getCartItemId(product);
        startTransition(() => {
          setCart((prev) => prev.filter((item) => item.id !== itemId));
        });
        return { success: true };
      },
      updateQuantity(product, newQuantity) {
        const itemId = getCartItemId(product);
        const safeQuantity = Math.max(0, Number(newQuantity) || 0);

        if (safeQuantity < 1) {
          const itemName = product?.Name || product?.name || 'Item';
          startTransition(() => {
            setCart((prev) => prev.filter((item) => item.id !== itemId));
          });
          toast.success(`${itemName} removed from cart`, {
            duration: 2200,
            action: {
              label: 'View Cart',
              onClick: () => {
                setIsSidebarOpen(false);
                setIsCartOpen(true);
              },
            },
          });
          return { success: true };
        }

        startTransition(() => {
          setCart((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, quantity: safeQuantity } : item
            )
          );
        });
        return { success: true };
      },
      replaceCart(items) {
        const nextCart = Array.isArray(items) ? items.map(normalizeCartItem) : [];
        startTransition(() => {
          setCart(nextCart);
        });
        return { success: true, cart: nextCart };
      },
      clearCart() {
        try {
          localStorage.removeItem(CART_STORAGE_KEY);
        } catch (error) {
          console.error('Failed to clear cart from local storage', error);
          toast.error('Could not clear your cart right now.');
          return { success: false, error: 'Failed to clear cart' };
        }
        setCart([]);
        return { success: true, cart: [] };
      },
    }),
    [addOptimisticCart]
  );

  const cartItemsValue = useMemo(
    () => ({
      cart: optimisticCart,
      cartCount: optimisticCart.reduce((total, item) => total + item.quantity, 0),
      isInitialized,
    }),
    [isInitialized, optimisticCart]
  );

  const cartUiValue = useMemo(
    () => ({
      activeCategory,
      isCartOpen,
      isSidebarOpen,
    }),
    [activeCategory, isCartOpen, isSidebarOpen]
  );

  return (
    <CartActionsContext.Provider value={actions}>
      <CartUiContext.Provider value={cartUiValue}>
        <CartItemsContext.Provider value={cartItemsValue}>{children}</CartItemsContext.Provider>
      </CartUiContext.Provider>
    </CartActionsContext.Provider>
  );
}

export function CartProvider({ children }) {
  return <CartProviderContent>{children}</CartProviderContent>;
}

export function useCartItems() {
  return useContext(CartItemsContext);
}

export function useCartUi() {
  return useContext(CartUiContext);
}

export function useCartActions() {
  return useContext(CartActionsContext);
}

export function useCart() {
  const items = useCartItems();
  const ui = useCartUi();
  const actions = useCartActions();

  return useMemo(
    () => ({
      ...items,
      ...ui,
      ...actions,
    }),
    [actions, items, ui]
  );
}
