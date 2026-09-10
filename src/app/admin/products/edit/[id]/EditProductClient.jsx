'use client';
import Image from 'next/image';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CloudUpload, Image as ImageIcon, Loader2, Plus, PlusCircle, Share2, Trash2, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ProductCard from "@/components/ProductCard";
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import ProductRichTextEditor from '@/components/admin/ProductRichTextEditor';
import VendorAssignmentsEditor from '@/components/admin/VendorAssignmentsEditor';
import { AdminEditProductSkeleton } from '@/components/AdminDashboardSkeleton';
import { uploadImageDataUrl } from '@/lib/cloudinaryUpload';
import { getProductCategories } from '@/lib/productCategories';
import { moveProductImageToFront, normalizeProductImages } from '@/lib/productImages';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { sanitizeRichTextHtml, stripHtmlTags } from '@/lib/richText';
import { formatSeoKeywords } from '@/lib/seoKeywords';
import { cn } from '@/lib/utils';
import { PRODUCT_TAGS } from '@/lib/productTags';
import { getSiteUrl } from '@/lib/siteUrl';
import { getProductSocialShareImage } from '@/lib/cloudinaryImage';

const selectionChipClass = (selected) =>
  cn(
    'inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
    selected
    ? 'border-border bg-foreground text-background shadow-[0_12px_30px_rgba(0,0,0,0.14)]'
    : 'border-border bg-background text-muted-foreground hover:border-border hover:text-foreground',
  );

