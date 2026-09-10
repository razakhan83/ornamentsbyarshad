"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect, startTransition, useTransition } from "react";
import dynamic from 'next/dynamic';
import {
  ArrowDownWideNarrow,
  ImageIcon,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  TrendingUp,
  X,
  Eye,
  EyeOff,
  Package,
  Layers,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import BulkImportModal from "@/components/admin/BulkImportModal";
import AppPagination from "@/components/AppPagination";
import { deleteProductAction, toggleProductLiveAction } from "@/app/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import ProductQuickViewDialog from "./ProductQuickViewDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getBlurPlaceholderProps } from "@/lib/imagePlaceholder";
import { getProductCategoryNames } from "@/lib/productCategories";
import { getPrimaryProductImage } from "@/lib/productImages";

function buildHref(pathname, searchParams, updates) {
  const params = new URLSearchParams(searchParams?.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === "all" ||
      (key === "sort" && value === "newest")
    ) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function ProductVisibilityButton({ isLive, onToggle, disabled, isPending }) {
  if (isPending) {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold border border-border bg-muted/60 text-muted-foreground opacity-80 cursor-wait shadow-2xs min-w-[64px]"
      >
        <Loader2 className="size-3 animate-spin mr-0.5" />
        Updating...
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      title={isLive ? "Click to set as Draft" : "Click to publish Live"}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-bold tracking-tight cursor-pointer transition-all duration-150 border shadow-2xs min-w-[64px] active:scale-95",
        isLive
          ? "border-green-200 bg-green-100/60 text-green-900 hover:bg-green-100"
          : "border-yellow-200 bg-yellow-100/60 text-yellow-900 hover:bg-yellow-100"
      )}
    >
      {isLive ? "Live" : "Draft"}
    </button>
  );
}

function ProductStockButton({ isInStock, onToggle, isPending }) {
  if (isPending) {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold border border-border bg-muted/60 text-muted-foreground opacity-80 cursor-wait shadow-2xs min-w-[76px]"
      >
        <Loader2 className="size-3 animate-spin mr-0.5" />
        Updating...
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      title="Click to toggle In Stock / Out of Stock"
      className={cn(
        "inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] cursor-pointer transition-all duration-150 border shadow-2xs min-w-[76px] active:scale-95",
        isInStock
          ? "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
          : "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20"
      )}
    >
      {isInStock ? "In Stock" : "Out of Stock"}
    </button>
  );
}

