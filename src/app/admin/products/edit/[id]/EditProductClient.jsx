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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import ProductRichTextEditor from '@/components/admin/ProductRichTextEditor';
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
import { getProductRating } from '@/lib/productReviewUtils';

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
  const [customReviewCount, setCustomReviewCount] = useState('');
  const [rating, setRating] = useState('4.6');
  const [metalType, setMetalType] = useState('');
  const [purity, setPurity] = useState('');
  const [plating, setPlating] = useState('');
  const [grossWeightGrams, setGrossWeightGrams] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [size, setSize] = useState('');
  const [availableSizes, setAvailableSizes] = useState('');
  const [availableColors, setAvailableColors] = useState('');
  const [gemstoneType, setGemstoneType] = useState('');
  const [gemstoneCarat, setGemstoneCarat] = useState('');
  const [gemstoneCut, setGemstoneCut] = useState('');
  const [gemstoneClarity, setGemstoneClarity] = useState('');
  const [gemstoneColor, setGemstoneColor] = useState('');
  const [isUnlimitedStock, setIsUnlimitedStock] = useState(false);
  const [stockQuantity, setStockQuantity] = useState('10');
  const [stockStatus, setStockStatus] = useState('In Stock');
  const [Categories, setCategories] = useState([]); // array of selected category ids
  const [images, setImages] = useState([]); // Array of { url, blurDataURL, publicId, file, isNew }
  const [showOnStore, setIsLive] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isBestSelling, setIsBestSelling] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredPriority, setFeaturedPriority] = useState(0);
  const [tags, setTags] = useState([]);
  const [primaryTag, setPrimaryTag] = useState("");

  const [isDragOver, setIsDragOver] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
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

  const fetchCategories = useCallback(async () => {
    try {
      const categoriesRes = await fetch('/api/categories');
      const categoriesData = await categoriesRes.json();
      if (categoriesData.success) setAllCategories(categoriesData.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
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
          setCustomReviewCount(p.customReviewCount ?? '');
          setRating(String(getProductRating(p)));
          setMetalType(p.metalType || '');
          setPurity(p.purity || '');
          setPlating(p.plating || '');
          setGrossWeightGrams(p.grossWeightGrams ?? '');
          setCertificateNumber(p.certificateNumber || '');
          setSize(p.size || '');
          setAvailableSizes(Array.isArray(p.availableSizes) ? p.availableSizes.join(', ') : (p.availableSizes || ''));
          setAvailableColors(Array.isArray(p.availableColors) ? p.availableColors.join(', ') : (p.availableColors || ''));
          setGemstoneType(p.gemstone?.gemstoneType || '');
          setGemstoneCarat(p.gemstone?.carat ?? '');
          setGemstoneCut(p.gemstone?.cut || '');
          setGemstoneClarity(p.gemstone?.clarity || '');
          setGemstoneColor(p.gemstone?.color || '');
          setIsUnlimitedStock(p.isUnlimitedStock === true);
          setStockQuantity(String(p.stockQuantity ?? 10));
          setStockStatus(p.StockStatus || 'In Stock');
          setCategories(getProductCategories(p).map((category) => category._id || category.id));
          
          const existingImages = normalizeProductImages(
            p.Images,
          ).map((image) => ({ ...image, isNew: false }));
          setImages(existingImages);
          
          setIsLive(p.showOnStore ?? false);
          setIsNewArrival(p.isNewArrival === true);
          setIsBestSelling(p.isBestSelling === true);
          setIsFeatured(p.isFeatured === true);
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
        const uploaded = await uploadImageDataUrl(newCatImage, 'ornaments_categories');
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
          const uploaded = await uploadImageDataUrl(dataUrl, 'ornaments_social_og');
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
                const uploadedImage = await uploadImageDataUrl(img.url, 'ornaments_products');
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
          customReviewCount: customReviewCount === '' ? null : Number(customReviewCount),
          rating: rating === '' ? null : Number(rating),
          Images: finalImages,
          Category: Categories,
          metalType,
          purity,
          plating,
          isUnlimitedStock,
          stockQuantity: isUnlimitedStock ? 9999 : (Number(stockQuantity) || 0),
          StockStatus: isUnlimitedStock ? 'In Stock' : stockStatus,
          grossWeightGrams: grossWeightGrams === '' ? null : Number(grossWeightGrams),
          certificateNumber,
          size,
          availableSizes: availableSizes ? availableSizes.split(',').map(s => s.trim()).filter(Boolean) : [],
          availableColors: availableColors ? availableColors.split(',').map(s => s.trim()).filter(Boolean) : [],
          gemstone: {
            gemstoneType,
            carat: gemstoneCarat === '' ? null : Number(gemstoneCarat),
            cut: gemstoneCut,
            clarity: gemstoneClarity,
            color: gemstoneColor,
          },
          showOnStore,
          isNewArrival,
          isBestSelling,
          isFeatured,
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
      ? `Price: Rs. ${Number(Price).toLocaleString('en-PK')}. ${trimmedSeoDescription || plainDescription || 'Buy online from Ornaments by Arshad.'}`
      : trimmedSeoDescription || plainDescription || 'Buy online from Ornaments by Arshad.');
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

          {/* Price, Reviews & Stock */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="mb-2 text-xs font-semibold">Price (Rs) *</Label>
              <Input
                type="number"
                value={Price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-10 px-3 text-xs"
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
            <div>
              <Label className="mb-2 text-xs font-semibold">Compare at Price (Rs)</Label>
              <Input
                type="number"
                min="0"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className="h-10 px-3 text-xs"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <Label className="mb-2 text-xs font-semibold">Rating (1.0–5.0)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="h-10 px-3 text-xs"
                placeholder="4.8"
              />
            </div>
            <div>
              <Label className="mb-2 text-xs font-semibold">Reviews Count</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={customReviewCount}
                onChange={(e) => setCustomReviewCount(e.target.value)}
                className="h-10 px-3 text-xs"
                placeholder="e.g. 15"
              />
            </div>
          </div>

          {/* Stock & Availability Card */}
          <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <Label className="text-sm font-semibold text-foreground">Stock & Availability</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="toggle-unlimited-stock" className="text-xs font-semibold cursor-pointer">
                  Unlimited Stock (Made to order)
                </Label>
                <Switch
                  id="toggle-unlimited-stock"
                  checked={isUnlimitedStock}
                  onCheckedChange={setIsUnlimitedStock}
                />
              </div>
            </div>

            {isUnlimitedStock ? (
              <div className="mt-3 flex items-center gap-2.5 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground">
                  <Check className="size-3.5" />
                </div>
                <span>Unlimited Stock active — product remains &quot;In Stock&quot; and available for immediate ordering.</span>
              </div>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 text-xs">Stock Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="h-10 px-3 text-xs"
                    placeholder="e.g., 10"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs">Stock Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStockStatus('In Stock')}
                      className={cn(
                        "h-10 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                        stockStatus === 'In Stock'
                          ? "bg-foreground text-background border-border"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      In Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockStatus('Out of Stock')}
                      className={cn(
                        "h-10 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                        stockStatus === 'Out of Stock'
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Out of Stock
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                  <p className="text-xs text-muted-foreground">or click to browse multiple files (PNG, JPG up to 10MB)</p>
                </div>
              </div>
            </div>
          </div>
          <Accordion type="multiple" defaultValue={["jewelry-specs"]} className="w-full space-y-4">
                    
          {/* 1. Jewelry Specifications */}
          <AccordionItem value="jewelry-specs" className="rounded-xl border border-border bg-background shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">Jewelry Specifications</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5">Metal, plating, gemstones, weight, sizing, and hallmarking.</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-4 pt-1">
                {/* Metal Selection & Purity */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 font-semibold text-xs">Metal Category</Label>
                    <div className="flex gap-2">
                      <Select
                        value={metalType || ""}
                        onValueChange={(val) => setMetalType(val)}
                      >
                        <SelectTrigger className="h-10 text-xs w-[140px] sm:w-[160px] shrink-0 bg-background">
                          <SelectValue placeholder="Pick Metal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Gold</SelectLabel>
                            <SelectItem value="24K Pure Gold">24K Pure Gold</SelectItem>
                            <SelectItem value="22K Gold">22K Gold</SelectItem>
                            <SelectItem value="18K Yellow Gold">18K Yellow Gold</SelectItem>
                            <SelectItem value="18K White Gold">18K White Gold</SelectItem>
                            <SelectItem value="18K Rose Gold">18K Rose Gold</SelectItem>
                            <SelectItem value="14K Gold">14K Gold</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Silver</SelectLabel>
                            <SelectItem value="925 Sterling Silver">925 Sterling Silver</SelectItem>
                            <SelectItem value="Pure Silver">Pure Silver</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Artificial & Fashion</SelectLabel>
                            <SelectItem value="Artificial / Alloy">Artificial / Alloy</SelectItem>
                            <SelectItem value="Brass">Brass</SelectItem>
                            <SelectItem value="Copper">Copper</SelectItem>
                            <SelectItem value="Kundan">Kundan</SelectItem>
                            <SelectItem value="Stainless Steel">Stainless Steel</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        value={metalType}
                        onChange={(e) => setMetalType(e.target.value)}
                        className="h-10 px-3 text-xs flex-1"
                        placeholder="e.g. 22K Gold, 925 Silver"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5 font-semibold text-xs">Gold Purity / Karat</Label>
                    <div className="flex gap-2">
                      <Select
                        value={purity || ""}
                        onValueChange={(val) => setPurity(val)}
                      >
                        <SelectTrigger className="h-10 text-xs w-[140px] sm:w-[160px] shrink-0 bg-background">
                          <SelectValue placeholder="Pick Karat" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24K (99.9%)">24K (99.9%)</SelectItem>
                          <SelectItem value="22K (91.6%)">22K (91.6%)</SelectItem>
                          <SelectItem value="21K (87.5%)">21K (87.5%)</SelectItem>
                          <SelectItem value="18K (75.0%)">18K (75.0%)</SelectItem>
                          <SelectItem value="14K (58.5%)">14K (58.5%)</SelectItem>
                          <SelectItem value="925 Silver">925 Silver</SelectItem>
                          <SelectItem value="Platinum 950">Platinum 950</SelectItem>
                          <SelectItem value="Artificial (No Karat)">Artificial (No Karat)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        value={purity}
                        onChange={(e) => setPurity(e.target.value)}
                        className="h-10 px-3 text-xs flex-1"
                        placeholder="e.g. 22K, 925 Silver"
                      />
                    </div>
                  </div>
                </div>

                {/* Plating & Gross Weight */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 font-semibold text-xs">Plating / Polish</Label>
                    <div className="flex gap-2">
                      <Select
                        value={plating || ""}
                        onValueChange={(val) => setPlating(val)}
                      >
                        <SelectTrigger className="h-10 text-xs w-[140px] sm:w-[160px] shrink-0 bg-background">
                          <SelectValue placeholder="Pick Plating" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Gold Plating">Gold Plating</SelectItem>
                          <SelectItem value="18K Micron Gold Plating">18K Micron Gold Plating</SelectItem>
                          <SelectItem value="Silver Plating">Silver Plating</SelectItem>
                          <SelectItem value="Rose Gold Plating">Rose Gold Plating</SelectItem>
                          <SelectItem value="Rhodium Plating">Rhodium Plating</SelectItem>
                          <SelectItem value="Antique Polish">Antique Polish</SelectItem>
                          <SelectItem value="High Polish">High Polish</SelectItem>
                          <SelectItem value="None / Plain">None / Plain</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        value={plating}
                        onChange={(e) => setPlating(e.target.value)}
                        className="h-10 px-3 text-xs flex-1"
                        placeholder="e.g. 18K Micron Gold Plating"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5 font-semibold text-xs">Gross Weight (Grams)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={grossWeightGrams}
                      onChange={(e) => setGrossWeightGrams(e.target.value)}
                      className="h-10 px-3 text-xs"
                      placeholder="e.g., 12.5"
                    />
                  </div>
                </div>

                {/* Default Size & Certificate/Hallmark */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 font-semibold text-xs">Default Size / Length</Label>
                    <div className="flex gap-2">
                      <Select
                        value={size || ""}
                        onValueChange={(val) => setSize(val)}
                      >
                        <SelectTrigger className="h-10 text-xs w-[140px] sm:w-[160px] shrink-0 bg-background">
                          <SelectValue placeholder="Pick Size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Free Size">Free Size</SelectItem>
                          <SelectItem value="Adjustable">Adjustable</SelectItem>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectGroup>
                            <SelectLabel>Ring Sizes</SelectLabel>
                            <SelectItem value="US 5">US 5</SelectItem>
                            <SelectItem value="US 6">US 6</SelectItem>
                            <SelectItem value="US 7">US 7</SelectItem>
                            <SelectItem value="US 8">US 8</SelectItem>
                            <SelectItem value="US 9">US 9</SelectItem>
                            <SelectItem value="US 10">US 10</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Necklaces & Chains</SelectLabel>
                            <SelectItem value="14 Inches">14 Inches</SelectItem>
                            <SelectItem value="16 Inches">16 Inches</SelectItem>
                            <SelectItem value="18 Inches">18 Inches</SelectItem>
                            <SelectItem value="20 Inches">20 Inches</SelectItem>
                            <SelectItem value="22 Inches">22 Inches</SelectItem>
                            <SelectItem value="24 Inches">24 Inches</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        className="h-10 px-3 text-xs flex-1"
                        placeholder="e.g. Free Size, US 7"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5 font-semibold text-xs">Certificate / Hallmark Number</Label>
                    <Input
                      type="text"
                      value={certificateNumber}
                      onChange={(e) => setCertificateNumber(e.target.value)}
                      className="h-10 px-3 text-xs"
                      placeholder="e.g., OA-9921-G / Hallmarked"
                    />
                  </div>
                </div>

                {/* Available Sizes & Available Colors */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 font-semibold text-xs">Available Sizes</Label>
                    <div className="flex gap-2">
                      <Select
                        value=""
                        onValueChange={(val) => {
                          if (!val) return;
                          setAvailableSizes((prev) => {
                            const trimmed = prev.trim();
                            if (!trimmed) return val;
                            const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
                            if (parts.includes(val)) return trimmed;
                            return `${trimmed}, ${val}`;
                          });
                        }}
                      >
                        <SelectTrigger className="h-10 text-xs w-[140px] sm:w-[160px] shrink-0 bg-background">
                          <SelectValue placeholder="+ Add Size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Free Size">Free Size</SelectItem>
                          <SelectItem value="Adjustable">Adjustable</SelectItem>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectGroup>
                            <SelectLabel>Ring Sizes</SelectLabel>
                            <SelectItem value="US 5">US 5</SelectItem>
                            <SelectItem value="US 6">US 6</SelectItem>
                            <SelectItem value="US 7">US 7</SelectItem>
                            <SelectItem value="US 8">US 8</SelectItem>
                            <SelectItem value="US 9">US 9</SelectItem>
                            <SelectItem value="US 10">US 10</SelectItem>
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Necklace Lengths</SelectLabel>
                            <SelectItem value="14 Inches">14 Inches</SelectItem>
                            <SelectItem value="16 Inches">16 Inches</SelectItem>
                            <SelectItem value="18 Inches">18 Inches</SelectItem>
                            <SelectItem value="20 Inches">20 Inches</SelectItem>
                            <SelectItem value="22 Inches">22 Inches</SelectItem>
                            <SelectItem value="24 Inches">24 Inches</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        value={availableSizes}
                        onChange={(e) => setAvailableSizes(e.target.value)}
                        className="h-10 px-3 text-xs flex-1"
                        placeholder="e.g. Free Size, US 6, US 7"
                      />
                    </div>
                    {availableSizes && availableSizes.trim().length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {availableSizes.split(',').map(s => s.trim()).filter(Boolean).map((sz, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border/80"
                          >
                            <span>{sz}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = availableSizes
                                  .split(',')
                                  .map(s => s.trim())
                                  .filter(Boolean)
                                  .filter(s => s.toLowerCase() !== sz.toLowerCase())
                                  .join(', ');
                                setAvailableSizes(updated);
                              }}
                              className="text-muted-foreground hover:text-foreground ml-0.5 rounded-full p-0.5 hover:bg-background transition-colors"
                              title={`Remove ${sz}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="mb-1.5 font-semibold text-xs">Available Colors / Shades</Label>
                    <div className="flex gap-2">
                      <Select
                        value=""
                        onValueChange={(val) => {
                          if (!val) return;
                          setAvailableColors((prev) => {
                            const trimmed = prev.trim();
                            if (!trimmed) return val;
                            const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
                            if (parts.includes(val)) return trimmed;
                            return `${trimmed}, ${val}`;
                          });
                        }}
                      >
                        <SelectTrigger className="h-10 text-xs w-[140px] sm:w-[160px] shrink-0 bg-background">
                          <SelectValue placeholder="+ Add Color" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yellow Gold">Yellow Gold</SelectItem>
                          <SelectItem value="Rose Gold">Rose Gold</SelectItem>
                          <SelectItem value="White Gold">White Gold</SelectItem>
                          <SelectItem value="Silver">Silver</SelectItem>
                          <SelectItem value="Golden Ruby">Golden Ruby</SelectItem>
                          <SelectItem value="Golden Green">Golden Green</SelectItem>
                          <SelectItem value="Golden Pearl">Golden Pearl</SelectItem>
                          <SelectItem value="Emerald Green">Emerald Green</SelectItem>
                          <SelectItem value="Ruby Red">Ruby Red</SelectItem>
                          <SelectItem value="Champagne Gold">Champagne Gold</SelectItem>
                          <SelectItem value="Black Rhodium">Black Rhodium</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        value={availableColors}
                        onChange={(e) => setAvailableColors(e.target.value)}
                        className="h-10 px-3 text-xs flex-1"
                        placeholder="e.g. Yellow Gold, Rose Gold"
                      />
                    </div>
                    {availableColors && availableColors.trim().length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {availableColors.split(',').map(s => s.trim()).filter(Boolean).map((col, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border/80"
                          >
                            <span>{col}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = availableColors
                                  .split(',')
                                  .map(s => s.trim())
                                  .filter(Boolean)
                                  .filter(s => s.toLowerCase() !== col.toLowerCase())
                                  .join(', ');
                                setAvailableColors(updated);
                              }}
                              className="text-muted-foreground hover:text-foreground ml-0.5 rounded-full p-0.5 hover:bg-background transition-colors"
                              title={`Remove ${col}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Gemstone & Diamond Details */}
                <div className="border-t border-border/70 pt-4 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Gemstone & Stone Details (Optional)</p>
                  <div>
                    <Label className="mb-1.5 text-xs font-semibold">Stone / Gemstone Type (Multi-select)</Label>
                    <div className="flex gap-2">
                      <Select
                        value=""
                        onValueChange={(val) => {
                          if (!val) return;
                          if (val === 'None / Plain') {
                            setGemstoneType('');
                            return;
                          }
                          setGemstoneType((prev) => {
                            const trimmed = (prev || '').trim();
                            if (!trimmed) return val;
                            const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
                            if (parts.includes(val)) return trimmed;
                            return `${trimmed}, ${val}`;
                          });
                        }}
                      >
                        <SelectTrigger className="h-10 text-xs w-[140px] sm:w-[160px] shrink-0 bg-background">
                          <SelectValue placeholder="+ Add Stone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None / Plain">None / Plain (Clear)</SelectItem>
                          <SelectItem value="Emerald">Emerald</SelectItem>
                          <SelectItem value="Ruby">Ruby</SelectItem>
                          <SelectItem value="Sapphire">Sapphire</SelectItem>
                          <SelectItem value="Zircon">Zircon</SelectItem>
                          <SelectItem value="Cubic Zirconia (CZ)">Cubic Zirconia (CZ)</SelectItem>
                          <SelectItem value="Moissanite">Moissanite</SelectItem>
                          <SelectItem value="Polki">Polki</SelectItem>
                          <SelectItem value="Kundan">Kundan</SelectItem>
                          <SelectItem value="Natural Diamond">Natural Diamond</SelectItem>
                          <SelectItem value="Lab Grown Diamond">Lab Grown Diamond</SelectItem>
                          <SelectItem value="Pearl">Pearl</SelectItem>
                          <SelectItem value="Turquoise / Feroza">Turquoise / Feroza</SelectItem>
                          <SelectItem value="Topaz">Topaz</SelectItem>
                          <SelectItem value="Opal">Opal</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        value={gemstoneType}
                        onChange={(e) => setGemstoneType(e.target.value)}
                        className="h-10 px-3 text-xs flex-1"
                        placeholder="e.g. Emerald, Ruby, Polki, Moissanite"
                      />
                    </div>
                    {gemstoneType && gemstoneType.trim().length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {gemstoneType.split(',').map(s => s.trim()).filter(Boolean).map((stone, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border/80"
                          >
                            <span>{stone}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = gemstoneType
                                  .split(',')
                                  .map(s => s.trim())
                                  .filter(Boolean)
                                  .filter(s => s.toLowerCase() !== stone.toLowerCase())
                                  .join(', ');
                                setGemstoneType(updated);
                              }}
                              className="text-muted-foreground hover:text-foreground ml-0.5 rounded-full p-0.5 hover:bg-background transition-colors"
                              title={`Remove ${stone}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 mt-3">
                    <div>
                      <Label className="mb-1.5 text-xs font-semibold">Carat Weight</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={gemstoneCarat}
                        onChange={(e) => setGemstoneCarat(e.target.value)}
                        className="h-10 px-3 text-xs"
                        placeholder="e.g. 1.25"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 text-xs font-semibold">Cut / Shape</Label>
                      <div className="flex gap-2">
                        <Select
                          value={gemstoneCut || ""}
                          onValueChange={(val) => setGemstoneCut(val)}
                        >
                          <SelectTrigger className="h-10 text-xs w-[140px] sm:w-[160px] shrink-0 bg-background">
                            <SelectValue placeholder="Pick Cut" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Round Brilliant">Round Brilliant</SelectItem>
                            <SelectItem value="Princess Cut">Princess Cut</SelectItem>
                            <SelectItem value="Oval Cut">Oval Cut</SelectItem>
                            <SelectItem value="Emerald Cut">Emerald Cut</SelectItem>
                            <SelectItem value="Cushion Cut">Cushion Cut</SelectItem>
                            <SelectItem value="Pear Cut">Pear Cut</SelectItem>
                            <SelectItem value="Marquise Cut">Marquise Cut</SelectItem>
                            <SelectItem value="Heart Cut">Heart Cut</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="text"
                          value={gemstoneCut}
                          onChange={(e) => setGemstoneCut(e.target.value)}
                          className="h-10 px-3 text-xs flex-1"
                          placeholder="e.g. Round Brilliant"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 mt-3">
                    <div>
                      <Label className="mb-1.5 text-xs font-semibold">Clarity</Label>
                      <div className="flex gap-2">
                        <Select
                          value={gemstoneClarity || ""}
                          onValueChange={(val) => setGemstoneClarity(val)}
                        >
                          <SelectTrigger className="h-10 text-xs w-[140px] sm:w-[160px] shrink-0 bg-background">
                            <SelectValue placeholder="Pick Clarity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FL / IF (Flawless)">FL / IF (Flawless)</SelectItem>
                            <SelectItem value="VVS1 - VVS2">VVS1 - VVS2</SelectItem>
                            <SelectItem value="VS1 - VS2">VS1 - VS2</SelectItem>
                            <SelectItem value="SI1 - SI2">SI1 - SI2</SelectItem>
                            <SelectItem value="Eye-Clean">Eye-Clean</SelectItem>
                            <SelectItem value="AAA Grade">AAA Grade</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="text"
                          value={gemstoneClarity}
                          onChange={(e) => setGemstoneClarity(e.target.value)}
                          className="h-10 px-3 text-xs flex-1"
                          placeholder="e.g. VVS1, VS1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1.5 text-xs font-semibold">Color Grade</Label>
                      <div className="flex gap-2">
                        <Select
                          value={gemstoneColor || ""}
                          onValueChange={(val) => setGemstoneColor(val)}
                        >
                          <SelectTrigger className="h-10 text-xs w-[140px] sm:w-[160px] shrink-0 bg-background">
                            <SelectValue placeholder="Pick Color" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="D-F (Colorless)">D-F (Colorless)</SelectItem>
                            <SelectItem value="G-H (Near Colorless)">G-H (Near Colorless)</SelectItem>
                            <SelectItem value="I-J (Slightly Tinted)">I-J (Slightly Tinted)</SelectItem>
                            <SelectItem value="Deep Emerald Green">Deep Emerald Green</SelectItem>
                            <SelectItem value="Royal Ruby Red">Royal Ruby Red</SelectItem>
                            <SelectItem value="Sapphire Blue">Sapphire Blue</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="text"
                          value={gemstoneColor}
                          onChange={(e) => setGemstoneColor(e.target.value)}
                          className="h-10 px-3 text-xs flex-1"
                          placeholder="e.g. D-F Colorless"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. Product Details */}
          <AccordionItem value="short-description" className="rounded-xl border border-border bg-background shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">Product Details</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5">Summary displayed in the Product Details dropdown on the product page.</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div>
                <ProductRichTextEditor
                  value={shortDescription}
                  onChange={setShortDescription}
                  placeholder="Product details summary displayed in the dropdown on the product page..."
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. Product Description (Long Description) */}
          <AccordionItem value="description" className="rounded-xl border border-border bg-background shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">Product Description</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5">Detailed description with formatting, images, and specifications.</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div>
                <ProductRichTextEditor
                  value={Description}
                  onChange={setDescription}
                  placeholder="Create a polished product description with formatting, images, videos, and HTML."
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 4. Marketing Flags & Badges */}
          <AccordionItem value="marketing" className="rounded-xl border border-border bg-background shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">Marketing Flags & Badges</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5">Configure promotional tags and storefront badges.</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Storefront Flags</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3 sm:border-0 sm:pb-0">
                    <Label className="text-xs font-medium text-foreground cursor-pointer" htmlFor="toggle-featured">Featured (Ads)</Label>
                    <Switch id="toggle-featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3 sm:border-0 sm:pb-0">
                    <Label className="text-xs font-medium text-foreground cursor-pointer" htmlFor="toggle-new">New Arrival</Label>
                    <Switch id="toggle-new" checked={isNewArrival} onCheckedChange={setIsNewArrival} />
                  </div>
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3 sm:border-0 sm:pb-0">
                    <Label className="text-xs font-medium text-foreground cursor-pointer" htmlFor="toggle-best">Best Selling</Label>
                    <Switch id="toggle-best" checked={isBestSelling} onCheckedChange={setIsBestSelling} />
                  </div>
                </div>
                
                <div className="pt-4 mt-3 border-t border-border/50">
                  <p className="text-xs font-semibold text-foreground mb-2">Main Picture Badge (Card Corner)</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPrimaryTag("")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
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
                            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
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

                <div className="pt-4 mt-3 border-t border-border/50">
                  <p className="text-xs font-semibold text-foreground mb-2">Detail Page Badges</p>
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
                            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
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

          {/* 5. SEO & Metadata */}
          <AccordionItem value="seo" className="rounded-xl border border-border bg-background shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">SEO & Metadata</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5">Search title, description, and social share preview.</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Automate or customize search ranking and OpenGraph metadata.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={seoButtonDisabled}
                    onClick={handleGenerateSeo}
                    className="rounded-lg shadow-sm text-xs font-semibold h-8"
                  >
                    {isGeneratingSeo ? (
                      <>
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
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
                    'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold h-8',
                    seoReady
                      ? 'border-border bg-muted text-foreground'
                      : 'border-border bg-muted/60 text-muted-foreground',
                  )}
                >
                  <Check className="size-3 text-foreground" />
                  {seoReady ? 'SEO Complete' : `${seoCompleteCount}/${seoChecks.length} Set`}
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
                  placeholder="https://www.ornamentsbyarshad.com/products/your-product"
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
            <div className="mt-6 pt-5 border-t border-border space-y-4">
              <div className="flex items-center gap-2">
                <Share2 className="size-4 text-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Social Share (WhatsApp & Facebook)</h3>
              </div>

              <div className="grid gap-4 pt-1">
                <div>
                  <Label className="mb-1.5 text-xs font-semibold">Social Headline / Title</Label>
                  <Input
                    type="text"
                    value={seoOgTitle}
                    onChange={(e) => setSeoOgTitle(e.target.value)}
                    className="h-10 px-3 text-xs"
                    placeholder="e.g., 22K Gold Plated Emerald Bridal Necklace Set"
                    maxLength={100}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{seoOgTitle.length}/100 characters</p>
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-semibold">Social Description</Label>
                  <Textarea
                    value={seoOgDescription}
                    onChange={(e) => setSeoOgDescription(e.target.value)}
                    className="min-h-16 resize-none px-3 py-2 text-xs"
                    placeholder="e.g., Handcrafted pure silver necklace with sparkling emerald gemstones. Free insured delivery across Pakistan."
                    rows="2"
                    maxLength={350}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{seoOgDescription.length}/350 characters</p>
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-semibold">Social Banner Image</Label>

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
                        className="rounded-lg shadow-sm text-xs font-semibold gap-2 border border-border h-8"
                      >
                        {isUploadingOgImage ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <CloudUpload className="size-3.5 text-foreground" />
                            Upload Custom Banner
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
                        <p className="text-[11px] font-medium text-muted-foreground">Or pick from product photos:</p>
                        <div className="flex flex-wrap gap-2">
                          {images.map((img, idx) => {
                            const isSelected = (seoOgImage ? seoOgImage === img.url : idx === 0);
                            return (
                              <button
                                key={img.url || idx}
                                type="button"
                                onClick={() => setSeoOgImage(img.url)}
                                className={cn(
                                  "relative size-11 rounded-lg overflow-hidden border-2 transition-all p-0.5 bg-background",
                                  isSelected
                                    ? "border-foreground ring-2 ring-foreground/20 scale-105"
                                    : "border-border hover:border-muted-foreground/50 opacity-70 hover:opacity-100"
                                )}
                                title={isSelected ? "Active Social Image" : `Use Photo #${idx + 1}`}
                              >
                                <img src={img.url} alt={`Photo ${idx + 1}`} className="size-full object-cover rounded" />
                                {isSelected && (
                                  <span className="absolute bottom-0 right-0 bg-foreground text-background rounded-tl-sm p-0.5">
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
                        placeholder="Or paste image URL directly..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live WhatsApp / Social Card Preview */}
              <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Share2 className="size-3.5 text-foreground" />
                    Share Card Preview (WhatsApp / Facebook)
                  </p>
                  
                  {/* Preview Controls */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                      <button
                        type="button"
                        onClick={() => setOgPreviewFit('cover')}
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                          ogPreviewFit === 'cover' ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Cover
                      </button>
                      <button
                        type="button"
                        onClick={() => setOgPreviewFit('contain')}
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                          ogPreviewFit === 'contain' ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Padded
                      </button>
                    </div>

                    <div className="inline-flex rounded-lg border border-border bg-background p-0.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setSeoOgImageRatio('1.91:1')}
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-semibold transition-all",
                          seoOgImageRatio === '1.91:1' ? "bg-foreground text-background shadow-xs" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        1.91:1
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeoOgImageRatio('1:1')}
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-semibold transition-all",
                          seoOgImageRatio === '1:1' ? "bg-foreground text-background shadow-xs" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        1:1
                      </button>
                    </div>
                  </div>
                </div>

                <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-border shadow-md bg-neutral-900 text-white">
                  <div
                    className={cn(
                    "relative w-full overflow-hidden border-b border-neutral-800",
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
                  <div className="p-3 space-y-1 bg-neutral-950">
                    <p className="font-semibold text-sm line-clamp-2 text-white leading-snug">
                      {socialPreviewTitle}
                    </p>
                    <p className="text-xs line-clamp-2 text-neutral-300 leading-relaxed">
                      {socialPreviewDescription}
                    </p>
                    <div className="pt-2 mt-1 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                      <span>ornamentsbyarshad.com</span>
                      <span className="font-medium text-neutral-200">Ornaments by Arshad</span>
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
