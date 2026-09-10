"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { ProductsGridSkeleton } from "@/components/ProductsPageSkeleton";
import { cn } from "@/lib/utils";

const ProductsNavigationFeedbackContext = createContext(null);

export function ProductsNavigationFeedbackProvider({ children }) {
  const [pendingCategoryId, setPendingCategoryId] = useState(null);
  const [manualPending, setManualPending] = useState(false);

  const setCategoryPending = useCallback((categoryId, pending) => {
    setPendingCategoryId((current) => {
      if (pending) {
        return categoryId;
      }

      if (categoryId === null || current === categoryId) {
        return null;
      }

      return current;
    });
  }, []);

  const value = useMemo(
    () => ({
      pendingCategoryId,
      isPending: pendingCategoryId !== null || manualPending,
      manualPending,
      setCategoryPending,
      setManualPending,
    }),
    [manualPending, pendingCategoryId, setCategoryPending]
  );

  return (
    <ProductsNavigationFeedbackContext.Provider value={value}>
      {children}
    </ProductsNavigationFeedbackContext.Provider>
  );
}

export function useProductsNavigationFeedback() {
  const context = useContext(ProductsNavigationFeedbackContext);

  if (!context) {
    throw new Error("useProductsNavigationFeedback must be used within ProductsNavigationFeedbackProvider");
  }

  return context;
}

export function ProductsPendingResults({ children }) {
  const { isPending } = useProductsNavigationFeedback();

  return (
    <div className="relative">
      <div
        aria-hidden={isPending}
        className={cn(
          "transition-opacity duration-150 ease-out",
          isPending ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        {children}
      </div>

      {isPending ? (
        <div className="absolute inset-0 z-10 bg-background">
          <ProductsGridSkeleton />
        </div>
      ) : null}
    </div>
  );
}
