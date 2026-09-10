'use client';

import { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  closestCenter,
  DndContext,
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
  Megaphone, 
  GripVertical,
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Plus, 
  Search, 
  CheckCircle2,
  PackageSearch
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getPrimaryProductImage } from '@/lib/productImages';
import { cn } from '@/lib/utils';

function SortableFeaturedItem({ product, index, total, onMove, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const img = getPrimaryProductImage(product);
  const isInStock = product.StockStatus === 'In Stock' || !product.StockStatus;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 transition-colors bg-card hover:bg-muted/20',
        isDragging && 'opacity-60 z-30 shadow-md bg-muted/60 ring-1 ring-border'
      )}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground touch-none shrink-0"
          title="Drag to reorder"
          aria-label="Drag handle"
        >
          <GripVertical className="size-4" />
        </button>

        {/* Clean Neutral Rank Badge - No Orange */}
        <span className="flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold bg-muted text-muted-foreground border border-border tabular-nums">
          {index + 1}
        </span>

        {/* Compact Product Photo */}
        <div className="relative size-9 sm:size-10 rounded-md border border-border/70 overflow-hidden bg-muted shrink-0">
          {img?.url ? (
            <Image src={img.url} alt={product.Name} fill className="object-cover" sizes="40px" />
          ) : null}
        </div>

        {/* Product Info */}
        <div className="min-w-0">
          <Link
            href={`/admin/products/edit/${product._id}`}
            className="font-medium text-xs sm:text-sm text-foreground hover:underline truncate block"
          >
            {product.Name}
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-bold text-foreground tabular-nums">
              PKR {Number(product.Price || 0).toLocaleString('en-PK')}
            </span>
            <span
              className={cn(
                'text-[9.5px] px-1.5 py-0.2 rounded border font-semibold',
                isInStock
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400'
              )}
            >
              {product.StockStatus || 'In Stock'}
            </span>
          </div>
        </div>
      </div>

      {/* Auxiliary Controls (Arrow buttons + Delete) */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
          title="Move Up"
        >
          <ArrowUp className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          disabled={index === total - 1}
          onClick={() => onMove(index, 1)}
          title="Move Down"
        >
          <ArrowDown className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(product)}
          title="Remove from Featured"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function FeaturedProductsClient({ initialFeatured = [] }) {
  const router = useRouter();
  const [featured, setFeatured] = useState(initialFeatured);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const featuredIds = new Set(featured.map((p) => p._id));
  const availableProducts = searchResults.filter((p) => !featuredIds.has(p._id));

  useEffect(() => {
    if (!isAddModalOpen) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      const q = searchQuery.trim();
      const url = q
        ? `/api/admin/products/catalog?q=${encodeURIComponent(q)}&limit=40`
        : '/api/admin/products/catalog?limit=40';
      fetch(url, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data.products) setSearchResults(data.products);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') console.error(err);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isAddModalOpen, searchQuery]);

  async function handleToggleFeatured(product, makeFeatured) {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isFeatured: makeFeatured,
          featuredPriority: makeFeatured ? featured.length + 1 : 0
        }),
      });

      if (!res.ok) throw new Error('Failed to update featured status');

      if (makeFeatured) {
        setFeatured((prev) => [product, ...prev]);
        toast.success(`"${product.Name}" marked as Featured`);
      } else {
        setFeatured((prev) => prev.filter((p) => p._id !== product._id));
        toast.success(`"${product.Name}" removed from Featured`);
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      toast.error(err.message || 'Error updating product');
    } finally {
      setSaving(false);
    }
  }

  async function savePriorities(newList) {
    try {
      await Promise.all(
        newList.map((prod, idx) =>
          fetch(`/api/products/${prod._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ featuredPriority: newList.length - idx }),
          })
        )
      );
      toast.success('Featured order saved');
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error('Failed to update ordering');
    }
  }

  async function handleMove(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= featured.length) return;

    const newFeatured = [...featured];
    const [movedItem] = newFeatured.splice(index, 1);
    newFeatured.splice(targetIndex, 0, movedItem);

    setFeatured(newFeatured);
    await savePriorities(newFeatured);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = featured.findIndex((item) => item._id === active.id);
    const newIndex = featured.findIndex((item) => item._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newFeatured = arrayMove(featured, oldIndex, newIndex);
    setFeatured(newFeatured);
    await savePriorities(newFeatured);
  }

  return (
    <div className="w-full space-y-4 max-w-[1400px] mx-auto admin-page-stack">
      {/* Header - Neutral Store Theme */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
            <Link href="/admin" className="hover:text-foreground">Admin</Link>
            <span>/</span>
            <Link href="/admin/marketing/featured" className="hover:text-foreground">Marketing</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Featured (Ads)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted/50 text-foreground border border-border shrink-0">
              <Megaphone className="size-4 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Featured Products (Ads Showcase)
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drag and drop to prioritize products shown on the storefront homepage.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="sm"
            className="h-8.5 gap-1.5 text-xs font-semibold cursor-pointer"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="size-3.5" />
            Add Featured Product
          </Button>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-4 sm:p-5">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base font-bold">Select Product to Feature</DialogTitle>
                <DialogDescription className="text-xs">
                  Choose a product from your catalog to pin to the Featured section.
                </DialogDescription>
              </DialogHeader>

              <div className="relative my-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search products by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8.5 h-8.5 text-xs"
                />
              </div>

              <div className="flex-1 overflow-y-auto max-h-[50vh] divide-y divide-border border rounded-lg bg-card">
                {availableProducts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    No matching products available to add.
                  </div>
                ) : (
                  availableProducts.map((p) => {
                    const img = getPrimaryProductImage(p);
                    return (
                      <div key={p._id} className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative size-9 rounded-md border border-border/70 overflow-hidden bg-muted shrink-0">
                            {img?.url && (
                              <Image src={img.url} alt={p.Name} fill className="object-cover" sizes="36px" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs text-foreground truncate">{p.Name}</p>
                            <p className="text-[11px] text-muted-foreground tabular-nums">
                              PKR {Number(p.Price || 0).toLocaleString('en-PK')}
                            </p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs shrink-0 gap-1 border-border"
                          disabled={saving}
                          onClick={() => {
                            handleToggleFeatured(p, true);
                            setIsAddModalOpen(false);
                          }}
                        >
                          <Plus className="size-3" />
                          Feature
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Featured Products Compact Sortable List */}
      <div className="admin-surface rounded-[0.5rem] border border-border overflow-hidden shadow-2xs">
        <div className="px-3.5 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs sm:text-sm text-foreground">Priority Order</span>
            <span className="inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 border shadow-2xs border-border bg-muted text-muted-foreground tabular-nums">
              {featured.length} Products
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Drag rows to reorder. Items at top appear first on Home Page.
          </span>
        </div>

        {featured.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <PackageSearch className="size-8 text-muted-foreground/50" />
            <p className="font-semibold text-xs text-foreground">No featured products yet</p>
            <p className="text-[11px] max-w-sm text-muted-foreground">
              Click &quot;Add Featured Product&quot; to pin specific products to the top of your homepage.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={featured.map((p) => p._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-border">
                {featured.map((product, index) => (
                  <SortableFeaturedItem
                    key={product._id}
                    product={product}
                    index={index}
                    total={featured.length}
                    onMove={handleMove}
                    onRemove={(prod) => handleToggleFeatured(prod, false)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