const uploadActionClass =
  'relative overflow-hidden inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export default function EditProduct({ id }) {
  const router = useRouter();

  const [Name, setName] = useState('');
  const [Description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [seoCanonicalUrl, setSeoCanonicalUrl] = useState('');
  const [seoOgTitle, setSeoOgTitle] = useState('');
  const [seoOgDescription, setSeoOgDescription] = useState('');
  const [seoOgImage, setSeoOgImage] = useState('');
  const [Price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [packOptions, setPackOptions] = useState([{ label: "1 pcs", price: "" }]);
  const [Categories, setCategories] = useState([]); // array of selected category ids
  const [vendorAssignments, setVendorAssignments] = useState([]);
  const [images, setImages] = useState([]); // Array of { url, blurDataURL, publicId, file, isNew }
  const [showOnStore, setIsLive] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isBestSelling, setIsBestSelling] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isFreeDelivery, setIsFreeDelivery] = useState(false);
  const [featuredPriority, setFeaturedPriority] = useState(0);
  const [tags, setTags] = useState([]);
  const [primaryTag, setPrimaryTag] = useState("");
  const stockStatus = 'in_stock';

  const [isDragOver, setIsDragOver] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [seoCooldownRemaining, setSeoCooldownRemaining] = useState(0);
  const seoGenerationLockRef = useRef(false);

  const [isUploadingOgImage, setIsUploadingOgImage] = useState(false);
  const [seoOgImageRatio, setSeoOgImageRatio] = useState('1.91:1');
  const [ogPreviewFit, setOgPreviewFit] = useState('cover'); // 'cover' | 'contain'
  const ogImageFileInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (type === 'error') toast.error(message);
    else toast.success(message);
  };

  const handleFreeDeliveryToggle = (checked) => {
    setIsFreeDelivery(checked);
    if (checked) {
      setTags((prev) => (prev.includes('free-shipping') ? prev : [...prev, 'free-shipping']));
      setPrimaryTag((prev) => (!prev ? 'free-shipping' : prev));
    } else {
      setTags((prev) => prev.filter((t) => t !== 'free-shipping'));
      setPrimaryTag((prev) => (prev === 'free-shipping' ? '' : prev));
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      const [categoriesRes, vendorsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/admin/vendors'),
      ]);
      const [categoriesData, vendorsData] = await Promise.all([
        categoriesRes.json(),
        vendorsRes.json(),
      ]);

      if (categoriesData.success) setAllCategories(categoriesData.data);
      if (vendorsData.success) setAllVendors(vendorsData.data);
    } catch (err) {
      console.error('Failed to fetch categories and vendors:', err);
    }
  }, []);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        if (data.success) {
          const p = data.data;
          setName(p.Name || '');
          setDescription(p.Description || '');
          setShortDescription(p.shortDescription || '');
          setSeoTitle(p.seoTitle || '');
          setSeoDescription(p.seoDescription || '');
          setSeoKeywords(p.seoKeywords || '');
          setSeoCanonicalUrl(p.seoCanonicalUrl || '');
          setSeoOgTitle(p.seoOgTitle || '');
          setSeoOgDescription(p.seoOgDescription || '');
          setSeoOgImage(p.seoOgImage || '');
          const loadedRatio = p.seoOgImageRatio === '1:1' ? '1:1' : '1.91:1';
          setSeoOgImageRatio(loadedRatio);
          setPrice(p.Price || '');
          setCompareAtPrice(p.compareAtPrice ?? '');
          setCategories(getProductCategories(p).map((category) => category._id || category.id));
          setVendorAssignments(
            Array.isArray(p.vendors)
              ? p.vendors.map((vendor) => ({
                  vendorId: vendor.vendorId || vendor._id || vendor.id,
                  vendorProductName: vendor.vendorProductName || '',
                  vendorPrice: vendor.vendorPrice ?? '',
                })).filter((vendor) => vendor.vendorId)
              : []
          );
          setPackOptions(p.packOptions?.length > 0 ? p.packOptions : [{ label: "1 pcs", price: p.Price || "" }]);
          
          const existingImages = normalizeProductImages(
            p.Images,
          ).map((image) => ({ ...image, isNew: false }));
          setImages(existingImages);
          
          setIsLive(p.showOnStore ?? false);
          setIsNewArrival(p.isNewArrival === true);
          setIsBestSelling(p.isBestSelling === true);
          setIsFeatured(p.isFeatured === true);
          setIsFreeDelivery(p.isFreeDelivery === true);
          setFeaturedPriority(p.featuredPriority || 0);
          setTags(Array.isArray(p.tags) ? p.tags : []);
          setPrimaryTag(p.primaryTag || '');
        } else {
          showToast('Product not found', 'error');
        }
      } catch (err) {
        showToast('Error loading product', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    fetchCategories();
  }, [id, fetchCategories]);

  useEffect(() => {
    if (seoCooldownRemaining <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setSeoCooldownRemaining((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [seoCooldownRemaining]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsAddingCat(true);
    try {
      let uploadedCategoryImage = '';
      let uploadedCategoryImagePublicId = '';
      let uploadedCategoryBlurDataURL = '';
      if (newCatImage) {
        const uploaded = await uploadImageDataUrl(newCatImage, 'kifayatly_categories');
        uploadedCategoryImage = uploaded.url;
        uploadedCategoryImagePublicId = uploaded.publicId;
        uploadedCategoryBlurDataURL = uploaded.blurDataURL;
      }
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          image: uploadedCategoryImage,
          imagePublicId: uploadedCategoryImagePublicId,
          blurDataURL: uploadedCategoryBlurDataURL,
          imageDataUrl: newCatImage || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Category added!', 'success');
        setNewCatName('');
        setNewCatImage('');
        setIsCategoryModalOpen(false);
        fetchCategories();
      } else {
        showToast(data.error || 'Failed to add category', 'error');
      }
    } catch {
      showToast('Error adding category', 'error');
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleCategoryImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setNewCatImage(ev.target?.result || '');
    reader.readAsDataURL(file);
  };

  const handleOgImageFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      setIsUploadingOgImage(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result;
        if (!dataUrl) return;
        try {
          const uploaded = await uploadImageDataUrl(dataUrl, 'kifayatly_social_og');
          if (uploaded?.url) {
            setSeoOgImage(uploaded.url);
            showToast('Custom social preview image uploaded successfully!', 'success');
          }
        } catch (err) {
          showToast(err.message || 'Failed to upload social image.', 'error');
        } finally {
          setIsUploadingOgImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Error reading image file.', 'error');
      setIsUploadingOgImage(false);
    } finally {
      e.target.value = null;
    }
  };

  const toggleCategory = (categoryId) => {
    setCategories(prev =>
      prev.includes(categoryId) ? prev.filter(c => c !== categoryId) : [...prev, categoryId]
    );
  };

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragOver(false); }, []);
  
  const processFiles = (filesList) => {
    const validFiles = Array.from(filesList).filter(f => f.type.startsWith('image/'));
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, { url: ev.target.result, file, isNew: true }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }, []);

  const handleFileSelect = (e) => {
    processFiles(e.target.files);
    e.target.value = null; // reset so same file can be selected again if removed
  };

  const removeImage = (indexToRemove) => {
      setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const makeImagePrimary = (indexToMove) => {
      setImages(prev => moveProductImageToFront(prev, indexToMove));
  };

  const selectedCategoryNames = allCategories
    .filter((category) => Categories.includes(category._id))
    .map((category) => category.name)
    .filter(Boolean);
  const seoCategoryLabel = selectedCategoryNames.join(', ');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Name || !Price || Categories.length === 0) {
      showToast('Name, Price and at least one Category are required.', 'error');
      return;
    }

    setSaving(true);
    
    // Upload new images to Cloudinary
    const finalImages = [];
    try {
        for (const img of images) {
            if (!img.isNew) {
                finalImages.push({
                  url: img.url,
                  blurDataURL: img.blurDataURL || '',
                  publicId: img.publicId || '',
                });
            } else {
                const uploadedImage = await uploadImageDataUrl(img.url, 'kifayatly_products');
                finalImages.push(uploadedImage);
            }
        }
    } catch (err) {
        showToast('Error uploading images: ' + err.message, 'error');
        setSaving(false);
        return;
    }

    try {
      const sanitizedDescription = sanitizeRichTextHtml(Description);
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Name,
          Description: sanitizedDescription,
          shortDescription,
          seoTitle,
          seoDescription,
          seoKeywords,
          seoCanonicalUrl,
          seoOgTitle,
          seoOgDescription,
          seoOgImage,
          seoOgImageRatio,
          Price: Number(Price),
          compareAtPrice: compareAtPrice === '' ? null : Number(compareAtPrice),
          Images: finalImages,
          Category: Categories,
          vendors: vendorAssignments,
          packOptions: packOptions.filter(p => p.label && p.price),
          showOnStore,
          isNewArrival,
          isBestSelling,
          isFeatured,
          isFreeDelivery,
          featuredPriority: Number(featuredPriority) || 0,
          tags,
          primaryTag,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Product updated successfully!', 'success');
        setTimeout(() => router.push('/admin/products'), 1500);
      } else {
        showToast(data.message || data.error || 'Failed to update product', 'error');
      }
    } catch (err) {
      showToast('Network error while saving product.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSeo = async () => {
    if (seoGenerationLockRef.current || seoCooldownRemaining > 0) {
      return;
    }

    const title = Name.trim();
    const description = stripHtmlTags(Description).trim();

    if (!title || !description) {
      showToast('Add the product name and description before generating SEO.', 'error');
      return;
    }

    seoGenerationLockRef.current = true;
    setIsGeneratingSeo(true);

    try {
      const res = await fetch('/api/admin/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category: seoCategoryLabel,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 429) {
          setSeoCooldownRemaining(60);
        }
        if (
          res.status === 502 ||
          String(data.message || '').toLowerCase().includes('interrupted') ||
          String(data.error || '').toLowerCase().includes('json')
        ) {
          throw new Error('AI was interrupted. Please try again in 5 seconds.');
        }
        throw new Error(data.message || data.error || 'Failed to generate SEO content.');
      }

      setSeoTitle(data.data.seoTitle || '');
      setSeoDescription(data.data.seoDescription || '');
      setSeoKeywords(formatSeoKeywords(data.data.seoKeywords || data.data.keywords));
      if (!data.data.seoTitle || !data.data.seoDescription || !data.data.seoKeywords) {
        throw new Error('AI was interrupted. Please try again in 5 seconds.');
      }
      showToast('SEO fields populated with AI suggestions.', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to generate SEO content.', 'error');
    } finally {
      seoGenerationLockRef.current = false;
      setIsGeneratingSeo(false);
    }
  };

  if (loading) {
    return <AdminEditProductSkeleton />;
  }

  const trimmedSeoTitle = seoTitle.trim();
  const trimmedSeoDescription = seoDescription.trim();
  const trimmedSeoKeywords = seoKeywords.trim();
  const trimmedSeoCanonicalUrl = seoCanonicalUrl.trim();
  const plainDescription = stripHtmlTags(Description);
  const compareAtPreviewValue = Number(compareAtPrice) || 0;
  const fallbackSlug = Name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const seoPreviewTitle = trimmedSeoTitle || Name || 'Product title preview';
  const seoPreviewDescription =
    trimmedSeoDescription || plainDescription || 'Add a focused product summary to improve search snippets.';
  const seoPreviewUrl =
    trimmedSeoCanonicalUrl || `${getSiteUrl()}/products/${fallbackSlug || id}`;
  const socialPreviewTitle = seoOgTitle.trim() || trimmedSeoTitle || Name || 'Product Title';
  const socialPreviewDescription =
    seoOgDescription.trim() ||
    (Price
      ? `Price: Rs. ${Number(Price).toLocaleString('en-PK')}. ${trimmedSeoDescription || plainDescription || 'Buy online from China Unique Store.'}`
      : trimmedSeoDescription || plainDescription || 'Buy online from China Unique Store.');
  const socialPreviewImage = getProductSocialShareImage(
    seoOgImage.trim() || images?.[0]?.url || '/opengraph-image.png',
    seoOgImageRatio,
    ogPreviewFit
  );
  const isSquarePreview = seoOgImageRatio === '1:1';
  const seoChecks = [
    { label: 'SEO title', complete: trimmedSeoTitle.length >= 10 },
    { label: 'Meta description', complete: trimmedSeoDescription.length >= 50 },
    { label: 'Keywords', complete: trimmedSeoKeywords.length > 0 },
  ];
  const seoCompleteCount = seoChecks.filter((item) => item.complete).length;
  const seoReady = seoCompleteCount === seoChecks.length;
  const seoButtonDisabled = isGeneratingSeo || seoCooldownRemaining > 0;
  const seoButtonLabel = isGeneratingSeo
    ? 'Generating...'
    : seoCooldownRemaining > 0
      ? `Cooling down... ${seoCooldownRemaining}s`
      : '✨ AI Auto-SEO';
  const mockProduct = {
    _id: "preview",
    slug: "preview",
    Name: Name || "Product Name",
    Price: Number(Price) || 0,
    compareAtPrice: Number(compareAtPrice) || 0,
    Images: images,
    Categories: Categories.map(id => ({ _id: id, name: allCategories?.find(c => c._id === id)?.name || "Category" })),
    StockStatus: stockStatus,
    showOnStore: showOnStore,
    primaryTag: primaryTag,
    tags: tags,
    reviewCount: 0,
    averageRating: 0,
  };

  return (
    <div className="w-full pb-20">
      <form onSubmit={handleSubmit}>
        {/* Sticky Header */}
        <div className="sticky top-4 z-50 mb-6 flex items-center justify-between rounded-xl border border-border bg-background/95 px-4 py-3 shadow-md backdrop-blur-md md:px-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/products" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted">
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Edit Product
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-1 sm:mr-2">
              <Label htmlFor="top-visibility" className="text-xs font-semibold hidden sm:inline-block">
                 {showOnStore ? 'Live' : 'Draft'}
              </Label>
              <Switch id="top-visibility" checked={showOnStore} onCheckedChange={setIsLive} />
            </div>
            <Link href="/admin/products" className="hidden sm:block">
              <Button variant="outline" size="sm" className="rounded-lg font-semibold" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={saving} size="sm" className="rounded-lg font-semibold shadow-sm">
              {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
          <div className="surface-card w-full space-y-6 rounded-xl p-4 shadow-lg md:p-8">
          {/* Product Name */}
          <div>
            <Label className="mb-2">Product Name</Label>
            <Input
              type="text"
              value={Name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 px-4"
              placeholder="e.g., Luxury Tea Set"
              required
            />
          </div>

          {/* Price */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2">Price (Rs)</Label>
              <Input
                type="number"
                value={Price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-11 px-4"
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
            <div>
              <Label className="mb-2">Compare at Price (Rs)</Label>
              <Input
                type="number"
                min="0"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className="h-11 px-4"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Categories</Label>
              <Link
                href="/admin/categories"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground transition-colors hover:text-foreground/80"
              >
                <PlusCircle className="size-3.5" /> Manage Categories
              </Link>
            </div>
            
            {/* Desktop View */}
            <div className="hidden sm:flex min-h-[52px] flex-wrap gap-2 rounded-xl border border-border bg-muted/35 p-3">

              {allCategories.length === 0 ? (
                <p className="self-center text-xs text-muted-foreground">No categories found. Add one.</p>
              ) : (
                allCategories.map((cat) => {
                  const selected = Categories.includes(cat._id);
                  return (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => toggleCategory(cat._id)}
                      className={selectionChipClass(selected)}
                    >
                      {selected && <Check className="mr-1 size-3" />}
                      {cat.name}
                    </button>
                  );
                })
              )}

            </div>

            {/* Mobile View */}
            <div className="sm:hidden">
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="categories" className="rounded-xl border border-border bg-muted/35 px-4 shadow-sm">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <span className="text-sm font-semibold">Select Categories ({Categories.length})</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1">
                    <div className="flex flex-wrap gap-2">

              {allCategories.length === 0 ? (
                <p className="self-center text-xs text-muted-foreground">No categories found. Add one.</p>
              ) : (
                allCategories.map((cat) => {
                  const selected = Categories.includes(cat._id);
                  return (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => toggleCategory(cat._id)}
                      className={selectionChipClass(selected)}
                    >
                      {selected && <Check className="mr-1 size-3" />}
                      {cat.name}
                    </button>
                  );
                })
              )}

                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {Categories.length === 0 && (
              <p className="mt-1 text-xs text-destructive/80">
                Please select at least one category.
              </p>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
                <Label>Product Images</Label>
                <div className={uploadActionClass}>
                    <PlusCircle className="size-3.5" /> Add More Images
                    <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {images.map((img, idx) => (
                    <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/40">
                        <Image
                          src={img.url}
                          alt="Preview"
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover"
                          {...getBlurPlaceholderProps(img.blurDataURL)}
                        />
                        <button 
                            type="button" 
                            onClick={() => removeImage(idx)} 
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background/95 text-destructive shadow-sm opacity-0 transition-all hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                        >
                            <Trash2 className="size-3.5" />
                        </button>
                        {idx !== 0 ? (
                          <button
                            type="button"
                            onClick={() => makeImagePrimary(idx)}
                            className="absolute bottom-2 left-2 rounded-md border border-border bg-background/95 px-2 py-1 text-[10px] font-bold text-foreground shadow-sm opacity-0 transition-all hover:border-border hover:bg-muted group-hover:opacity-100"
                          >
                            Set Main
                          </button>
                        ) : null}
                        {idx === 0 ? <span className="absolute bottom-2 left-2 rounded-md bg-foreground/80 px-2 py-0.5 text-[10px] font-bold text-background shadow-sm">Main Image</span> : null}
                    </div>
                ))}
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200',
                isDragOver
                  ? 'border-border bg-muted/60'
                  : 'border-border bg-muted/20 hover:border-border hover:bg-muted/35',
              )}
            >
              <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
                  <CloudUpload className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Drag & Drop Images Here</p>
                  <p className="text-xs text-muted-foreground">or click to browse multiple files</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">PNG, JPG up to 10MB each</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Use &quot;Set Main&quot; on a preview to move it to the first slot.</p>
                </div>
              </div>
            </div>
          </div>

          <Accordion type="multiple" className="w-full space-y-4">
                    
          <AccordionItem value="pack" className="rounded-xl border border-border bg-background shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">Pack Variations</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5">Define different pack sizes and their prices.</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="pt-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Pack Variations</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Define different pack sizes and their prices. Leave empty if not applicable.
              </p>
            </div>
            {packOptions.map((pack, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={pack.label}
                    onChange={(e) => {
                      const newOptions = [...packOptions];
                      newOptions[index].label = e.target.value;
                      setPackOptions(newOptions);
                    }}
                    className="h-11 px-4"
                    placeholder="e.g., Pack of 5"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    value={pack.price}
                    onChange={(e) => {
                      const newOptions = [...packOptions];
                      newOptions[index].price = e.target.value;
                      setPackOptions(newOptions);
                    }}
                    className="h-11 px-4"
                    placeholder="Price (Rs)"
                    step="0.01"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-lg text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setPackOptions(packOptions.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setPackOptions([...packOptions, { label: "", price: "" }])}
              className="w-full rounded-xl border-dashed"
            >
              <PlusCircle className="mr-2 size-4" />
              Add More Pack Option
            </Button>
          </div>
            </AccordionContent>
          </AccordionItem>

          
          <AccordionItem value="short-description" className="rounded-xl border border-border bg-background shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">Short Description</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5">A brief summary displayed right below the price.</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div>
            <Label className="mb-2">Short Description</Label>
            <ProductRichTextEditor
              value={shortDescription}
              onChange={setShortDescription}
              placeholder="A brief summary displayed right below the price on the product page..."
            />
          </div>
            </AccordionContent>
          </AccordionItem>



          
          <AccordionItem value="vendor" className="rounded-xl border border-border bg-background shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">Vendor Assignments</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5">Assign this product to specific vendors and storefronts.</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="pt-2">
            <VendorAssignmentsEditor
              vendors={allVendors}
              value={vendorAssignments}
              onChange={setVendorAssignments}
            />
          </div>
            </AccordionContent>
          </AccordionItem>


          <AccordionItem value="marketing" className="rounded-xl border border-border bg-background shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">Marketing Flags & Badges</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5">Set product as New Arrival, Best Selling, and configure badges.</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
                        {/* Marketing Flags */}
          <div className="pt-2">
            <p className="text-sm font-semibold text-foreground">Marketing Flags</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-4 sm:border-0 sm:pb-0">
                <Label className="text-xs text-muted-foreground mr-2 cursor-pointer" htmlFor="toggle-featured">Featured (Ads)</Label>
                <Switch id="toggle-featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-4 sm:border-0 sm:pb-0">
                <Label className="text-xs text-muted-foreground mr-2 cursor-pointer" htmlFor="toggle-new">New Arrival</Label>
                <Switch id="toggle-new" checked={isNewArrival} onCheckedChange={setIsNewArrival} />
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-4 sm:border-0 sm:pb-0">
                <Label className="text-xs text-muted-foreground mr-2 cursor-pointer" htmlFor="toggle-best">Best Selling</Label>
                <Switch id="toggle-best" checked={isBestSelling} onCheckedChange={setIsBestSelling} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground mr-2 cursor-pointer" htmlFor="toggle-free-marketing-edit">Free Delivery</Label>
                <Switch 
                  id="toggle-free-marketing-edit" 
                  checked={isFreeDelivery} 
                  onCheckedChange={handleFreeDeliveryToggle} 
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-border/50">
              <p className="text-sm font-semibold text-foreground mb-1">Main Picture Badge (Home Page)</p>
              <p className="text-xs text-muted-foreground mb-3">Select one icon to display over the product image on the home page.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPrimaryTag("")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                    primaryTag === ""
                      ? `border-border bg-foreground text-background shadow-sm`
                      : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted"
                  )}
                >
                  None
                </button>
                {PRODUCT_TAGS.map((tag) => {
                  const isSelected = primaryTag === tag.id;
                  const Icon = tag.icon;
                  return (
                    <button
                      key={`primary-${tag.id}`}
                      type="button"
                      onClick={() => setPrimaryTag(tag.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                        isSelected
                          ? `border-border ${tag.bgColor} ${tag.color} shadow-sm`
                          : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted"
                      )}
                    >
                      <Icon className="size-3.5" />
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <p className="text-sm font-semibold text-foreground mb-1">Detail Page Badges</p>
              <p className="text-xs text-muted-foreground mb-3">Select multiple tags to display below the product name.</p>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_TAGS.map((tag) => {
                  const isSelected = tags.includes(tag.id);
                  const Icon = tag.icon;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setTags((prev) =>
                          prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]
                        );
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                        isSelected
                          ? `border-border ${tag.bgColor} ${tag.color} shadow-sm`
                          : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted"
                      )}
                    >
                      <Icon className="size-3.5" />
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
            </AccordionContent>
          </AccordionItem>




          <AccordionItem value="description" className="rounded-xl border border-border bg-background shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">Product Description</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5">Add formatted text, images, and HTML for the main product details.</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
                        {/* Description */}
          <div>
            <Label className="mb-2">Description</Label>
            <ProductRichTextEditor
              value={Description}
              onChange={setDescription}
              placeholder="Create a polished product description with formatting, images, videos, and HTML."
            />
          </div>
            </AccordionContent>
          </AccordionItem>

          
          <AccordionItem value="seo" className="rounded-xl border border-border bg-background shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">SEO & Metadata</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5">Optimize search titles, descriptions, and keywords.</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="pt-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-foreground">SEO & Metadata</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  These fields power the product page title, description, canonical URL, and schema markup.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={seoButtonDisabled}
                    onClick={handleGenerateSeo}
                    className="rounded-full shadow-sm"
                  >
                    {isGeneratingSeo ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        {seoButtonLabel}
                      </>
                    ) : (
                      seoButtonLabel
                    )}
                  </Button>
                  {seoCooldownRemaining > 0 ? (
                    <p className="text-[10px] text-muted-foreground">
                      Rate limited. Try again in {seoCooldownRemaining}s.
                    </p>
                  ) : null}
                </div>
                <div
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[11px] sm:text-xs font-semibold',
                    seoReady
                      ? 'border-border bg-muted text-foreground'
                      : 'border-border bg-muted/60 text-foreground',
                  )}
                >
                  <Check className="size-3.5 text-foreground" />
                  {seoReady ? 'SEO basics complete' : `${seoCompleteCount}/${seoChecks.length} SEO basics complete`}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <Label className="mb-2">SEO Title</Label>
                <Input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="h-11 px-4"
                  placeholder="Custom search title for this product"
                  maxLength={70}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">{seoTitle.length}/70 characters</p>
              </div>

              <div>
                <Label className="mb-2">Meta Description</Label>
                <Textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  className="min-h-24 resize-none px-4 py-3"
                  placeholder="Short product summary for search engines and social previews"
                  rows="3"
                  maxLength={320}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">{seoDescription.length}/320 characters</p>
              </div>

              <div>
                <Label className="mb-2">Keywords</Label>
                <Input
                  type="text"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(formatSeoKeywords(e.target.value))}
                  className="h-11 px-4"
                  placeholder="e.g., tea set, chinese tea cups, luxury gift"
                />
              </div>

              <div>
                <Label className="mb-2">Canonical URL</Label>
                <Input
                  type="url"
                  value={seoCanonicalUrl}
                  onChange={(e) => setSeoCanonicalUrl(e.target.value)}
                  className="h-11 px-4"
                  placeholder="https://www.chinauniquestore.com/products/your-product"
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="min-w-0 rounded-xl border border-border bg-background p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Search Preview</p>
                <div className="mt-3 space-y-2">
                  <p className="line-clamp-2 text-base font-semibold leading-snug text-foreground">{seoPreviewTitle}</p>
                  <p className="break-all text-[11px] text-muted-foreground/80 md:text-xs">{seoPreviewUrl}</p>
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{seoPreviewDescription}</p>
                </div>
              </div>

              <div className="min-w-0 rounded-xl border border-border bg-background p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Completion Check</p>
                <div className="mt-3 space-y-2">
                  {seoChecks.map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        'flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium',
                        item.complete
                        ? 'border-border bg-muted text-foreground'
                          : 'border-border bg-muted/40 text-muted-foreground',
                      )}
                    >
                      <span>{item.label}</span>
                      <span className="inline-flex items-center gap-1">
                        <Check className={cn('size-3.5', item.complete ? 'opacity-100' : 'opacity-30')} />
                        {item.complete ? 'Ready' : 'Missing'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Social Share & OpenGraph Controls */}
            <div className="mt-8 pt-6 border-t border-border space-y-4">
              <div className="flex items-center gap-2">
                <Share2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">Social Share & OpenGraph (WhatsApp, Facebook & Twitter)</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Customize the headline, description, and preview image that appear when this product link is shared on WhatsApp, Facebook, Instagram, and Twitter.
              </p>

              <div className="grid gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>OG / Social Title</Label>
                    <span className="text-[11px] text-muted-foreground">Optional (Defaults to SEO Title)</span>
                  </div>
                  <Input
                    type="text"
                    value={seoOgTitle}
                    onChange={(e) => setSeoOgTitle(e.target.value)}
                    className="h-11 px-4"
                    placeholder="e.g., 🔥 50% OFF - Multifunctional Yogurt Filter with Strainer"
                    maxLength={100}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{seoOgTitle.length}/100 characters</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>OG / Social Description</Label>
                    <span className="text-[11px] text-muted-foreground">Optional (Defaults to Price & Meta Description)</span>
                  </div>
                  <Textarea
                    value={seoOgDescription}
                    onChange={(e) => setSeoOgDescription(e.target.value)}
                    className="min-h-20 resize-none px-4 py-2.5"
                    placeholder="e.g., Premium Greek yogurt strainer & whey separator box. Fast cash on delivery all across Pakistan. Click to order now!"
                    rows="2"
                    maxLength={350}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{seoOgDescription.length}/350 characters</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>OG / Social Image</Label>
                    <span className="text-[11px] text-muted-foreground">Upload custom banner or select from photos</span>
                  </div>

                  {/* Upload button & Quick Pickers */}
                  <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <input
                        ref={ogImageFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleOgImageFileSelect}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isUploadingOgImage}
                        onClick={() => ogImageFileInputRef.current?.click()}
                        className="rounded-lg shadow-sm text-xs font-semibold gap-2 border border-border"
                      >
                        {isUploadingOgImage ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Uploading Image...
                          </>
                        ) : (
                          <>
                            <CloudUpload className="size-3.5 text-emerald-600" />
                            Upload Custom Social Image
                          </>
                        )}
                      </Button>

                      {seoOgImage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSeoOgImage("")}
                          className="text-xs text-muted-foreground hover:text-foreground h-8"
                        >
                          Reset to 1st Product Photo
                        </Button>
                      )}
                    </div>

                    {images.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Or pick from uploaded product photos:</p>
                        <div className="flex flex-wrap gap-2">
                          {images.map((img, idx) => {
                            const isSelected = (seoOgImage ? seoOgImage === img.url : idx === 0);
                            return (
                              <button
                                key={img.url || idx}
                                type="button"
                                onClick={() => setSeoOgImage(img.url)}
                                className={cn(
                                  "relative size-12 rounded-lg overflow-hidden border-2 transition-all p-0.5 bg-background",
                                  isSelected
                                    ? "border-emerald-600 ring-2 ring-emerald-600/30 scale-105"
                                    : "border-border hover:border-muted-foreground/50 opacity-70 hover:opacity-100"
                                )}
                                title={isSelected ? "Active Social Image" : `Use Photo #${idx + 1}`}
                              >
                                <img src={img.url} alt={`Photo ${idx + 1}`} className="size-full object-cover rounded" />
                                {isSelected && (
                                  <span className="absolute bottom-0 right-0 bg-emerald-600 text-white rounded-tl-sm p-0.5">
                                    <Check className="size-2.5" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <Input
                        type="url"
                        value={seoOgImage}
                        onChange={(e) => setSeoOgImage(e.target.value)}
                        className="h-9 px-3 text-xs font-mono bg-background"
                        placeholder="Or paste Cloudinary image URL directly..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live WhatsApp / Social Card Preview */}
              <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
                    <Share2 className="size-3.5 text-emerald-600" />
                    Live Social Share Card Preview (WhatsApp / Facebook)
                  </p>
                  
                  {/* Preview Controls */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                      <button
                        type="button"
                        onClick={() => setOgPreviewFit('cover')}
                        className={cn(
                          "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                          ogPreviewFit === 'cover' ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Edge-to-edge fill (No white borders)"
                      >
                        Full Cover (No Borders)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOgPreviewFit('contain')}
                        className={cn(
                          "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                          ogPreviewFit === 'contain' ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Padded canvas for transparent PNGs"
                      >
                        Padded Canvas (For PNGs)
                      </button>
                    </div>

                    <div className="inline-flex rounded-lg border border-border bg-background p-0.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setSeoOgImageRatio('1.91:1')}
                        className={cn(
                          "px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                          seoOgImageRatio === '1.91:1' ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="1.91:1 Landscape Banner (1200 × 630 px)"
                      >
                        1.91:1
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeoOgImageRatio('1:1')}
                        className={cn(
                          "px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                          seoOgImageRatio === '1:1' ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="1:1 Square Card (1080 × 1080 px)"
                      >
                        1:1
                      </button>
                    </div>
                  </div>
                </div>

                <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-emerald-950/20 dark:border-emerald-900/50 shadow-md bg-[#0b2b24] text-white">
                  <div
                    className={cn(
                    "relative w-full overflow-hidden border-b border-emerald-900/20",
                    isSquarePreview ? "aspect-square" : "aspect-[1.91/1]",
                    ogPreviewFit === 'contain' ? "bg-white p-3 flex items-center justify-center" : "bg-neutral-900"
                  )}
                    style={{ aspectRatio: isSquarePreview ? '1 / 1' : '1.91 / 1' }}
                  >
                    {socialPreviewImage ? (
                      <img
                        src={socialPreviewImage}
                        alt={socialPreviewTitle}
                        className={cn(
                          "size-full",
                          ogPreviewFit === 'cover' ? "object-cover" : "object-contain max-h-full max-w-full"
                        )}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground py-10">
                        <ImageIcon className="size-8 opacity-40" />
                        <span className="text-xs mt-1">No Image Available</span>
                      </div>
                    )}
                    <span className="absolute top-2 right-2 rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white/90">
                      {isSquarePreview ? '1080 × 1080' : '1200 × 630'}
                    </span>
                  </div>
                  <div className="p-3 space-y-1 bg-[#0b2b24]">
                    <p className="font-semibold text-sm line-clamp-2 text-white leading-snug">
                      {socialPreviewTitle}
                    </p>
                    <p className="text-xs line-clamp-3 text-emerald-100/80 leading-relaxed">
                      {socialPreviewDescription}
                    </p>
                    <div className="pt-2 mt-1 border-t border-emerald-800/40 flex items-center justify-between text-[11px] text-emerald-300/80">
                      <span>chinauniquestore.com</span>
                      <span className="font-medium text-emerald-400">China Unique Store</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
            </AccordionContent>
          </AccordionItem>
          </Accordion>



          </div>

          {/* Right Column: Live PC Preview */}
          <div className="hidden lg:block sticky top-28">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Live PC Preview</p>
            <ProductCard product={mockProduct} className="pointer-events-none" isPreviewMode={true} />
          </div>
        </div>
      </form>
    </div>
  );
}
