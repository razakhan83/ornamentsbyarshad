'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartActions } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProductWishlistButton from '@/components/ProductWishlistButton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Share2, Minus, Plus, ShieldCheck, Truck, RotateCcw, Award, Sparkles } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { buildProductWhatsAppMessage, createWhatsAppUrl } from '@/lib/whatsapp';
import { flyToCart } from '@/lib/flyToCart';
import { useActionLock } from '@/hooks/useActionLock';
import { getAvailableStock, isProductOutOfStock } from '@/lib/productCommerce';
import { Spinner } from '@/components/ui/spinner';

export function ProductSocialActions({ product, className = '' }) {
    const handleShare = async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const title = product.Name || product.name || 'Ornaments by Arshad Fine Jewelry';

        if (navigator.share) {
            try {
                await navigator.share({ title, url });
            } catch (err) {
                // User cancelled
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                toast.success('Link copied to clipboard!');
            } catch {
                toast.error('Failed to copy link.');
            }
        }
    };

    return (
        <div className={cn('flex gap-2', className)}>
            <Button
                onClick={handleShare}
                variant="outline"
                className="size-11 rounded-[6px] border border-[#E8E5DF] bg-white text-[#121212] hover:bg-[#FAF9F6] transition-colors duration-200"
                title="Share this creation"
            >
                <Share2 className="size-4" />
            </Button>
            <ProductWishlistButton
                product={product}
                mode="detail"
                className="hidden md:inline-flex size-11 shrink-0 rounded-[6px] border border-[#E8E5DF] bg-white text-[#121212] hover:bg-[#FAF9F6] [&>span]:hidden transition-colors duration-200"
                title="Save to Wishlist"
            />
        </div>
    );
}

export function ProductWhatsAppOrderButton({ product, whatsappNumber = '', storeName = 'Ornaments by Arshad', className = '' }) {
    const handleWhatsApp = () => {
        const name = product.Name || product.name || 'this piece';
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const message = buildProductWhatsAppMessage({
            productName: name,
            productUrl: url,
            storeName,
        });
        const whatsappUrl = createWhatsAppUrl(whatsappNumber, message);
        if (!whatsappUrl) {
            toast.error('Atelier WhatsApp concierge is currently unavailable.');
            return;
        }
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <button
            type="button"
            onClick={handleWhatsApp}
            className={cn(
                "w-full h-12 flex items-center justify-center gap-2.5 rounded-[6px] border border-[#E8E5DF] bg-transparent text-[#121212] uppercase tracking-[0.15em] text-xs font-semibold transition-all duration-300 cursor-pointer shadow-none md:bg-transparent md:hover:bg-[#25D366] md:hover:border-[#25D366] md:hover:text-white group",
                className
            )}
        >
            <WhatsAppIcon className="size-4.5 text-[#A67C52] group-hover:text-white transition-colors shrink-0" />
            <span>Consult Atelier on WhatsApp</span>
        </button>
    );
}

