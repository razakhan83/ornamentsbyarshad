'use client';

import { createContext, startTransition, useContext, useEffect, useMemo, useOptimistic, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, ShoppingCart } from 'lucide-react';

import { trackAddToCartEvent } from '@/lib/clientTracking';
import { getAvailableStock, getProductUnitPrice, isProductOutOfStock } from '@/lib/productCommerce';

const CART_STORAGE_KEY = 'ornaments_cart_v1';
const LEGACY_CART_STORAGE_KEY = 'kifayatly_cart_v2';

const CartItemsContext = createContext(null);
const CartUiContext = createContext(null);
const CartActionsContext = createContext(null);

function getCartItemId(item) {
  return item?.slug || item?._id || item?.id || item?.productId || item?.Name || item?.name;
}

function normalizeCartItem(item) {
  const basePrice = getProductUnitPrice(item);
  const originalName = item.originalName || item.Name || item.name || 'Untitled Product';
  const stockQuantity = getAvailableStock({
    ...item,
    stockQuantity: item.stockQuantity ?? item.stockCap,
    StockStatus: item.StockStatus,
    showOnStore: item.showOnStore,
  });

  return {
    id: getCartItemId(item),
    slug: item.slug || item.id || item._id || '',
    _id: item._id || item.id || item.slug || '',
    Name: originalName,
    originalName,
    Price: basePrice,
    Category: Array.isArray(item.Category) ? item.Category : item.Category ? [item.Category] : [],
    Images: item.Images || [],
    quantity: Math.max(1, Number(item.quantity || 1)),
    stockQuantity,
    StockStatus: item.StockStatus,
    selectedMetal: item.selectedMetal || item.metalType || '',
    selectedSize: item.selectedSize || item.size || '',
    selectedColor: item.selectedColor || '',
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
      const savedCart = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem(LEGACY_CART_STORAGE_KEY);
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
        if (isProductOutOfStock(product)) {
          toast.error('This piece is out of stock.');
          return { success: false, error: 'Out of stock' };
        }

        const requestedQty = Math.max(1, Number(qtyToAdd) || 1);
        const stockCap = getAvailableStock(product);
        const itemId = getCartItemId(product);
        let addedItem = null;
        let rejected = false;
        let capped = false;

        setCart((prev) => {
          const existing = prev.find((item) => item.id === itemId);
          const currentQty = existing?.quantity || 0;
          const nextQty = currentQty + requestedQty;
          if (nextQty > stockCap) {
            if (currentQty >= stockCap) {
              rejected = true;
              return prev;
            }
            capped = true;
            const allowed = stockCap - currentQty;
            addedItem = normalizeCartItem({ ...product, quantity: allowed, stockQuantity: stockCap });
            return mergeCartItems(prev, addedItem);
          }
          addedItem = normalizeCartItem({ ...product, quantity: requestedQty, stockQuantity: stockCap });
          return mergeCartItems(prev, addedItem);
        });

        if (addedItem) {
          startTransition(() => {
            addOptimisticCart({ type: 'add', item: addedItem });
          });
        }

        if (rejected) {
          toast.error(`Only ${stockCap} available.`);
          return { success: false, error: 'Insufficient stock' };
        }

        if (capped) {
          toast.error(`Only ${stockCap} available. Quantity was adjusted.`);
        }

        if (!addedItem?.id) {
          toast.error('This item could not be added to the cart.');
          return { success: false, error: 'Invalid product' };
        }

        try {
          trackAddToCartEvent({
            productId: addedItem.slug || addedItem._id || addedItem.id,
            name: addedItem.Name,
            category: Array.isArray(addedItem.Category) ? addedItem.Category.join(', ') : '',
            value: addedItem.Price,
            quantity: addedItem.quantity,
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

        return { success: true, item: addedItem };
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
            prev.flatMap((item) => {
              if (item.id !== itemId) return [item];
              const stockCap = Math.max(0, Number(item.stockQuantity) || 0);
              if (stockCap <= 0) return [];
              return [{ ...item, quantity: Math.min(safeQuantity, stockCap) }];
            })
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
