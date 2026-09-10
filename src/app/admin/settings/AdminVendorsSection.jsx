'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Check, Copy, Loader2, MoreHorizontal, MoreVertical, Package, Pencil, Plus, Search, Store, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { getPrimaryProductImage } from '@/lib/productImages';

function SettingSection({ icon: Icon, title, description, children }) {
  return (
    <section className="surface-card rounded-xl p-5 md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

const emptyVendorForm = {
  name: '',
  shopNumber: '',
  phone: '',
  whatsappNumber: '',
  email: '',
  address: '',
};

export default function AdminVendorsSection() {
  const [vendors, setVendors] = useState([]);
  const [vendorForm, setVendorForm] = useState(emptyVendorForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeVendorId, setActiveVendorId] = useState('');
  const [activeVendorProducts, setActiveVendorProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState('');
  const [deletingVendorId, setDeletingVendorId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);
  const [assignVendorProductName, setAssignVendorProductName] = useState('');
  const [assignVendorPrice, setAssignVendorPrice] = useState('');
  const [assigningProductId, setAssigningProductId] = useState('');
  const [savingLinkedProductId, setSavingLinkedProductId] = useState('');
  const [removingLinkedProductId, setRemovingLinkedProductId] = useState('');
  const [linkedProductDrafts, setLinkedProductDrafts] = useState({});
  const [editingLinkedProductId, setEditingLinkedProductId] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isVendorSearchDialogOpen, setIsVendorSearchDialogOpen] = useState(false);
  const [globalVendorSearch, setGlobalVendorSearch] = useState('');
  const [globalVendorResults, setGlobalVendorResults] = useState([]);
  const [globalVendorSearchLoading, setGlobalVendorSearchLoading] = useState(false);
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    description: '',
    actionLabel: 'Confirm',
    intent: 'default',
    payload: null,
  });
  const catalogSearchInputRef = useRef(null);
  const globalVendorSearchInputRef = useRef(null);

  async function fetchVendorProducts(vendorId) {
    const response = await fetch(`/api/admin/vendors/${vendorId}/products`);
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to load linked products.');
    }

    setActiveVendorProducts(data.data || []);
    setProductSearch('');
    setLinkedProductDrafts(
      Object.fromEntries(
        (data.data || []).map((product) => [
          product._id,
          {
            vendorProductName: product.vendorEntry?.vendorProductName || '',
            vendorPrice:
              product.vendorEntry?.vendorPrice === null || product.vendorEntry?.vendorPrice === undefined
                ? ''
                : String(product.vendorEntry.vendorPrice),
          },
        ])
      )
    );
  }

  useEffect(() => {
    async function loadVendors() {
      try {
        const response = await fetch('/api/admin/vendors');
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load vendors.');
        }

        setVendors(data.data || []);
      } catch (error) {
        toast.error(error.message || 'Failed to load vendors.');
      } finally {
        setLoading(false);
      }
    }

    loadVendors();
  }, []);

  useEffect(() => {
    async function loadVendorProducts() {
      if (!activeVendorId) {
        setActiveVendorProducts([]);
        setProductSearch('');
        setIsAddProductOpen(false);
        setCatalogSearch('');
        setCatalogResults([]);
        setSelectedCatalogProduct(null);
        setAssignVendorProductName('');
        setAssignVendorPrice('');
        setLinkedProductDrafts({});
        return;
      }

      setLoadingProducts(true);
      try {
        await fetchVendorProducts(activeVendorId);
      } catch (error) {
        toast.error(error.message || 'Failed to load linked products.');
      } finally {
        setLoadingProducts(false);
      }
    }

    loadVendorProducts();
  }, [activeVendorId]);

  useEffect(() => {
    async function searchCatalogProducts() {
      const term = catalogSearch.trim();
      if (!activeVendorId || term.length < 2) {
        setCatalogResults([]);
        return;
      }

      setCatalogLoading(true);
      try {
        const response = await fetch(
          `/api/admin/vendors/${activeVendorId}/products?mode=available&search=${encodeURIComponent(term)}`
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to search products.');
        }

        setCatalogResults(data.data || []);
      } catch (error) {
        toast.error(error.message || 'Failed to search products.');
      } finally {
        setCatalogLoading(false);
      }
    }

    const timeoutId = setTimeout(searchCatalogProducts, 250);
    return () => clearTimeout(timeoutId);
  }, [activeVendorId, catalogSearch]);

  useEffect(() => {
    async function searchVendorProducts() {
      const term = globalVendorSearch.trim();
      if (term.length < 2 || !isVendorSearchDialogOpen) {
        setGlobalVendorResults([]);
        return;
      }

      setGlobalVendorSearchLoading(true);
      try {
        const response = await fetch(`/api/admin/vendors/search?search=${encodeURIComponent(term)}`);
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to search vendor products.');
        }

        setGlobalVendorResults(data.data || []);
      } catch (error) {
        toast.error(error.message || 'Failed to search vendor products.');
      } finally {
        setGlobalVendorSearchLoading(false);
      }
    }

    const timeoutId = setTimeout(searchVendorProducts, 250);
    return () => clearTimeout(timeoutId);
  }, [globalVendorSearch, isVendorSearchDialogOpen]);

  const activeVendor = vendors.find((vendor) => vendor._id === activeVendorId) || null;

  const filteredVendorProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return activeVendorProducts;

    return activeVendorProducts.filter((product) => {
      const vendorEntry = product.vendorEntry || {};
      return [product.Name, vendorEntry.vendorProductName, vendorEntry.vendorPrice]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [activeVendorProducts, productSearch]);

  function updateVendorForm(field, value) {
    setVendorForm((current) => ({ ...current, [field]: value }));
  }

  function resetVendorForm() {
    setVendorForm(emptyVendorForm);
    setEditingVendorId('');
    setIsVendorDialogOpen(false);
  }

  function updateLinkedDraft(productId, field, value) {
    setLinkedProductDrafts((current) => ({
      ...current,
      [productId]: {
        vendorProductName: current[productId]?.vendorProductName || '',
        vendorPrice: current[productId]?.vendorPrice || '',
        [field]: value,
      },
    }));
  }

  async function handleCopy(text, label) {
    const value = String(text || '').trim();
    if (!value) {
      toast.error(`${label} not added yet.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  async function handleVendorSubmit(event) {
    event.preventDefault();

    const payload = {
      name: vendorForm.name.trim(),
      shopNumber: vendorForm.shopNumber.trim(),
      phone: vendorForm.phone.trim(),
      whatsappNumber: vendorForm.whatsappNumber.trim(),
      email: vendorForm.email.trim(),
      address: vendorForm.address.trim(),
    };

    if (!payload.name) {
      toast.error('Vendor name is required.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingVendorId ? `/api/admin/vendors/${editingVendorId}` : '/api/admin/vendors',
        {
          method: editingVendorId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save vendor.');
      }

      if (editingVendorId) {
        setVendors((current) =>
          current
            .map((vendor) => (vendor._id === editingVendorId ? data.data : vendor))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        toast.success('Vendor updated.');
      } else {
        setVendors((current) => [...current, data.data].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Vendor added.');
      }

      resetVendorForm();
    } catch (error) {
      toast.error(error.message || 'Failed to save vendor.');
    } finally {
      setSaving(false);
    }
  }

  function startEditingVendor(vendor) {
    setEditingVendorId(vendor._id);
    setVendorForm({
      name: vendor.name || '',
      shopNumber: vendor.shopNumber || '',
      phone: vendor.phone || '',
      whatsappNumber: vendor.whatsappNumber || '',
      email: vendor.email || '',
      address: vendor.address || '',
    });
    setIsVendorDialogOpen(true);
  }

  async function handleDeleteVendor(vendor) {
    setDeletingVendorId(vendor._id);
    try {
      const response = await fetch(`/api/admin/vendors/${vendor._id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete vendor.');
      }

      setVendors((current) => current.filter((entry) => entry._id !== vendor._id));
      if (activeVendorId === vendor._id) {
        setActiveVendorId('');
        setActiveVendorProducts([]);
      }
      if (editingVendorId === vendor._id) {
        resetVendorForm();
      }
      toast.success('Vendor deleted.');
    } catch (error) {
      toast.error(error.message || 'Failed to delete vendor.');
    } finally {
      setDeletingVendorId('');
    }
  }

  async function saveVendorProductLink(productId, values, successMessage) {
    if (!activeVendorId) return;

    const payload = {
      productId,
      vendorProductName: String(values.vendorProductName || '').trim(),
      vendorPrice:
        values.vendorPrice === '' || values.vendorPrice === null || values.vendorPrice === undefined
          ? ''
          : Number(values.vendorPrice),
    };

    const response = await fetch(`/api/admin/vendors/${activeVendorId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to save vendor product link.');
    }

    await fetchVendorProducts(activeVendorId);
    toast.success(successMessage);
    return data.data;
  }

  async function handleAssignProduct() {
    if (!selectedCatalogProduct) {
      toast.error('Select a product first.');
      return;
    }

    setAssigningProductId(selectedCatalogProduct._id);
    try {
      await saveVendorProductLink(
        selectedCatalogProduct._id,
        {
          vendorProductName: assignVendorProductName,
          vendorPrice: assignVendorPrice,
        },
        'Product linked to vendor.'
      );
      setSelectedCatalogProduct(null);
      setAssignVendorProductName('');
      setAssignVendorPrice('');
      setCatalogSearch('');
      setCatalogResults([]);
      setIsAddProductOpen(false);
      window.requestAnimationFrame(() => {
        catalogSearchInputRef.current?.focus();
      });
    } catch (error) {
      toast.error(error.message || 'Failed to link product.');
    } finally {
      setAssigningProductId('');
    }
  }

  async function handleSaveLinkedProduct(productId) {
    const draft = linkedProductDrafts[productId] || { vendorProductName: '', vendorPrice: '' };
    setSavingLinkedProductId(productId);
    try {
      await saveVendorProductLink(productId, draft, 'Vendor details updated.');
    } catch (error) {
      toast.error(error.message || 'Failed to update linked product.');
    } finally {
      setSavingLinkedProductId('');
    }
  }

  async function handleRemoveLinkedProduct(productId, productName) {
    if (!activeVendorId) return;

    setRemovingLinkedProductId(productId);
    try {
      const response = await fetch(`/api/admin/vendors/${activeVendorId}/products`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove linked product.');
      }

      await fetchVendorProducts(activeVendorId);
      setEditingLinkedProductId((current) => (current === productId ? '' : current));
      toast.success('Product removed from vendor.');
    } catch (error) {
      toast.error(error.message || 'Failed to remove linked product.');
    } finally {
      setRemovingLinkedProductId('');
    }
  }

  async function handleConfirmAction() {
    const payload = confirmState.payload;
    if (!payload) return;

    if (payload.type === 'delete-vendor') {
      await handleDeleteVendor(payload.vendor);
    }

    if (payload.type === 'remove-linked-product') {
      await handleRemoveLinkedProduct(payload.productId, payload.productName);
    }

    setConfirmState((current) => ({ ...current, open: false, payload: null }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div id="vendors-section" className="sr-only" />
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-[12px] font-semibold"
          onClick={() => {
            setIsVendorSearchDialogOpen(true);
            window.requestAnimationFrame(() => {
              globalVendorSearchInputRef.current?.focus();
            });
          }}
        >
          <Search className="size-3.5" />
          Search Vendor Products
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="admin-cta-button"
          onClick={() => {
            setVendorForm(emptyVendorForm);
            setEditingVendorId('');
            setIsVendorDialogOpen(true);
          }}
        >
          <Plus data-icon="inline-start" />
          Add Vendor
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-muted/40 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Vendor List</p>
          </div>

          <div className="flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading vendors...
              </div>
            ) : vendors.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No vendors yet. Add your first one above.
              </div>
            ) : (
              vendors.map((vendor) => {
                const isActive = activeVendorId === vendor._id;

                return (
                  <div
                    key={vendor._id}
                    className="flex items-center gap-3 border-b border-border/70 px-4 py-3 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveVendorId(vendor._id)}
                      className={`flex min-w-0 flex-1 flex-col rounded-lg px-3 py-2 text-left transition-colors ${
                        isActive ? 'bg-muted text-foreground' : 'hover:bg-muted/50'
                      }`}
                    >
                      <span className="truncate font-medium">{vendor.name}</span>
                      <span className="mt-1 text-xs text-muted-foreground">
                        {vendor.shopNumber ? `Shop ${vendor.shopNumber}` : 'Shop number not added'}
                        {vendor.whatsappNumber ? ` • WhatsApp ${vendor.whatsappNumber}` : vendor.phone ? ` • Phone ${vendor.phone}` : ''}
                      </span>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => startEditingVendor(vendor)}>
                            <Pencil className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                            disabled={deletingVendorId === vendor._id}
                            onClick={() =>
                              setConfirmState({
                                open: true,
                                title: 'Delete vendor?',
                                description: `Delete "${vendor.name}"? This will remove the vendor from all linked products.`,
                                actionLabel: 'Delete',
                                intent: 'destructive',
                                payload: { type: 'delete-vendor', vendor },
                              })
                            }
                          >
                            {deletingVendorId === vendor._id ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 size-4" />
                            )}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-1 border-b border-border bg-muted/40 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {activeVendor ? `${activeVendor.name} Products` : 'Linked Products'}
            </p>
            {activeVendor && (
              <p className="text-[10px] text-muted-foreground">
                {activeVendor.shopNumber ? `Shop ${activeVendor.shopNumber}` : 'No shop number'}
              </p>
            )}
          </div>

          {activeVendor ? (
            <div className="border-b border-border px-4 py-4">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                {!isAddProductOpen ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center gap-2"
                    onClick={() => {
                      setIsAddProductOpen(true);
                      window.requestAnimationFrame(() => {
                        catalogSearchInputRef.current?.focus();
                      });
                    }}
                  >
                    <Plus className="size-4" />
                    Add Product To This Vendor
                  </Button>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Add Product To This Vendor</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Search live products and link them to this vendor from here.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAddProductOpen(false);
                          setCatalogSearch('');
                          setCatalogResults([]);
                          setSelectedCatalogProduct(null);
                          setAssignVendorProductName('');
                          setAssignVendorPrice('');
                        }}
                      >
                        Close
                      </Button>
                    </div>

                    <div className="relative mt-3">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        ref={catalogSearchInputRef}
                        value={catalogSearch}
                        onChange={(event) => setCatalogSearch(event.target.value)}
                        placeholder="Search live products to add"
                        className="pl-9"
                      />
                    </div>

                    {catalogSearch.trim().length >= 2 ? (
                      <div className="mt-3 rounded-lg border border-border bg-background">
                        {catalogLoading ? (
                          <div className="flex items-center justify-center px-3 py-4 text-sm text-muted-foreground">
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Searching products...
                          </div>
                        ) : catalogResults.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-muted-foreground">No live products matched your search.</div>
                        ) : (
                          catalogResults.map((product) => {
                            const primaryImage = getPrimaryProductImage(product);
                            const isSelected = selectedCatalogProduct?._id === product._id;

                            return (
                              <button
                                key={product._id}
                                type="button"
                                onClick={() => {
                                  setSelectedCatalogProduct(product);
                                  setAssignVendorProductName(product.vendorEntry?.vendorProductName || '');
                                  setAssignVendorPrice(
                                    product.vendorEntry?.vendorPrice === null || product.vendorEntry?.vendorPrice === undefined
                                      ? ''
                                      : String(product.vendorEntry.vendorPrice)
                                  );
                                }}
                                className={`flex w-full items-center gap-3 border-b border-border/70 px-3 py-3 text-left transition-colors last:border-b-0 ${
                                  isSelected ? 'bg-muted/60' : 'hover:bg-muted/40'
                                }`}
                              >
                                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                                  {primaryImage?.url ? (
                                    <Image
                                      src={primaryImage.url}
                                      alt={product.Name}
                                      fill
                                      sizes="48px"
                                      className="object-cover"
                                      {...getBlurPlaceholderProps(primaryImage.blurDataURL)}
                                    />
                                  ) : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">{product.Name}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {product.alreadyLinked ? 'Already linked. Select to update details.' : 'Live product'}
                                  </p>
                                </div>
                                {product.alreadyLinked ? <Check className="size-4 text-foreground" /> : null}
                              </button>
                            );
                          })
                        )}
                      </div>
                    ) : null}

                    {selectedCatalogProduct ? (
                      <div className="mt-3 grid gap-3 rounded-lg border border-border bg-background p-3">
                        <p className="text-sm font-medium text-foreground">{selectedCatalogProduct.Name}</p>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                          <Input
                            value={assignVendorProductName}
                            onChange={(event) => setAssignVendorProductName(event.target.value)}
                            placeholder="Vendor product name"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={assignVendorPrice}
                            onChange={(event) => setAssignVendorPrice(event.target.value)}
                            placeholder="Purchase price"
                          />
                          <Button
                            type="button"
                            disabled={assigningProductId === selectedCatalogProduct._id}
                            onClick={handleAssignProduct}
                          >
                            {assigningProductId === selectedCatalogProduct._id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : null}
                            {selectedCatalogProduct.vendorEntry ? 'Update Link' : 'Add Product'}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search linked products"
                  className="pl-9"
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col">
            {!activeVendor ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Pick a vendor to inspect linked products.
              </div>
            ) : loadingProducts ? (
              <div className="flex items-center justify-center px-4 py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading products...
              </div>
            ) : filteredVendorProducts.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {productSearch.trim()
                  ? 'No linked products matched your search.'
                  : 'No products are linked to this vendor yet.'}
              </div>
            ) : (
              filteredVendorProducts.map((product) => {
                const primaryImage = getPrimaryProductImage(product);
                const isEditing = editingLinkedProductId === product._id;
                const vendorEntry =
                  product.vendorEntry ||
                  (Array.isArray(product.vendors)
                    ? product.vendors.find(
                        (vendor) =>
                          String(vendor.vendorId || '') === String(activeVendorId) ||
                          String(vendor.name || '').trim().toLowerCase() ===
                            String(activeVendor?.name || '').trim().toLowerCase()
                      )
                    : null) ||
                  {};

                return (
                  <div key={product._id} className="border-b border-border/70 px-4 py-3 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          {primaryImage?.url ? (
                            <Image
                              src={primaryImage.url}
                              alt={product.Name}
                              fill
                              sizes="56px"
                              className="object-cover"
                              {...getBlurPlaceholderProps(primaryImage.blurDataURL)}
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{product.Name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {product.showOnStore ? 'Live' : 'Draft'} - {product.StockStatus}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <p className="truncate text-sm text-foreground">
                              {vendorEntry.vendorProductName || 'Vendor product name not added'}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleCopy(vendorEntry.vendorProductName, 'Vendor product name')}
                            >
                              <Copy className="size-4" />
                            </Button>
                          </div>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {vendorEntry.vendorPrice != null
                              ? `Rs. ${Number(vendorEntry.vendorPrice).toLocaleString('en-PK')}`
                              : 'Purchase price not added'}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() =>
                                  setEditingLinkedProductId((current) => (current === product._id ? '' : product._id))
                                }
                              >
                                <Pencil className="mr-2 size-4" />
                                {isEditing ? 'Close Edit' : 'Edit'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCopy(vendorEntry.vendorProductName, 'Vendor product name')}
                              >
                                <Copy className="mr-2 size-4" />
                                Copy Name
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href={`/admin/products/edit/${product._id}`} className="flex w-full items-center">
                                  <Package className="mr-2 size-4" />
                                  Open Product
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                disabled={removingLinkedProductId === product._id}
                                onClick={() =>
                                  setConfirmState({
                                    open: true,
                                    title: 'Remove product from vendor?',
                                    description: `Remove "${product.Name}" from this vendor?`,
                                    actionLabel: 'Remove',
                                    intent: 'destructive',
                                    payload: {
                                      type: 'remove-linked-product',
                                      productId: product._id,
                                      productName: product.Name,
                                    },
                                  })
                                }
                              >
                                {removingLinkedProductId === product._id ? (
                                  <Loader2 className="mr-2 size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 size-4" />
                                )}
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
                        <Input
                          value={linkedProductDrafts[product._id]?.vendorProductName ?? vendorEntry.vendorProductName ?? ''}
                          onChange={(event) => updateLinkedDraft(product._id, 'vendorProductName', event.target.value)}
                          placeholder="Vendor product name"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={linkedProductDrafts[product._id]?.vendorPrice ?? (vendorEntry.vendorPrice ?? '')}
                          onChange={(event) => updateLinkedDraft(product._id, 'vendorPrice', event.target.value)}
                          placeholder="Purchase price"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={savingLinkedProductId === product._id}
                          onClick={() => handleSaveLinkedProduct(product._id)}
                        >
                          {savingLinkedProductId === product._id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : null}
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setEditingLinkedProductId('');
                            setLinkedProductDrafts((current) => ({
                              ...current,
                              [product._id]: {
                                vendorProductName: vendorEntry.vendorProductName || '',
                                vendorPrice:
                                  vendorEntry.vendorPrice === null || vendorEntry.vendorPrice === undefined
                                    ? ''
                                    : String(vendorEntry.vendorPrice),
                              },
                            }));
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingVendorId ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
            <DialogDescription>
              Save the vendor name and shop number here without keeping the form open on the page.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVendorSubmit} className="flex flex-col gap-4">
            <FieldGroup className="grid gap-4">
              <Field>
                <FieldLabel>Vendor Name</FieldLabel>
                <FieldContent>
                  <Input
                    value={vendorForm.name}
                    onChange={(event) => updateVendorForm('name', event.target.value)}
                    placeholder="e.g. Al Madina Crockery"
                  />
                  <FieldDescription>Required. Use the shop or stall name your team recognizes fastest.</FieldDescription>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Shop Number</FieldLabel>
                <FieldContent>
                  <Input
                    value={vendorForm.shopNumber}
                    onChange={(event) => updateVendorForm('shopNumber', event.target.value)}
                    placeholder="e.g. G-12"
                  />
                  <FieldDescription>Optional. Add the market shop number for quicker order fulfillment.</FieldDescription>
                </FieldContent>
              </Field>

              <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Phone Number</FieldLabel>
                  <FieldContent>
                    <Input
                      value={vendorForm.phone}
                      onChange={(event) => updateVendorForm('phone', event.target.value)}
                      placeholder="e.g. 0300 1234567"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>WhatsApp Number</FieldLabel>
                  <FieldContent>
                    <Input
                      value={vendorForm.whatsappNumber}
                      onChange={(event) => updateVendorForm('whatsappNumber', event.target.value)}
                      placeholder="e.g. 923001234567"
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>

              <Field>
                <FieldLabel>Email Address</FieldLabel>
                <FieldContent>
                  <Input
                    type="email"
                    value={vendorForm.email}
                    onChange={(event) => updateVendorForm('email', event.target.value)}
                    placeholder="vendor@example.com"
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Vendor Address</FieldLabel>
                <FieldContent>
                  <Input
                    value={vendorForm.address}
                    onChange={(event) => updateVendorForm('address', event.target.value)}
                    placeholder="Market, floor, lane, or stall details"
                  />
                  <FieldDescription>Optional contact details that help your team source items faster.</FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetVendorForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} size="sm" className="admin-cta-button">
                {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
                {editingVendorId ? 'Update Vendor' : 'Add Vendor'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isVendorSearchDialogOpen}
        onOpenChange={(open) => {
          setIsVendorSearchDialogOpen(open);
          if (!open) {
            setGlobalVendorSearch('');
            setGlobalVendorResults([]);
          }
        }}
      >
        <DialogContent className="w-[min(98vw,1400px)] max-w-[1400px]">
          <DialogHeader>
            <DialogTitle>Search Vendor Products</DialogTitle>
            <DialogDescription>
              Search across all vendors and instantly see linked products, vendor names, and prices.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={globalVendorSearchInputRef}
              value={globalVendorSearch}
              onChange={(event) => setGlobalVendorSearch(event.target.value)}
              placeholder="Search product, vendor, or vendor product name"
              className="pl-9"
            />
          </div>

          <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-background">
            {globalVendorSearch.trim().length < 2 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Type at least 2 letters to search vendor products.
              </div>
            ) : globalVendorSearchLoading ? (
              <div className="flex items-center justify-center px-4 py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Searching vendor products...
              </div>
            ) : globalVendorResults.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No vendor products matched your search.
              </div>
            ) : (
              globalVendorResults.map((product) => {
                const primaryImage = getPrimaryProductImage(product);

                return (
                  <div key={product._id} className="min-w-0 border-b border-border/70 px-4 py-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-muted/10 p-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          {primaryImage?.url ? (
                            <Image
                              src={primaryImage.url}
                              alt={product.Name}
                              fill
                              sizes="56px"
                              className="object-cover"
                              {...getBlurPlaceholderProps(primaryImage.blurDataURL)}
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{product.Name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {product.showOnStore ? 'Live' : 'Draft'} - {product.StockStatus}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/admin/products/edit/${product._id}`}
                        className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        Open
                      </Link>
                    </div>

                    <div className="mt-3 grid min-w-0 gap-3">
                      {Array.isArray(product.vendors) && product.vendors.length > 0 ? (
                        product.vendors.map((vendor, index) => (
                          <div
                            key={`${vendor.vendorId || vendor.name}-${index}`}
                            className="min-w-0 rounded-xl border border-border/70 bg-background px-4 py-4 shadow-sm"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Vendor {index + 1}
                              </p>
                            </div>
                            <div className="grid min-w-0 gap-3 lg:grid-cols-3">
                              <div className="min-w-0 rounded-lg bg-muted/20 px-3 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Vendor
                                </p>
                                <p className="mt-1 break-words text-sm font-medium leading-6 text-foreground">
                                  {vendor.name}
                                </p>
                              </div>
                              <div className="min-w-0 rounded-lg bg-muted/20 px-3 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Shop
                                </p>
                                <p className="mt-1 break-words text-sm leading-6 text-foreground">
                                  {vendor.shopNumber || 'Not added'}
                                </p>
                              </div>
                              <div className="min-w-0 rounded-lg bg-muted/20 px-3 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Price
                                </p>
                                <p className="mt-1 text-sm font-medium text-foreground tabular-nums">
                                  {vendor.vendorPrice != null
                                    ? `Rs. ${Number(vendor.vendorPrice).toLocaleString('en-PK')}`
                                    : 'Not added'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 min-w-0 rounded-lg bg-muted/20 px-3 py-3">
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Vendor Product
                                </p>
                                <p className="mt-1 break-words text-sm leading-6 text-foreground">
                                  {vendor.vendorProductName || 'Not added'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                          No vendors linked yet.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((current) => ({ ...current, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={handleConfirmAction}
              className={confirmState.intent === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmState.actionLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