function StockDialog({ open, product, quantity, onQuantityChange, saving, onOpenChange, onSave }) {
  const previewQuantity = Math.max(0, Number(quantity) || 0);
  const previewStatus = previewQuantity > 0 ? "In Stock" : "Out of Stock";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Adjust Stock Quantity</DialogTitle>
          <DialogDescription className="text-xs">
            Update available inventory for <span className="font-semibold text-foreground">{product?.Name}</span>.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="stock-quantity" className="text-xs font-semibold">Quantity</FieldLabel>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0 cursor-pointer"
                onClick={() => onQuantityChange(String(Math.max(0, previewQuantity - 1)))}
                disabled={saving}
              >
                <Minus className="size-4" />
                <span className="sr-only">Decrease stock</span>
              </Button>
              <Input
                id="stock-quantity"
                type="number"
                min="0"
                inputMode="numeric"
                value={quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
                className="h-9 text-center text-sm font-bold tabular-nums"
                disabled={saving}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0 cursor-pointer"
                onClick={() => onQuantityChange(String(previewQuantity + 1))}
                disabled={saving}
              >
                <Plus className="size-4" />
                <span className="sr-only">Increase stock</span>
              </Button>
            </div>
          </Field>

          <div className="grid grid-cols-4 gap-1.5">
            {[-10, -5, 5, 10].map((step) => (
              <Button
                key={step}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold cursor-pointer"
                onClick={() => onQuantityChange(String(Math.max(0, previewQuantity + step)))}
                disabled={saving}
              >
                {step > 0 ? `+${step}` : step}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground font-medium">Status Preview:</span>
            <span className={cn(
              "font-bold px-2 py-0.5 rounded text-[11px] border",
              previewStatus === "In Stock" 
                ? "bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200" 
                : "bg-rose-50 text-rose-950 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200"
            )}>
              {previewStatus}
            </span>
          </div>
        </FieldGroup>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VendorsModal({ open, product, onOpenChange }) {
  const vendors = Array.isArray(product?.vendors) ? product.vendors : [];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Store className="size-4 text-muted-foreground" />
            Vendor Details
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sourcing and vendor contacts for <span className="font-semibold text-foreground">{product?.Name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2.5 max-h-[350px] overflow-y-auto">
          {vendors.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No vendors assigned to this product yet.
            </div>
          ) : (
            vendors.map((v, i) => (
              <div key={i} className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-[13px]">{v.name || "Vendor " + (i + 1)}</span>
                  {v.vendorPrice != null && (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      Cost: PKR {Number(v.vendorPrice).toLocaleString("en-PK")}
                    </span>
                  )}
                </div>
                {v.vendorProductName && (
                  <p className="text-muted-foreground">Item Name: <span className="text-foreground font-medium">{v.vendorProductName}</span></p>
                )}
                {v.phone && (
                  <p className="text-muted-foreground">Phone: <span className="text-foreground font-mono font-medium">{v.phone}</span></p>
                )}
                {v.whatsappNumber && (
                  <p className="text-muted-foreground">WhatsApp: <span className="text-foreground font-mono font-medium">{v.whatsappNumber}</span></p>
                )}
                {(v.shopNumber || v.address) && (
                  <p className="text-muted-foreground">Address: <span className="text-foreground font-medium">{[v.shopNumber, v.address].filter(Boolean).join(", ")}</span></p>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {product && (
            <Link href={`/admin/products/edit/${product._id}`} className={cn(buttonVariants({ size: "sm" }))}>
              <Pencil className="size-3.5 mr-1.5" />
              Edit Sourcing Details
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProductsClient({
  initialProducts,
  total,
  totalPages,
  currentPage,
  pageSize,
  initialSearchQuery,
  initialStatusFilter,
  initialStockFilter,
  initialCategoryFilter,
  initialSortOption,
  categoryOptions,
  summary,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startNavTransition] = useTransition();
  const [products, setProducts] = useState(initialProducts);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [sortOption, setSortOption] = useState(initialSortOption);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [stockFilter, setStockFilter] = useState(initialStockFilter);
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
  
  // Selection State
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  // Modals State
  const [deleteModal, setDeleteModal] = useState({ open: false, product: null, isBulk: false });
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [togglingStockId, setTogglingStockId] = useState(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [stockModal, setStockModal] = useState({ open: false, product: null });
  const [stockQuantityInput, setStockQuantityInput] = useState("0");
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [quickViewModal, setQuickViewModal] = useState({ open: false, product: null });
  const [vendorsModal, setVendorsModal] = useState({ open: false, product: null });
  const [optimisticToggles, setOptimisticToggles] = useState({});

  useEffect(() => {
    setProducts(initialProducts);
    setSelectedProducts([]);
  }, [initialProducts]);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    setSortOption(initialSortOption);
    setStatusFilter(initialStatusFilter);
    setStockFilter(initialStockFilter);
    setCategoryFilter(initialCategoryFilter);
  }, [initialSortOption, initialStatusFilter, initialStockFilter, initialCategoryFilter]);

  useEffect(() => {
    if (stockModal.open && stockModal.product) {
      setStockQuantityInput(String(Math.max(0, Number(stockModal.product.stockQuantity) || 0)));
    }
  }, [stockModal]);

  function navigate(updates) {
    const href = buildHref(pathname, searchParams, updates);
    startNavTransition(() => {
      router.push(href);
    });
  }

  function clearFilters() {
    setSearchQuery("");
    setSortOption("newest");
    setStatusFilter("all");
    setStockFilter("all");
    setCategoryFilter("all");
    navigate({ search: null, sort: null, status: null, stock: null, category: null, page: null });
  }

  // Multi-select handlers
  const isAllSelected = products.length > 0 && selectedProducts.length === products.length;
  const isSomeSelected = selectedProducts.length > 0 && selectedProducts.length < products.length;

  function handleSelectAll(checked) {
    if (checked) {
      setSelectedProducts(products.map((p) => p._id));
    } else {
      setSelectedProducts([]);
    }
  }

  function handleSelectOne(checked, id) {
    setSelectedProducts((prev) =>
      checked ? [...prev, id] : prev.filter((pId) => pId !== id)
    );
  }

  // Delete Handlers
  async function handleDeleteConfirm() {
    if (deleteModal.isBulk) {
      await handleBulkAction("delete");
      setDeleteModal({ open: false, product: null, isBulk: false });
      return;
    }

    if (!deleteModal.product) return;
    setDeleting(true);
    startTransition(async () => {
      try {
        await deleteProductAction(deleteModal.product._id);
        setProducts((previous) => previous.filter((product) => product._id !== deleteModal.product._id));
        toast.success(`Product "${deleteModal.product.Name}" deleted.`);
        setDeleteModal({ open: false, product: null, isBulk: false });
        router.refresh();
      } catch (error) {
        toast.error(error.message || "Could not delete the product.");
      } finally {
        setDeleting(false);
      }
    });
  }

  // Visibility Single Toggle
  async function handleToggleLive(product) {
    const currentState = optimisticToggles[product._id] !== undefined ? optimisticToggles[product._id] : product.showOnStore;
    const nextState = !currentState;
    
    setTogglingId(product._id);
    setOptimisticToggles(prev => ({ ...prev, [product._id]: nextState }));
    
    startTransition(async () => {
      try {
        const result = await toggleProductLiveAction(product._id, nextState);
        setOptimisticToggles(prev => ({ ...prev, [product._id]: result.showOnStore }));
        setProducts((previous) =>
          previous.map((entry) => (entry._id === product._id ? { ...entry, showOnStore: result.showOnStore } : entry)),
        );
        toast.success(`"${product.Name}" is now ${result.showOnStore ? "Live" : "Draft"}.`);
      } catch (error) {
        setOptimisticToggles(prev => {
          const newState = { ...prev };
          delete newState[product._id];
          return newState;
        });
        toast.error(error.message || "Could not update product visibility.");
      } finally {
        setTogglingId(null);
      }
    });
  }

  // Stock Status 1-Click Toggle
  async function handleToggleStock(product) {
    setTogglingStockId(product._id);
    const newStockStatus = product.StockStatus === "In Stock" ? "Out of Stock" : "In Stock";
    const nextQuantity =
      newStockStatus === "In Stock" && Number(product.stockQuantity || 0) <= 0
        ? 1
        : Number(product.stockQuantity || 0);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/products/${product._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ StockStatus: newStockStatus, stockQuantity: nextQuantity }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || json.message || "Failed to update stock status");
        }

        setProducts((previous) =>
          previous.map((entry) =>
            entry._id === product._id
              ? {
                  ...entry,
                  StockStatus: json.data?.StockStatus || newStockStatus,
                  stockQuantity:
                    typeof json.data?.stockQuantity === "number" ? json.data.stockQuantity : nextQuantity,
                }
              : entry,
          ),
        );
        toast.success(`"${product.Name}" is now ${json.data?.StockStatus || newStockStatus}.`);
        router.refresh();
      } catch (error) {
        toast.error(error.message || "Could not update stock status.");
      } finally {
        setTogglingStockId(null);
      }
    });
  }

  // Bulk Actions
  async function handleBulkAction(action) {
    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product.");
      return;
    }

    setIsBulkUpdating(true);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/products/bulk-visibility", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, productIds: selectedProducts }),
        });
        const json = await res.json();
        
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to bulk update products");
        }
        
        toast.success(json.message);
        setSelectedProducts([]);
        router.refresh();
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsBulkUpdating(false);
      }
    });
  }

  function openStockDialog(product) {
    setStockModal({ open: true, product });
  }

  async function handleSaveStock() {
    const product = stockModal.product;
    if (!product) return;

    const nextQuantity = Math.max(0, Number(stockQuantityInput) || 0);
    setIsSavingStock(true);

    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockQuantity: nextQuantity }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Failed to update stock quantity");
      }

      setProducts((previous) =>
        previous.map((entry) =>
          entry._id === product._id
            ? {
                ...entry,
                stockQuantity: typeof json.data?.stockQuantity === "number" ? json.data.stockQuantity : nextQuantity,
                StockStatus: json.data?.StockStatus || (nextQuantity > 0 ? "In Stock" : "Out of Stock"),
              }
            : entry,
        ),
      );
      toast.success(`Stock updated for "${product.Name}".`);
      setStockModal({ open: false, product: null });
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Could not update stock quantity.");
    } finally {
      setIsSavingStock(false);
    }
  }

  const formatPrice = (price) => `PKR ${Number(price || 0).toLocaleString("en-PK")}`;

  const selectedCategoryLabel =
    categoryFilter === "all"
      ? "All Categories"
      : categoryOptions.find((category) => category.id === categoryFilter || category._id === categoryFilter)?.label ||
        categoryFilter;

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    stockFilter !== "all" ||
    categoryFilter !== "all" ||
    sortOption !== "newest";

  return (
    <div className="admin-page-stack pb-24 md:pb-0">
      <BulkImportModal
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        categoryOptions={categoryOptions}
      />

      <ProductQuickViewDialog
        open={quickViewModal.open}
        onOpenChange={(open) => setQuickViewModal((prev) => ({ ...prev, open }))}
        product={quickViewModal.product}
        categoryOptions={categoryOptions}
      />

      <VendorsModal
        open={vendorsModal.open}
        onOpenChange={(open) => setVendorsModal((prev) => ({ ...prev, open }))}
        product={vendorsModal.product}
      />

      <StockDialog
        open={stockModal.open}
        product={stockModal.product}
        quantity={stockQuantityInput}
        onQuantityChange={setStockQuantityInput}
        saving={isSavingStock}
        onOpenChange={(open) => setStockModal((prev) => ({ ...prev, open }))}
        onSave={handleSaveStock}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-4" />
              {deleteModal.isBulk ? `Delete ${selectedProducts.length} Products?` : "Delete Product?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {deleteModal.isBulk
                ? `Are you sure you want to permanently delete ${selectedProducts.length} selected products? This action cannot be undone.`
                : `Are you sure you want to delete "${deleteModal.product?.Name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <AlertDialogCancel disabled={deleting || isBulkUpdating} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={deleting || isBulkUpdating}
            >
              {deleting || isBulkUpdating ? "Deleting..." : "Delete Permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header Area */}
      <div className="admin-page-header flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <p className="admin-page-kicker">Catalog</p>
          <h2 className="admin-page-title">Products</h2>
          <p className="admin-page-subtitle">
            {summary.totalProducts} total | {summary.liveProducts} live | {summary.draftProducts} draft
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href="/admin/top-performing-products" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "admin-cta-button flex-1 sm:flex-initial bg-background px-3")}>
            <TrendingUp className="mr-1.5 size-4 shrink-0" />
            <span>Top Products</span>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setBulkImportOpen(true)} className="admin-cta-button flex-1 sm:flex-initial bg-background px-3">
            <Store className="mr-1.5 size-4 shrink-0" />
            <span>Bulk Import</span>
          </Button>
          <Link href="/admin/products/add" className={cn(buttonVariants({ variant: "default", size: "sm" }), "admin-cta-button flex-1 sm:flex-initial px-3 font-semibold")}>
            <Plus className="mr-1.5 size-4 shrink-0" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="admin-filter-shell flex flex-col gap-3 mb-3">
        {/* Search Bar */}
        <form
          className="w-full"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ search: searchQuery.trim() || null, page: null });
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products by title, category, or SKU..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 pl-10 w-full text-xs font-medium"
            />
          </div>
        </form>

        {/* Filters Row */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {/* Sort */}
          <div className="w-full sm:w-[150px]">
            <Select
              value={sortOption}
              onValueChange={(value) => {
                setSortOption(value);
                navigate({ sort: value, page: null });
              }}
            >
              <SelectTrigger className="h-9 w-full bg-background text-xs truncate">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <ArrowDownWideNarrow className="size-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Sort" className="truncate" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Visibility Status Filter */}
          <div className="w-full sm:w-[130px]">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                navigate({ status: value, page: null });
              }}
            >
              <SelectTrigger className="h-9 w-full bg-background text-xs truncate">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stock Filter */}
          <div className="w-full sm:w-[130px]">
            <Select
              value={stockFilter}
              onValueChange={(value) => {
                setStockFilter(value);
                navigate({ stock: value, page: null });
              }}
            >
              <SelectTrigger className="h-9 w-full bg-background text-xs truncate">
                <SelectValue placeholder="All Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-[160px]">
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                navigate({ category: value, page: null });
              }}
            >
              <SelectTrigger className="h-9 w-full bg-background text-xs truncate">
                <SelectValue placeholder="Category">{selectedCategoryLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category._id || category.id} value={category.id}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="col-span-2 sm:col-span-1 h-9 px-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5 shrink-0" />
              <span>Clear Filters</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Action Toolbar - appears when products are selected */}
      {selectedProducts.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border bg-muted/40 p-2.5 sm:px-4 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
              {selectedProducts.length}
            </span>
            <span className="text-xs font-semibold text-foreground">
              {selectedProducts.length === 1 ? "1 product selected" : `${selectedProducts.length} products selected`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px] font-medium bg-background hover:bg-muted transition-colors cursor-pointer"
              onClick={() => handleBulkAction("live")}
              disabled={isBulkUpdating}
            >
              <CheckCircle2 className="mr-1 size-3 text-muted-foreground" />
              Make Live
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px] font-medium bg-background hover:bg-muted transition-colors cursor-pointer"
              onClick={() => handleBulkAction("hidden")}
              disabled={isBulkUpdating}
            >
              <EyeOff className="mr-1 size-3 text-muted-foreground" />
              Make Draft
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px] font-medium bg-background hover:bg-muted transition-colors cursor-pointer"
              onClick={() => handleBulkAction("in-stock")}
              disabled={isBulkUpdating}
            >
              <Package className="mr-1 size-3 text-muted-foreground" />
              In Stock
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px] font-medium bg-background hover:bg-muted transition-colors cursor-pointer"
              onClick={() => handleBulkAction("out-of-stock")}
              disabled={isBulkUpdating}
            >
              <XCircle className="mr-1 size-3 text-muted-foreground" />
              Out of Stock
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-7 px-2.5 text-[11px] font-medium transition-colors cursor-pointer"
              onClick={() => setDeleteModal({ open: true, product: null, isBulk: true })}
              disabled={isBulkUpdating}
            >
              <Trash2 className="mr-1 size-3" />
              Delete Selected
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setSelectedProducts([])}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Products Table - Clean Order Management Style */}
      <div className={cn("hidden overflow-hidden rounded-lg border border-border bg-card md:block transition-opacity", isPending && "opacity-70")}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-3 py-3 text-center">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all products"
                    />
                  </div>
                </th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Vendor</th>
                <th className="px-3 py-3 text-center">Stock Status</th>
                <th className="px-3 py-3 text-center">Quantity</th>
                <th className="px-3 py-3 text-center">Visibility</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-sm font-medium text-muted-foreground">
                    No products found for the selected criteria.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isSelected = selectedProducts.includes(product._id);
                  const isLive = optimisticToggles[product._id] !== undefined ? optimisticToggles[product._id] : product.showOnStore;
                  const isInStock = product.StockStatus === "In Stock";
                  const qty = Math.max(0, Number(product.stockQuantity) || 0);

                  return (
                    <tr
                      key={product._id}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        isSelected && "bg-muted/40"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(checked, product._id)}
                            aria-label={`Select ${product.Name}`}
                          />
                        </div>
                      </td>

                      {/* Product Thumbnail & Name */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            className="relative size-10 overflow-hidden rounded-md border border-border bg-muted cursor-pointer shrink-0 hover:opacity-85 transition-opacity"
                            onClick={() => setQuickViewModal({ open: true, product })}
                          >
                            {getPrimaryProductImage(product)?.url ? (
                              <Image
                                src={getPrimaryProductImage(product).url}
                                alt={product.Name}
                                fill
                                className="object-cover"
                                {...getBlurPlaceholderProps(getPrimaryProductImage(product).blurDataURL)}
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-muted-foreground">
                                <ImageIcon className="size-4" />
                              </div>
                            )}
                          </button>
                          <div className="min-w-0 max-w-[260px]">
                            <button
                              type="button"
                              onClick={() => setQuickViewModal({ open: true, product })}
                              className="text-left line-clamp-2 text-[13px] font-semibold text-foreground hover:underline cursor-pointer leading-tight"
                            >
                              {product.Name}
                            </button>
                            {product.isFreeDelivery && (
                              <div className="mt-0.5 flex items-center">
                                <span className="inline-flex items-center rounded-sm bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 text-[9.5px] font-bold tracking-tight">
                                  Free DC
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {product.isDiscounted && product.discountPercentage > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-bold text-foreground tabular-nums">
                              PKR {Math.round(product.Price * (1 - product.discountPercentage / 100)).toLocaleString("en-PK")}
                            </span>
                            <span className="text-[11px] text-muted-foreground line-through tabular-nums">{formatPrice(product.Price)}</span>
                          </div>
                        ) : (
                          <span className="text-[13px] font-bold text-foreground tabular-nums">{formatPrice(product.Price)}</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-3 py-2.5">
                        <div className="flex max-w-[150px] flex-wrap gap-1">
                          {getProductCategoryNames(product).map((category) => (
                            <span
                              key={category}
                              className="inline-flex items-center rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Vendor */}
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        {Array.isArray(product.vendors) && product.vendors.length > 0 ? (
                          <span className="font-medium text-foreground text-[12px]">{product.vendors[0]?.name || "Assigned"}</span>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">No vendor</span>
                        )}
                      </td>

                      {/* 1-Click Interactive Stock Status Button */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <ProductStockButton
                          isInStock={isInStock}
                          onToggle={() => handleToggleStock(product)}
                          isPending={togglingStockId === product._id}
                        />
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span className="text-[12px] font-bold tabular-nums text-foreground">
                          Qty: {qty}
                        </span>
                      </td>

                      {/* Visibility 1-Click Interactive Button */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <ProductVisibilityButton
                          isLive={isLive}
                          onToggle={() => handleToggleLive(product)}
                          disabled={togglingId === product._id}
                          isPending={togglingId === product._id}
                        />
                      </td>

                      {/* Actions: View (Orders page style) + 3-Dot Dropdown */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2.5 text-[12px] rounded-md border border-border shadow-xs font-medium cursor-pointer"
                            onClick={() => setQuickViewModal({ open: true, product })}
                          >
                            <Eye data-icon="inline-start" />
                            View
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground cursor-pointer">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Product actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px]">
                              <DropdownMenuGroup>
                                {/* 1. Edit Product */}
                                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                                  <Link href={`/admin/products/edit/${product._id}`} className="flex w-full items-center">
                                    <Pencil className="mr-2 size-3.5" />
                                    Edit Product
                                  </Link>
                                </DropdownMenuItem>

                                {/* 2. View Vendor */}
                                <DropdownMenuItem
                                  className="cursor-pointer text-xs"
                                  onClick={() => setVendorsModal({ open: true, product })}
                                >
                                  <Store className="mr-2 size-3.5" />
                                  View Vendor
                                </DropdownMenuItem>

                                {/* 3. Adjust Quantity */}
                                <DropdownMenuItem
                                  className="cursor-pointer text-xs"
                                  onClick={() => openStockDialog(product)}
                                >
                                  <Package className="mr-2 size-3.5" />
                                  Adjust Quantity
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {/* 4. Delete Product */}
                                <DropdownMenuItem
                                  className="text-destructive focus:bg-destructive cursor-pointer focus:text-destructive-foreground text-xs font-semibold"
                                  onClick={() => setDeleteModal({ open: true, product, isBulk: false })}
                                >
                                  <Trash2 className="mr-2 size-3.5" />
                                  Delete Product
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List - Order Management Style */}
      <div className={cn("md:hidden flex flex-col gap-2.5 transition-opacity", isPending && "opacity-70")}>
        {products.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-xs text-muted-foreground">
            No products found.
          </div>
        ) : (
          products.map((product) => {
            const isSelected = selectedProducts.includes(product._id);
            const isLive = optimisticToggles[product._id] !== undefined ? optimisticToggles[product._id] : product.showOnStore;
            const isInStock = product.StockStatus === "In Stock";
            const qty = Math.max(0, Number(product.stockQuantity) || 0);

            return (
              <div
                key={product._id}
                className={cn(
                  "flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3 shadow-xs transition-colors",
                  isSelected && "bg-muted/40 border-primary/40"
                )}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(checked, product._id)}
                      aria-label={`Select ${product.Name}`}
                    />
                    <button
                      type="button"
                      className="relative size-12 overflow-hidden rounded-md border border-border bg-muted shrink-0 cursor-pointer"
                      onClick={() => setQuickViewModal({ open: true, product })}
                    >
                      {getPrimaryProductImage(product)?.url ? (
                        <Image
                          src={getPrimaryProductImage(product).url}
                          alt={product.Name}
                          fill
                          className="object-cover"
                          {...getBlurPlaceholderProps(getPrimaryProductImage(product).blurDataURL)}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="size-4" />
                        </div>
                      )}
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setQuickViewModal({ open: true, product })}
                      className="text-left line-clamp-2 text-xs font-semibold text-foreground leading-tight"
                    >
                      {product.Name}
                    </button>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] font-bold text-foreground tabular-nums">{formatPrice(product.Price)}</span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="text-[11px] font-semibold text-muted-foreground">Qty: {qty}</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground outline-none">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuGroup>
                        <DropdownMenuItem asChild className="cursor-pointer text-xs">
                          <Link href={`/admin/products/edit/${product._id}`} className="flex w-full items-center">
                            <Pencil className="mr-2 size-3.5" />
                            Edit Product
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-xs"
                          onClick={() => setVendorsModal({ open: true, product })}
                        >
                          <Store className="mr-2 size-3.5" />
                          View Vendor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-xs"
                          onClick={() => openStockDialog(product)}
                        >
                          <Package className="mr-2 size-3.5" />
                          Adjust Quantity
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive cursor-pointer focus:text-destructive-foreground text-xs font-semibold"
                          onClick={() => setDeleteModal({ open: true, product, isBulk: false })}
                        >
                          <Trash2 className="mr-2 size-3.5" />
                          Delete Product
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <ProductStockButton
                      isInStock={isInStock}
                      onToggle={() => handleToggleStock(product)}
                      isPending={togglingStockId === product._id}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <ProductVisibilityButton
                      isLive={isLive}
                      onToggle={() => handleToggleLive(product)}
                      disabled={togglingId === product._id}
                      isPending={togglingId === product._id}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <AppPagination
        page={currentPage}
        totalPages={totalPages}
        getHref={(page) => buildHref(pathname, searchParams, { page })}
      />
    </div>
  );
}
