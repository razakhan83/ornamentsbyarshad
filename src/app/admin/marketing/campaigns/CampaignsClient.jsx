'use client';

import { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Tag, 
  Trash2, 
  Plus, 
  Search, 
  Percent,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
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

export default function CampaignsClient({ initialDiscounted = [] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialDiscounted);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [discountPercentInput, setDiscountPercentInput] = useState(10);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const discountedIds = new Set(products.map((p) => p._id));
  const availableProducts = searchResults.filter((p) => !discountedIds.has(p._id));

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

  async function handleApplyDiscount(product, percentage) {
    const pNum = Math.min(99, Math.max(0, Number(percentage) || 0));
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          discountPercentage: pNum,
          isDiscounted: pNum > 0
        }),
      });

      if (!res.ok) throw new Error('Failed to update product discount');

      if (pNum > 0) {
        setProducts((prev) => [
          { ...product, discountPercentage: pNum, isDiscounted: true },
          ...prev.filter((p) => p._id !== product._id)
        ]);
        toast.success(`Applied ${pNum}% discount to "${product.Name}".`);
      } else {
        setProducts((prev) => prev.filter((p) => p._id !== product._id));
        toast.success(`Removed discount from "${product.Name}".`);
      }

      setIsAddModalOpen(false);
      setSelectedProduct(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      toast.error(err.message || 'Error updating discount');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/admin" className="hover:text-foreground">Admin</Link>
            <span>/</span>
            <Link href="/admin/home-page" className="hover:text-foreground">Home Page</Link>
            <span>/</span>
            <span>Special Offers</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tag className="size-6 text-rose-500" />
            Special Offers & Discount Campaigns
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage discounted products that display in the &quot;Special Offers&quot; section on the homepage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            className="rounded-xl shadow-sm gap-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="size-4" />
            Add Special Offer
          </Button>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Add Product to Special Offers</DialogTitle>
                <DialogDescription>
                  Select a product and set a discount percentage to feature in Special Offers.
                </DialogDescription>
              </DialogHeader>

              {selectedProduct ? (
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border">
                    <div className="relative size-12 rounded-lg border overflow-hidden bg-muted shrink-0">
                      {getPrimaryProductImage(selectedProduct)?.url && (
                        <Image src={getPrimaryProductImage(selectedProduct).url} alt={selectedProduct.Name} fill className="object-cover" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{selectedProduct.Name}</p>
                      <p className="text-xs text-muted-foreground">Original: PKR {Number(selectedProduct.Price || 0).toLocaleString('en-PK')}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Discount Percentage (%)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={discountPercentInput}
                        onChange={(e) => setDiscountPercentInput(e.target.value)}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground font-medium">
                        New Price: PKR {Math.round(selectedProduct.Price * (1 - (Number(discountPercentInput) || 0) / 100)).toLocaleString('en-PK')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setSelectedProduct(null)}>Back</Button>
                    <Button disabled={saving} onClick={() => handleApplyDiscount(selectedProduct, discountPercentInput)}>
                      Apply & Add to Offers
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative my-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[50vh] divide-y divide-border border rounded-xl">
                    {availableProducts.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No matching products available to add.
                      </div>
                    ) : (
                      availableProducts.map((p) => {
                        const img = getPrimaryProductImage(p);
                        return (
                          <div key={p._id} className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative size-11 rounded-lg border overflow-hidden bg-muted shrink-0">
                                {img?.url && (
                                  <Image src={img.url} alt={p.Name} fill className="object-cover" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-foreground truncate">{p.Name}</p>
                                <p className="text-xs text-muted-foreground">PKR {Number(p.Price || 0).toLocaleString('en-PK')}</p>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg shrink-0 gap-1"
                              onClick={() => {
                                setSelectedProduct(p);
                                setDiscountPercentInput(15);
                              }}
                            >
                              <Percent className="size-3.5" />
                              Set Discount
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Special Offers List */}
      <div className="surface-card rounded-2xl border border-border/70 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">Active Special Offers</span>
            <Badge variant="secondary" className="text-xs">{products.length} Products</Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Featured automatically in the Home Page &quot;Special Offers&quot; section.
          </span>
        </div>

        {products.length === 0 ? (
          <div className="p-12 sm:p-16 text-center flex flex-col items-center justify-center gap-3">
            <Image
              src="/undraw_social-ideas_3znc.svg"
              alt="No campaigns"
              width={160}
              height={120}
              className="h-auto w-[140px] sm:w-[160px] object-contain select-none opacity-90 mb-1"
            />
            <p className="font-semibold text-foreground text-base">No active special offers</p>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
              Click &quot;Add Special Offer&quot; to apply discounts to products and showcase them on your homepage.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {products.map((product) => {
              const img = getPrimaryProductImage(product);
              const discountedPrice = Math.round(product.Price * (1 - (product.discountPercentage || 0) / 100));
              return (
                <div key={product._id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="relative size-12 sm:size-14 rounded-xl border border-border/60 overflow-hidden bg-muted shrink-0 shadow-sm">
                      {img?.url ? (
                        <Image src={img.url} alt={product.Name} fill className="object-cover" />
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <Link href={`/admin/products/edit/${product._id}`} className="font-semibold text-sm text-foreground hover:underline truncate block">
                        {product.Name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-rose-600">
                          PKR {discountedPrice.toLocaleString('en-PK')}
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          PKR {Number(product.Price || 0).toLocaleString('en-PK')}
                        </span>
                        <Badge className="bg-rose-500 text-white text-[10px] px-1.5 py-0">
                          {product.discountPercentage}% OFF
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-lg text-destructive hover:bg-destructive/10"
                      onClick={() => handleApplyDiscount(product, 0)}
                      title="Remove Discount"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