export default function ProductActions({ product, whatsappNumber = '', storeName = 'Ornaments by Arshad', basePrice = 0, compareAtPrice = null }) {
    const { addToCart } = useCartActions();
    const router = useRouter();
    
    // Dynamic Colors from product
    const colorList = Array.isArray(product?.availableColors) && product.availableColors.length > 0
        ? product.availableColors
        : [];
    const [selectedColor, setSelectedColor] = useState(colorList[0] || '');

    // Dynamic Sizes from product
    const sizeList = Array.isArray(product?.availableSizes) && product.availableSizes.length > 0
        ? product.availableSizes
        : (product?.size ? [product.size] : []);
    const [selectedSize, setSelectedSize] = useState(sizeList[0] || '');

    const [descriptionOpen, setDescriptionOpen] = useState(false);
    const [specsOpen, setSpecsOpen] = useState(false);
    const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
    const addLock = useActionLock();
    const buyLock = useActionLock();
    const [didJustAdd, setDidJustAdd] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [notifyModalOpen, setNotifyModalOpen] = useState(false);
    const [notifySubmitting, setNotifySubmitting] = useState(false);
    const [notifyForm, setNotifyForm] = useState({ whatsappNumber: '', email: '' });
    const [isBottomNavHidden, setIsBottomNavHidden] = useState(false);

    useEffect(() => {
        if (colorList.length > 0 && !selectedColor) {
            setSelectedColor(colorList[0]);
        }
    }, [colorList, selectedColor]);

    useEffect(() => {
        if (sizeList.length > 0 && !selectedSize) {
            setSelectedSize(sizeList[0]);
        }
    }, [sizeList, selectedSize]);

    useEffect(() => {
        const updateFromAttr = () => {
            const isHidden = document.documentElement.getAttribute('data-nav-hidden') === 'true';
            setIsBottomNavHidden(isHidden);
        };

        const observer = new MutationObserver(updateFromAttr);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-nav-hidden'] });

        let lastScrollY = window.scrollY;
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY <= 16) {
                setIsBottomNavHidden(false);
            } else if (currentScrollY > lastScrollY + 30 && currentScrollY > 80) {
                setIsBottomNavHidden(true);
            } else if (currentScrollY < lastScrollY - 12) {
                setIsBottomNavHidden(false);
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const availableStock = getAvailableStock(product);
    const isOutOfStock = isProductOutOfStock(product);

    useEffect(() => {
        if (availableStock <= 0) {
            setQuantity(1);
            return;
        }
        setQuantity((q) => Math.min(Math.max(1, q), availableStock));
    }, [availableStock]);

    const increment = () => setQuantity((q) => (availableStock > 0 ? Math.min(q + 1, availableStock) : 1));
    const decrement = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

    const handleAddToCart = (event) => addLock.run(async () => {
        if (isOutOfStock) return;
        if (event?.currentTarget) {
            const imageSrc = product?.Images?.[0]?.url || product?.images?.[0]?.url || (typeof product?.images?.[0] === 'string' ? product.images[0] : '') || product?.image || '';
            flyToCart({ sourceEl: event.currentTarget, imageSrc });
        }
        const startedAt = performance.now();
        try {
            const productToAdd = {
                ...product,
                Price: product.Price ?? basePrice,
                selectedMetal: product?.metalType || undefined,
                selectedSize: selectedSize || product?.size || undefined,
                selectedColor: selectedColor || undefined,
            };

            const result = await addToCart(productToAdd, quantity);
            if (result?.success) {
                setDidJustAdd(true);
            }
            const elapsed = performance.now() - startedAt;
            const remaining = Math.max(140 - elapsed, 0);
            if (remaining > 0) {
                await new Promise((resolve) => window.setTimeout(resolve, remaining));
            }
        } finally {
            window.setTimeout(() => setDidJustAdd(false), 700);
        }
    });

    const handleBuyNow = () => buyLock.run(async () => {
        if (isOutOfStock) return;
        try {
            const productToAdd = {
                ...product,
                Price: product.Price ?? basePrice,
                selectedMetal: product?.metalType || undefined,
                selectedSize: selectedSize || product?.size || undefined,
                selectedColor: selectedColor || undefined,
            };

            const result = await addToCart(productToAdd, quantity);
            if (result?.success) {
                router.push('/checkout');
            }
        } catch (error) {
            toast.error('Failed to proceed to checkout.');
        }
    });

    const handleNotifyFieldChange = (field) => (event) => {
        setNotifyForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

    const handleNotifySubmit = async (event) => {
        event.preventDefault();
        if (!notifyForm.whatsappNumber.trim() && !notifyForm.email.trim()) {
            toast.error('Please enter a WhatsApp number or an email address.');
            return;
        }

        setNotifySubmitting(true);
        try {
            const response = await fetch('/api/stock-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product._id,
                    whatsappNumber: notifyForm.whatsappNumber,
                    email: notifyForm.email,
                }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || data.error || 'Unable to save your request right now.');
            }

            toast.success(data.message || 'We will notify you when this piece is available.');
            setNotifyModalOpen(false);
            setNotifyForm({ whatsappNumber: '', email: '' });
        } catch (error) {
            toast.error(error.message || 'Unable to save your request right now.');
        } finally {
            setNotifySubmitting(false);
        }
    };

    const formatPrice = (raw) => `Rs. ${Number(raw || 0).toLocaleString('en-PK')}`;
    const displayPrice = basePrice;
    const displayComparePrice = compareAtPrice && compareAtPrice > basePrice ? compareAtPrice : null;

    // Has any jewelry specification
    const hasJewelrySpecs = Boolean(
        product?.metalType ||
        product?.purity ||
        product?.plating ||
        product?.grossWeightGrams ||
        product?.size ||
        product?.certificateNumber ||
        product?.gemstone?.gemstoneType ||
        product?.gemstone?.carat
    );

    const gemstoneText = [
        product?.gemstone?.gemstoneType,
        product?.gemstone?.carat ? `${product.gemstone.carat} ct` : null,
        product?.gemstone?.cut ? `Cut: ${product.gemstone.cut}` : null,
        product?.gemstone?.clarity ? `Clarity: ${product.gemstone.clarity}` : null,
        product?.gemstone?.color ? `Color: ${product.gemstone.color}` : null,
    ].filter(Boolean).join(' • ');

    return (
        <>
        <div className="flex flex-col gap-3 sm:gap-3.5">
            {/* Price Row */}
            <div className="order-1 flex flex-wrap items-baseline gap-x-3 sm:gap-x-4 gap-y-1 border-b border-[#E8E5DF] pb-2 sm:pb-2.5">
                <span className="font-serif text-2xl sm:text-3xl text-[#121212] tracking-wide font-normal">
                    {formatPrice(displayPrice)}
                </span>
                {displayComparePrice ? (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[#737373] line-through">
                            {formatPrice(displayComparePrice)}
                        </span>
                        <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider font-semibold text-[#A67C52] bg-[#A67C52]/10 px-2 py-0.5 rounded-xs">
                            Save {formatPrice(displayComparePrice - displayPrice)}
                        </span>
                    </div>
                ) : null}
            </div>

            {/* Stock Indicator */}
            <div className="order-2 flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", isOutOfStock ? "bg-red-500 animate-pulse" : "bg-emerald-500")} />
              <span className="text-xs font-medium text-[#121212]">
                {product?.isUnlimitedStock 
                  ? "In Stock • Handcrafted to Order"
                  : isOutOfStock 
                    ? "Out of Stock" 
                    : `${availableStock} ${availableStock === 1 ? "item" : "items"} in stock`}
              </span>
            </div>

            {/* Dynamic Color Variant Selection Pills (Shown only if colors are entered) */}
            {colorList.length > 0 && (
                <div className="order-3 space-y-1.5 pt-0.5">
                    <span className="text-xs font-medium text-[#121212] tracking-wide">
                        Color / Shade: <span className="text-[#A67C52] font-semibold">{selectedColor}</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {colorList.map((colorName) => {
                            const isSelected = selectedColor === colorName;
                            return (
                                <button
                                    key={colorName}
                                    type="button"
                                    onClick={() => setSelectedColor(colorName)}
                                    className={cn(
                                        "relative px-3 py-1 text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer rounded-lg border",
                                        isSelected
                                            ? "border-[#121212] bg-[#121212] text-white shadow-xs"
                                            : "border-[#E8E5DF] bg-white text-[#121212] hover:border-[#121212]/50"
                                    )}
                                >
                                    <span>{colorName}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Dynamic Size / Length Selection Pills (Shown only if sizes are entered) */}
            {sizeList.length > 0 && (
                <div className="order-4 space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#121212] tracking-wide">
                            Size / Length: <span className="text-[#A67C52] font-semibold">{selectedSize}</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setSizeGuideOpen(true)}
                            className="text-[11px] font-medium text-[#A67C52] hover:underline uppercase tracking-wider cursor-pointer"
                        >
                            Size Guide
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {sizeList.map((sz) => {
                            const isSelected = selectedSize === sz;
                            return (
                                <button
                                    key={sz}
                                    type="button"
                                    onClick={() => setSelectedSize(sz)}
                                    className={cn(
                                        "relative px-3 py-1 text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer rounded-lg border",
                                        isSelected
                                            ? "border-[#121212] bg-[#121212] text-white shadow-xs"
                                            : "border-[#E8E5DF] bg-white text-[#121212] hover:border-[#121212]/50"
                                    )}
                                >
                                    <span>{sz}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Jewelry Specifications Accordion / Summary (Shows whatever admin added) */}
            {hasJewelrySpecs && (
                <div className="order-5 md:order-7 border-t border-[#E8E5DF] pt-2.5">
                    <button
                        type="button"
                        onClick={() => setSpecsOpen(!specsOpen)}
                        className="flex w-full items-center justify-between text-left font-serif text-sm font-medium text-[#121212] uppercase tracking-wider cursor-pointer"
                    >
                        <span>Jewelry Specifications</span>
                        <span className="text-lg font-light leading-none">{specsOpen ? "−" : "+"}</span>
                    </button>
                    {specsOpen && (
                        <div className="mt-2.5 overflow-hidden rounded-xl border border-[#E8E5DF] bg-[#FAF9F6]">
                            <dl className="divide-y divide-[#E8E5DF] text-xs">
                                {product.metalType && (
                                    <div className="grid grid-cols-3 p-2.5">
                                        <dt className="text-[#737373] font-medium">Metal Type</dt>
                                        <dd className="col-span-2 text-[#121212] font-semibold">{product.metalType}</dd>
                                    </div>
                                )}
                                {product.purity && (
                                    <div className="grid grid-cols-3 p-2.5">
                                        <dt className="text-[#737373] font-medium">Gold Purity</dt>
                                        <dd className="col-span-2 text-[#121212] font-semibold">{product.purity}</dd>
                                    </div>
                                )}
                                {product.plating && (
                                    <div className="grid grid-cols-3 p-2.5">
                                        <dt className="text-[#737373] font-medium">Plating / Polish</dt>
                                        <dd className="col-span-2 text-[#121212] font-semibold">
                                            {String(product.plating)
                                                .replace(/Gold Plating/gi, 'Gold Plated')
                                                .replace(/Silver Plating/gi, 'Silver Plated')
                                                .replace(/Rose Gold Plating/gi, 'Rose Gold Plated')
                                                .replace(/Rhodium Plating/gi, 'Rhodium Plated')
                                                .trim()}
                                        </dd>
                                    </div>
                                )}
                                {product.grossWeightGrams != null && product.grossWeightGrams !== '' && (
                                    <div className="grid grid-cols-3 p-2.5">
                                        <dt className="text-[#737373] font-medium">Gross Weight</dt>
                                        <dd className="col-span-2 text-[#121212] font-semibold">{product.grossWeightGrams} Grams</dd>
                                    </div>
                                )}
                                {(product.size || (product.availableSizes?.length > 0)) && (
                                    <div className="grid grid-cols-3 p-2.5">
                                        <dt className="text-[#737373] font-medium">Size / Length</dt>
                                        <dd className="col-span-2 text-[#121212] font-semibold">
                                            {product.availableSizes?.length > 0 ? product.availableSizes.join(', ') : product.size}
                                        </dd>
                                    </div>
                                )}
                                {gemstoneText && (
                                    <div className="grid grid-cols-3 p-2.5">
                                        <dt className="text-[#737373] font-medium">Gemstone</dt>
                                        <dd className="col-span-2 text-[#121212] font-semibold">{gemstoneText}</dd>
                                    </div>
                                )}
                                {product.certificateNumber && (
                                    <div className="grid grid-cols-3 p-2.5">
                                        <dt className="text-[#737373] font-medium">Hallmark / Cert</dt>
                                        <dd className="col-span-2 text-[#121212] font-semibold">{product.certificateNumber}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    )}
                </div>
            )}

            {/* Product Details Accordion */}
            <div className="order-6 md:order-8 border-t border-[#E8E5DF] pt-2.5 pb-1">
              <button
                type="button"
                onClick={() => setDescriptionOpen(!descriptionOpen)}
                className="flex w-full items-center justify-between text-left font-serif text-sm font-medium text-[#121212] uppercase tracking-wider cursor-pointer"
              >
                <span>Product Details</span>
                <span className="text-lg font-light leading-none">{descriptionOpen ? "−" : "+"}</span>
              </button>
              {descriptionOpen && (
                <div 
                  className="mt-2.5 text-xs leading-relaxed text-[#737373] space-y-2 [&_a]:text-[#121212] [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{
                    __html: product.shortDescription || product.Description || "<p>Handcrafted with precision using high-grade hallmarked gold and certified precious stones.</p>"
                  }}
                />
              )}
            </div>

            {/* Quantity Selector & Action Buttons (Mobile: after Details/Specs; Desktop: before Details/Specs) */}
            <div className="order-7 md:order-5 flex flex-col gap-2.5 border-t border-[#E8E5DF] md:border-t-0 pt-2.5 md:pt-1">
                {/* Quantity Row */}
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#121212]">Quantity</span>
                    <div className="inline-flex items-center border border-[#E8E5DF] bg-white rounded-[6px] h-8.5 overflow-hidden">
                        <button
                            type="button"
                            onClick={decrement}
                            className="inline-flex size-8.5 items-center justify-center text-[#737373] hover:text-[#121212] transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                        >
                            <Minus className="size-3" />
                        </button>
                        <span className="inline-flex min-w-8 items-center justify-center text-xs font-semibold text-[#121212] tabular-nums">
                            {quantity}
                        </span>
                        <button
                            type="button"
                            onClick={increment}
                            className="inline-flex size-8.5 items-center justify-center text-[#737373] hover:text-[#121212] transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                        >
                            <Plus className="size-3" />
                        </button>
                    </div>
                </div>

                {/* Primary CTA Buttons */}
                <div className="flex flex-col gap-2">
                    {isOutOfStock ? (
                        <Button
                            onClick={() => setNotifyModalOpen(true)}
                            className="h-11 w-full rounded-[6px] bg-[#121212] text-white hover:bg-neutral-800 uppercase tracking-[0.2em] text-xs font-semibold shadow-xs cursor-pointer"
                        >
                            Notify When Available
                        </Button>
                    ) : (
                        <>
                            {/* Primary Add to Cart Button (Theme Gold with Black on hover) */}
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={addLock.isPending || isOutOfStock}
                                className={cn(
                                    "add-to-cart-button h-11.5 w-full inline-flex items-center justify-center rounded-[6px] font-semibold text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-none cursor-pointer active:scale-[0.98] disabled:opacity-50",
                                    "bg-[#A67C52] border border-[#A67C52] text-white",
                                    "hover:bg-[#121212] hover:border-[#121212] hover:text-white"
                                )}
                            >
                                {addLock.isPending ? (
                                    <Spinner className="size-4 animate-spin mr-2 text-white" />
                                ) : null}
                                {didJustAdd ? "Added to Cart" : "Add to Cart"}
                            </button>

                            {/* Secondary Buy It Now Button (Mobile: Transparent Black Text, PC: Transparent -> Light Warm Hover) */}
                            <button
                                type="button"
                                onClick={handleBuyNow}
                                disabled={buyLock.isPending || isOutOfStock}
                                className={cn(
                                    "buy-now-button h-11.5 w-full inline-flex items-center justify-center rounded-[6px] font-semibold text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-none cursor-pointer active:scale-[0.98] disabled:opacity-50",
                                    "bg-transparent border border-[#E8E5DF] text-[#121212]",
                                    "md:bg-transparent md:border-[#E8E5DF] md:text-[#121212] md:hover:bg-[#A67C52]/10 md:hover:border-[#A67C52] md:hover:text-[#121212]"
                                )}
                            >
                                {buyLock.isPending ? (
                                    <Spinner className="size-4 animate-spin mr-2 text-current" />
                                ) : null}
                                Buy It Now
                            </button>
                        </>
                    )}

                    {/* Order on WhatsApp Button (Mobile: Transparent Black Text, PC: Transparent -> Green Hover) */}
                    <button
                        type="button"
                        onClick={() => {
                            const name = product.Name || product.name || 'this piece';
                            const url = typeof window !== 'undefined' ? window.location.href : '';
                            const message = buildProductWhatsAppMessage({
                                productName: name,
                                productUrl: url,
                                storeName,
                                color: selectedColor || '',
                                size: selectedSize || product?.size || '',
                                metal: product?.metalType || '',
                            });
                            const whatsappUrl = createWhatsAppUrl(whatsappNumber, message);
                            if (whatsappUrl) window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className={cn(
                            "w-full h-11.5 inline-flex items-center justify-center gap-2.5 rounded-[6px] text-xs uppercase tracking-[0.18em] font-semibold transition-all duration-300 shadow-none active:scale-[0.98] cursor-pointer group",
                            "bg-transparent border border-[#E8E5DF] text-[#121212]",
                            "md:bg-transparent md:border-[#E8E5DF] md:text-[#121212] md:hover:bg-[#25D366] md:hover:border-[#25D366] md:hover:text-white"
                        )}
                    >
                        <WhatsAppIcon className="size-4 text-[#A67C52] group-hover:text-white transition-colors shrink-0" />
                        <span>Order on WhatsApp</span>
                    </button>
                </div>
            </div>

            {/* Minimal Luxury Guarantees & Authenticity Strip */}
            <div className="order-8 md:order-6 border-t border-[#E8E5DF] pt-2.5 mt-0.5">
                <div className="grid grid-cols-3 gap-1 py-2 px-2 bg-[#FAF9F6] border border-[#E8E5DF] rounded-lg">
                    <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 py-0.5">
                        <Award className="size-3.5 text-[#A67C52] shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[9px] sm:text-[10px] font-sans font-semibold uppercase tracking-wider text-[#121212] leading-tight truncate">Authentic</p>
                            <p className="hidden sm:block text-[8.5px] text-[#737373] leading-none mt-0.5 truncate">Certified Metals</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 border-x border-[#E8E5DF] py-0.5">
                        <Truck className="size-3.5 text-[#A67C52] shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[9px] sm:text-[10px] font-sans font-semibold uppercase tracking-wider text-[#121212] leading-tight truncate">Insured</p>
                            <p className="hidden sm:block text-[8.5px] text-[#737373] leading-none mt-0.5 truncate">Tracked Delivery</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 py-0.5">
                        <ShieldCheck className="size-3.5 text-[#A67C52] shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[9px] sm:text-[10px] font-sans font-semibold uppercase tracking-wider text-[#121212] leading-tight truncate">Secure</p>
                            <p className="hidden sm:block text-[8.5px] text-[#737373] leading-none mt-0.5 truncate">100% Encrypted</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Size Guide Modal (Minimal, Clean, High Contrast for Mobile & Desktop) */}
        <Dialog open={sizeGuideOpen} onOpenChange={setSizeGuideOpen}>
            <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-xl md:max-w-2xl max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-[#E8E5DF] bg-[#FAF9F6] p-4 sm:p-7 shadow-2xl">
                <DialogHeader className="space-y-1 text-left border-b border-[#E8E5DF] pb-3 sm:pb-4 pr-8">
                    <DialogTitle className="font-serif text-lg sm:text-2xl font-normal text-[#121212] tracking-normal sm:tracking-wide">
                        Jewelry & Ring Size Guide
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#555] tracking-wide uppercase font-medium">
                        Standard ring and jewelry measurements
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3.5 pt-2">
                    {/* Free Size Highlight Card */}
                    <div className="flex items-start gap-3 rounded-xl border border-[#A67C52]/30 bg-[#A67C52]/10 p-3 sm:p-4 text-xs sm:text-sm">
                        <Sparkles className="size-4 text-[#A67C52] shrink-0 mt-0.5" />
                        <div className="text-[#2B2723] leading-relaxed text-xs sm:text-[13px]">
                            <span className="font-semibold text-[#121212] mr-1">
                                Free Size (Adjustable):
                            </span>
                            Flexible open band that adjusts gently by hand to fit standard sizes <strong className="text-[#121212]">US 5 to US 9</strong> comfortably.
                        </div>
                    </div>

                    {/* Responsive Sizes Table */}
                    <div className="overflow-hidden rounded-xl border border-[#E8E5DF] bg-white w-full">
                        <table className="w-full table-fixed text-left text-xs sm:text-sm">
                            <colgroup>
                                <col className="w-[32%] sm:w-[30%]" />
                                <col className="w-[34%] sm:w-[35%]" />
                                <col className="w-[34%] sm:w-[35%]" />
                            </colgroup>
                            <thead className="border-b border-[#E8E5DF] bg-[#F7F4EE] text-[10px] sm:text-xs uppercase tracking-wider text-[#4A4744]">
                                <tr>
                                    <th className="py-2.5 px-3 sm:px-4 font-semibold">Size</th>
                                    <th className="py-2.5 px-2.5 sm:px-4 font-semibold">Diameter</th>
                                    <th className="py-2.5 px-2.5 sm:px-4 font-semibold">Circumference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E8E5DF] text-[#121212] text-xs sm:text-[13px]">
                                <tr className="bg-[#A67C52]/10 font-medium">
                                    <td className="py-2.5 px-3 sm:px-4">
                                        <span className="font-bold text-[#A67C52] block leading-tight">Free Size</span>
                                        <span className="text-[10px] text-[#A67C52] font-semibold block leading-none mt-0.5">Adjustable (5-9)</span>
                                    </td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#2B2723] font-medium">15.7 – 19.8 mm</td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#2B2723] font-medium">49.3 – 62.1 mm</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 sm:px-4 font-medium text-[#121212]">US 5</td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#4A4744]">15.7 mm</td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#4A4744]">49.3 mm</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 sm:px-4 font-medium text-[#121212]">US 6</td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#4A4744]">16.5 mm</td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#4A4744]">51.9 mm</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 sm:px-4 font-medium text-[#121212]">
                                        <span>US 7</span>
                                        <span className="ml-1 text-[10px] text-[#A67C52] font-medium">(Standard)</span>
                                    </td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#4A4744]">17.3 mm</td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#4A4744]">54.4 mm</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 sm:px-4 font-medium text-[#121212]">US 8</td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#4A4744]">18.1 mm</td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#4A4744]">57.0 mm</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 sm:px-4 font-medium text-[#121212]">US 9</td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#4A4744]">18.9 mm</td>
                                    <td className="py-2.5 px-2.5 sm:px-4 text-[#4A4744]">59.5 mm</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* How to Measure Section */}
                    <div className="rounded-xl border border-[#E8E5DF] bg-white p-3.5 sm:p-4 text-xs text-[#4A4744] space-y-1.5">
                        <p className="font-semibold text-[#121212] uppercase tracking-wider text-[11px]">How to measure at home:</p>
                        <p className="leading-relaxed text-[#2B2723]">
                            Wrap a thin paper strip around your finger base, mark the overlap point, and measure against a ruler in mm.
                        </p>
                        <p className="text-[#A67C52] pt-1.5 text-xs font-medium border-t border-[#E8E5DF]">
                            Need a custom size? Contact our master jeweler via WhatsApp concierge.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* Restock Notification Modal */}
        <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
            <DialogContent className="sm:max-w-md rounded-none border border-[#E8E5DF] bg-[#FAF9F6]">
                <DialogHeader>
                    <DialogTitle className="font-serif text-xl tracking-wide text-[#121212] font-normal">
                        Request Availability Notification
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#737373] uppercase tracking-[0.14em] pt-1">
                        Our atelier will notify you directly when {product.Name} is crafted next.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleNotifySubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="stock-request-whatsapp" className="text-xs uppercase tracking-wider text-[#121212]">WhatsApp Number</Label>
                        <Input
                            id="stock-request-whatsapp"
                            type="tel"
                            value={notifyForm.whatsappNumber}
                            onChange={handleNotifyFieldChange('whatsappNumber')}
                            placeholder="+92 300 1234567"
                            className="rounded-none border-[#E8E5DF] bg-white focus-visible:ring-[#121212]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="stock-request-email" className="text-xs uppercase tracking-wider text-[#121212]">Email Address</Label>
                        <Input
                            id="stock-request-email"
                            type="email"
                            value={notifyForm.email}
                            onChange={handleNotifyFieldChange('email')}
                            placeholder="patron@example.com"
                            className="rounded-none border-[#E8E5DF] bg-white focus-visible:ring-[#121212]"
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setNotifyModalOpen(false)}
                            disabled={notifySubmitting}
                            className="rounded-none border-[#E8E5DF] uppercase tracking-wider text-xs"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={notifySubmitting}
                            className="rounded-none bg-[#121212] text-white hover:bg-neutral-800 uppercase tracking-wider text-xs"
                        >
                            {notifySubmitting ? 'Recording Request...' : 'Notify Me'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        </>
    );
}
