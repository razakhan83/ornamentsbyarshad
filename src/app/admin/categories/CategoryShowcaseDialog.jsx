'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  GripVertical,
  Plus,
  Trash2,
  Search,
  Loader2,
  Sparkles,
  Sliders,
  Check,
  Package,
  Layers,
  ArrowUpDown,
  X,
  CheckCircle2,
  Zap,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function SortableProductItem({ product, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 50, position: 'relative' } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 transition-all shadow-2xs hover:border-primary/40 hover:shadow-sm',
        isDragging && 'opacity-80 ring-2 ring-primary bg-accent/60 shadow-xl'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors touch-none shrink-0"
          title="Drag to change order"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Position Badge */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground shadow-2xs">
          #{index + 1}
        </span>

        {/* Image Thumbnail */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted/30">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Package className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1" title={product.name}>
            {product.name}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Rs. {(product.price || 0).toLocaleString()}
            </span>
            <Badge
              variant={product.stockStatus === 'In Stock' ? 'outline' : 'secondary'}
              className="text-[10px] px-1.5 py-0 h-4 font-normal"
            >
              {product.stockStatus || 'In Stock'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(product._id)}
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl shrink-0 transition-colors"
        title="Unpin from front"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function CategoryShowcaseDialog({
  category,
  isOpen,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(category?.storefrontProductLimit || 8);
  const [selectionMode, setSelectionMode] = useState(category?.showcaseSelectionMode || 'pinned_first');
  const [pinnedProductIds, setPinnedProductIds] = useState(category?.featuredProductIds || []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!isOpen || !category?._id) return;

    setLimit(category.storefrontProductLimit || 8);
    setSelectionMode(category.showcaseSelectionMode || 'pinned_first');
    setPinnedProductIds(category.featuredProductIds || []);
    setSearchQuery('');

    async function loadCategoryProducts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/categories/${category._id}/products`);
        const json = await res.json();
        if (json.success) {
          setAllProducts(json.data || []);
          if (json.category?.featuredProductIds) {
            setPinnedProductIds(json.category.featuredProductIds);
          }
          if (json.category?.storefrontProductLimit) {
            setLimit(json.category.storefrontProductLimit);
          }
          if (json.category?.showcaseSelectionMode) {
            setSelectionMode(json.category.showcaseSelectionMode);
          }
        } else {
          toast.error(json.error || 'Failed to load products');
        }
      } catch (err) {
        console.error(err);
        toast.error('Network error loading products');
      } finally {
        setLoading(false);
      }
    }

    loadCategoryProducts();
  }, [isOpen, category]);

  const productMap = useMemo(() => {
    return new Map(allProducts.map((p) => [p._id, p]));
  }, [allProducts]);

  const pinnedProducts = useMemo(() => {
    return pinnedProductIds
      .map((id) => productMap.get(id))
      .filter(Boolean);
  }, [pinnedProductIds, productMap]);

  const unpinnedProducts = useMemo(() => {
    const pinnedSet = new Set(pinnedProductIds);
    let list = allProducts.filter((p) => !pinnedSet.has(p._id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [allProducts, pinnedProductIds, searchQuery]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPinnedProductIds((items) => {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handlePinProduct = (productId) => {
    if (pinnedProductIds.includes(productId)) return;
    setPinnedProductIds((prev) => [...prev, productId]);
  };

  const handleUnpinProduct = (productId) => {
    setPinnedProductIds((prev) => prev.filter((id) => id !== productId));
  };

  const handleSave = async () => {
    if (!category?._id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${category._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storefrontProductLimit: limit,
          featuredProductIds: pinnedProductIds,
          showcaseSelectionMode: selectionMode,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Showcase settings updated for ${category.name}!`);
        if (onSaved) onSaved(json.data);
        onClose();
      } else {
        toast.error(json.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error saving showcase settings');
    } finally {
      setSaving(false);
    }
  };

  const limitPresets = [4, 8, 10, 12, 15, 20];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-[1100px] sm:!max-w-[1100px] md:!max-w-[1100px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-background">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Storefront Showcase Manager
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Category:{' '}
                <span className="font-bold text-foreground px-1.5 py-0.5 rounded bg-muted/60">
                  {category?.name}
                </span>
              </DialogDescription>
            </div>
          </div>

          <Badge variant="outline" className="hidden sm:inline-flex gap-1.5 px-3 py-1 font-semibold text-xs border-border bg-card text-foreground">
            <Package className="h-3.5 w-3.5 text-primary" />
            {allProducts.length} Products in Category
          </Badge>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Quick Settings Bar */}
          <div className="grid gap-4 lg:grid-cols-12 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
            {/* 1. Limit Controller (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-primary" />
                  1. How Many Products on Front?
                </label>
                <Badge className="font-mono text-xs px-2.5 py-0.5 bg-primary/10 text-primary hover:bg-primary/15 border-none font-bold">
                  {limit} Items Total
                </Badge>
              </div>

              {/* Presets + Custom Input */}
              <div className="flex flex-wrap items-center gap-2">
                {limitPresets.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLimit(val)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer',
                      limit === val
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/30'
                        : 'bg-background hover:bg-muted text-foreground border-border'
                    )}
                  >
                    {val}
                  </button>
                ))}

                <div className="flex items-center gap-1.5 ml-1">
                  <span className="text-xs text-muted-foreground font-medium">Custom:</span>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={limit}
                    onChange={(e) => setLimit(Math.min(24, Math.max(1, Number(e.target.value) || 8)))}
                    className="h-8 text-xs w-16 text-center font-bold rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 2. Selection Strategy (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-2 lg:border-l lg:border-border/80 lg:pl-5">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                2. Display Strategy
              </label>

              <div className="grid gap-2">
                <label
                  className={cn(
                    'flex items-center justify-between gap-2 p-2 px-3 rounded-xl border cursor-pointer transition-all text-xs',
                    selectionMode === 'pinned_first'
                      ? 'border-primary bg-primary/5 text-foreground font-bold ring-1 ring-primary/40'
                      : 'border-border bg-background/50 text-muted-foreground hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    <span>Pinned First + Auto-Fill</span>
                  </div>
                  <input
                    type="radio"
                    name="selectionMode"
                    value="pinned_first"
                    checked={selectionMode === 'pinned_first'}
                    onChange={() => setSelectionMode('pinned_first')}
                    className="accent-primary h-4 w-4"
                  />
                </label>

                <label
                  className={cn(
                    'flex items-center justify-between gap-2 p-2 px-3 rounded-xl border cursor-pointer transition-all text-xs',
                    selectionMode === 'curated_only'
                      ? 'border-primary bg-primary/5 text-foreground font-bold ring-1 ring-primary/40'
                      : 'border-border bg-background/50 text-muted-foreground hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    <span>Curated / Pinned Only</span>
                  </div>
                  <input
                    type="radio"
                    name="selectionMode"
                    value="curated_only"
                    checked={selectionMode === 'curated_only'}
                    onChange={() => setSelectionMode('curated_only')}
                    className="accent-primary h-4 w-4"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Dual Columns: Pinned (Left) & Available (Right) */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm font-medium">Loading products...</span>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* LEFT COLUMN: Pinned Front Products */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Front Order ({pinnedProducts.length} Pinned)
                    </h4>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Drag to rearrange position</span>
                </div>

                {/* Sortable List Area */}
                <div className="flex-1 min-h-[300px] max-h-[420px] overflow-y-auto space-y-2 rounded-2xl border-2 border-dashed border-border p-3 bg-muted/10">
                  {pinnedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center p-6">
                      <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3 border border-border">
                        <Package className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-foreground">No Products Pinned Yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                        Click <strong>&quot;+ Pin&quot;</strong> on products from the right list to show them at the front of this category.
                      </p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={pinnedProductIds} strategy={verticalListSortingStrategy}>
                        {pinnedProducts.map((product, idx) => (
                          <SortableProductItem
                            key={product._id}
                            product={product}
                            index={idx}
                            onRemove={handleUnpinProduct}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>

                {/* Live Status Banner */}
                <div className="rounded-xl bg-primary/10 border border-primary/25 p-3 text-xs text-foreground flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium">Storefront Result:</span>
                  </div>
                  <span className="font-bold text-primary">
                    {selectionMode === 'pinned_first'
                      ? `${pinnedProducts.length} Pinned + ${Math.max(0, limit - pinnedProducts.length)} Auto-Fill = ${limit} Total`
                      : `${pinnedProducts.length} of ${limit} Curated Products`}
                  </span>
                </div>
              </div>

              {/* RIGHT COLUMN: Available Category Products */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Available to Pick ({unpinnedProducts.length})
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Click &quot;+ Pin&quot; to add
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 text-xs pl-9 pr-8 rounded-xl bg-background"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Available Products List */}
                <div className="flex-1 min-h-[300px] max-h-[420px] overflow-y-auto space-y-2 rounded-2xl border border-border p-3 bg-card shadow-xs">
                  {unpinnedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center p-6 text-muted-foreground">
                      <p className="text-xs font-medium">
                        {allProducts.length === 0
                          ? 'No products found in this category.'
                          : 'All products are already pinned.'}
                      </p>
                    </div>
                  ) : (
                    unpinnedProducts.map((product) => (
                      <div
                        key={product._id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background p-2.5 hover:border-primary/50 hover:bg-muted/20 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/40">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1" title={product.name}>
                              {product.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                Rs. {(product.price || 0).toLocaleString()}
                              </span>
                              <Badge
                                variant={product.stockStatus === 'In Stock' ? 'outline' : 'secondary'}
                                className="text-[9px] px-1.5 py-0 h-3.5 font-normal"
                              >
                                {product.stockStatus || 'In Stock'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handlePinProduct(product._id)}
                          className="h-8 px-3.5 text-xs font-bold gap-1.5 rounded-xl shrink-0 border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-2xs cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Pin
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={saving}
            className="text-xs font-semibold rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="text-xs font-bold gap-2 px-6 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Storefront Showcase
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
