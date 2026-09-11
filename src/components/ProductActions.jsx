'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartActions } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import ProductWishlistButton from '@/components/ProductWishlistButton';
import { cn } from '@/lib/utils';
import { Share2, Minus, Plus } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { toast } from 'sonner';
import { buildProductWhatsAppMessage, createWhatsAppUrl } from '@/lib/whatsapp';
import { flyToCart } from '@/lib/flyToCart';
import { useActionLock } from '@/hooks/useActionLock';

const METALS = [
    { id: '18k-yellow', label: '18K Yellow Gold', color: '#E5C378' },
    { id: '18k-white', label: '18K White Gold', color: '#E2E5E8' },
    { id: '18k-rose', label: '18K Rose Gold', color: '#EAB2A0' },
    { id: '22k-gold', label: '22K Gold', color: '#F3BA4F' },
    { id: 'platinum', label: 'Platinum 950', color: '#D5DCE2' },
];

const SIZES = ['US 5', 'US 6', 'US 7', 'US 8', 'US 9', 'Custom'];

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
                className="size-11 rounded-none border border-[#E8E5DF] bg-white text-[#121212] hover:bg-[#FAF9F6] transition-colors duration-200"
                title="Share this creation"
            >
                <Share2 className="size-4" />
            </Button>
            <ProductWishlistButton
                product={product}
                mode="detail"
                className="hidden md:inline-flex size-11 shrink-0 rounded-none border border-[#E8E5DF] bg-white text-[#121212] hover:bg-[#FAF9F6] [&>span]:hidden transition-colors duration-200"
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
                "w-full h-12 flex items-center justify-center gap-2.5 rounded-none border border-[#E8E5DF] bg-white hover:bg-[#FAF9F6] text-[#121212] uppercase tracking-[0.15em] text-xs font-semibold transition-all duration-300 cursor-pointer shadow-none",
                className
            )}
        >
            <WhatsAppIcon className="size-4.5 text-[#25D366] shrink-0" />
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
    const [specsOpen, setSpecsOpen] = useState(true);
    const packOptions = Array.isArray(product?.packOptions) ? product.packOptions : [];
    const [selectedPack, setSelectedPack] = useState(packOptions.length > 0 ? packOptions[0] : null);
    const [selectedMetal, setSelectedMetal] = useState(METALS[0]);
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

    const increment = () => setQuantity(q => q + 1);
    const decrement = () => setQuantity(q => (q > 1 ? q - 1 : 1));

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
                Price: selectedPack ? selectedPack.price : (product.discountedPrice ?? product.Price ?? basePrice),
                discountedPrice: selectedPack ? selectedPack.price : (product.discountedPrice ?? product.Price ?? basePrice),
                selectedMetal: product?.metalType || selectedMetal?.label,
                selectedSize: selectedSize || product?.size || undefined,
                selectedColor: selectedColor || undefined,
                packLabel: selectedPack?.label,
                isFreeDelivery: true,
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
                Price: selectedPack ? selectedPack.price : (product.discountedPrice ?? product.Price ?? basePrice),
                discountedPrice: selectedPack ? selectedPack.price : (product.discountedPrice ?? product.Price ?? basePrice),
                selectedMetal: product?.metalType || selectedMetal?.label,
                selectedSize: selectedSize || product?.size || undefined,
                selectedColor: selectedColor || undefined,
                packLabel: selectedPack?.label,
                isFreeDelivery: true,
            };

            const result = await addToCart(productToAdd, quantity);
            if (result?.success) {
                router.push('/checkout');
            }
        } catch (error) {
            toast.error('Failed to proceed to checkout.');
        }
    });

    const isOutOfStock = product.StockStatus === "Out of Stock" || product.showOnStore === false;

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
    const displayPrice = selectedPack ? selectedPack.price : basePrice;
    const displayComparePrice = (() => {
        if (!compareAtPrice) return null;
        if (!selectedPack) return compareAtPrice > basePrice ? compareAtPrice : null;
        const match = selectedPack.label.match(/\d+/);
        const qty = match ? parseInt(match[0], 10) : 1;
        const calculatedCompare = compareAtPrice * qty;
        return calculatedCompare > selectedPack.price ? calculatedCompare : null;
    })();

    // Has any jewelry specification
    const hasJewelrySpecs = Boolean(
        product?.metalType ||
        product?.purity ||
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
        <div className="flex flex-col gap-4 sm:gap-5">
            {/* Price Row */}
            <div className="flex flex-wrap items-baseline gap-x-3 sm:gap-x-4 gap-y-1.5 border-b border-[#E8E5DF] pb-3 sm:pb-4">
                <span className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#121212] tracking-wide font-normal">
                    {formatPrice(displayPrice)}
                </span>
                {displayComparePrice ? (
                    <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base text-[#737373] line-through">
                            {formatPrice(displayComparePrice)}
                        </span>
                        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-[#A67C52] bg-[#A67C52]/10 px-2 py-0.5 rounded-xs">
                            Save {formatPrice(displayComparePrice - displayPrice)}
                        </span>
                    </div>
                ) : null}
            </div>

            {/* Stock Indicator */}
            <div className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", isOutOfStock ? "bg-red-500 animate-pulse" : "bg-emerald-500")} />
              <span className="text-xs font-medium text-[#121212]">
                {isOutOfStock ? "Out of Stock" : `${product.stockQuantity || 1} item in stock`}
              </span>
            </div>

            {/* Dynamic Color Variant Selection Pills (Shown only if colors are entered) */}
            {colorList.length > 0 && (
                <div className="space-y-2 pt-1">
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
                                        "relative px-3.5 py-1.5 text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer rounded-xl border",
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
                <div className="space-y-2 pt-1">
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
                                        "relative px-3.5 py-1.5 text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer rounded-xl border",
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
                <div className="border-y border-[#E8E5DF] py-3 my-0.5">
                    <button
                        type="button"
                        onClick={() => setSpecsOpen(!specsOpen)}
                        className="flex w-full items-center justify-between text-left font-serif text-sm font-medium text-[#121212] uppercase tracking-wider cursor-pointer"
                    >
                        <span>Jewelry Specifications</span>
                        <span className="text-lg font-light leading-none">{specsOpen ? "−" : "+"}</span>
                    </button>
                    {specsOpen && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-[#E8E5DF] bg-[#FAF9F6]">
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

            {/* Description Accordion */}
            <div className="border-b border-[#E8E5DF] pb-3 my-0.5">
              <button
                type="button"
                onClick={() => setDescriptionOpen(!descriptionOpen)}
                className="flex w-full items-center justify-between text-left font-serif text-sm font-medium text-[#121212] uppercase tracking-wider cursor-pointer"
              >
                <span>Description</span>
                <span className="text-lg font-light leading-none">{descriptionOpen ? "−" : "+"}</span>
              </button>
              {descriptionOpen && (
                <div className="mt-3 text-xs leading-relaxed text-[#737373] space-y-2">
                  <p>{product.shortDescription || product.Description || "Handcrafted with precision using high-grade hallmarked gold and certified precious stones."}</p>
                </div>
              )}
            </div>

            {/* Quantity Selector & Action Buttons */}
            <div className="flex flex-col gap-3 pt-2">
                {/* Quantity Row */}
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#121212]">Quantity</span>
                    <div className="inline-flex items-center border border-[#E8E5DF] bg-white rounded-xl h-9">
                        <button
                            type="button"
                            onClick={decrement}
                            className="inline-flex size-9 items-center justify-center text-[#737373] hover:text-[#121212] transition-colors"
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
                            className="inline-flex size-9 items-center justify-center text-[#737373] hover:text-[#121212] transition-colors"
                            aria-label="Increase quantity"
                        >
                            <Plus className="size-3" />
                        </button>
                    </div>
                </div>

                {/* Primary CTA Buttons: Add to Cart (Onyx Black), Buy It Now (Clean Outline), WhatsApp (Emerald) */}
                <div className="flex flex-col gap-2.5 pt-1">
                    {isOutOfStock ? (
                        <Button
                            onClick={() => setNotifyModalOpen(true)}
                            className="h-12.5 w-full rounded-none bg-[#121212] text-white hover:bg-neutral-800 uppercase tracking-[0.2em] text-xs font-semibold shadow-xs"
                        >
                            Notify When Available
                        </Button>
                    ) : (
                        <>
                            {/* Primary Add to Cart Button (Solid Onyx Black #121212) */}
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={addLock.isPending || isOutOfStock}
                                className={cn(
                                    "add-to-cart-button h-12.5 w-full inline-flex items-center justify-center rounded-none font-semibold text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-xs bg-[#121212] hover:bg-[#A67C52] text-white disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                                )}
                            >
                                {addLock.isPending ? (
                                    <Spinner className="size-4 animate-spin mr-2" />
                                ) : null}
                                {didJustAdd ? "Added to Cart" : "Add to Cart"}
                            </button>

                            {/* Secondary Buy It Now Button (Clean Border #121212) */}
                            <button
                                type="button"
                                onClick={handleBuyNow}
                                disabled={buyLock.isPending || isOutOfStock}
                                className="buy-now-button h-12.5 w-full inline-flex items-center justify-center rounded-none font-semibold text-xs uppercase tracking-[0.2em] transition-all duration-300 border border-[#121212] text-[#121212] hover:bg-[#121212] hover:text-white bg-transparent active:scale-[0.98] cursor-pointer"
                            >
                                {buyLock.isPending ? (
                                    <Spinner className="size-4 animate-spin mr-2" />
                                ) : null}
                                Buy It Now
                            </button>
                        </>
                    )}

                    {/* Order on WhatsApp Button (Refined Luxury Styling) */}
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
                        className="w-full h-12.5 inline-flex items-center justify-center gap-2.5 rounded-none border border-[#121212]/30 bg-[#FAF9F6] hover:bg-[#121212] text-[#121212] hover:text-white text-xs uppercase tracking-[0.18em] font-semibold transition-all duration-300 shadow-none active:scale-[0.98] cursor-pointer group"
                    >
                        <WhatsAppIcon className="size-4 text-[#121212] group-hover:text-white transition-colors shrink-0" />
                        <span>Order on WhatsApp</span>
                    </button>
                </div>
            </div>

            {/* Guarantee Safe & Secure Checkout with Bank Badges */}
            <div className="border-t border-[#E8E5DF] pt-6 mt-2 text-center">
                <p className="text-[11px] font-sans uppercase tracking-[0.2em] font-semibold text-[#121212] mb-3">
                    GUARANTEE SAFE & SECURE CHECKOUT
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 opacity-90">
                    <div className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-white border border-[#E8E5DF] shadow-xs text-[10.5px] font-bold text-[#1F2937]">
                        Meezan Bank
                    </div>
                    <div className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-white border border-[#E8E5DF] shadow-xs text-[10.5px] font-bold text-emerald-600">
                        easypaisa
                    </div>
                    <div className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-white border border-[#E8E5DF] shadow-xs text-[10.5px] font-bold text-teal-600">
                        SadaPay
                    </div>
                    <div className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-white border border-[#E8E5DF] shadow-xs text-[10.5px] font-bold text-orange-600">
                        NayaPay
                    </div>
                    <div className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-white border border-[#E8E5DF] shadow-xs text-[10.5px] font-bold text-red-600">
                        JazzCash
                    </div>
                </div>
            </div>
        </div>

        {/* Size Guide Modal */}
        <Dialog open={sizeGuideOpen} onOpenChange={setSizeGuideOpen}>
            <DialogContent className="sm:max-w-lg rounded-none border border-[#E8E5DF] bg-[#FAF9F6] p-6">
                <DialogHeader>
                    <DialogTitle className="font-serif text-xl tracking-wide text-[#121212] font-normal">
                        Jewelry & Ring Size Guide
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#737373] uppercase tracking-[0.15em] pt-1">
                        Find your perfect fit with our atelier measurement standards
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <div className="overflow-x-auto border border-[#E8E5DF] bg-white">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-[#E8E5DF] bg-[#FAF9F6] text-[11px] uppercase tracking-wider text-[#737373]">
                                <tr>
                                    <th className="p-2.5">US Size</th>
                                    <th className="p-2.5">Inside Diameter (mm)</th>
                                    <th className="p-2.5">Inside Circumference (mm)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E8E5DF] text-[#121212]">
                                <tr><td className="p-2.5 font-semibold">US 5</td><td className="p-2.5">15.7 mm</td><td className="p-2.5">49.3 mm</td></tr>
                                <tr><td className="p-2.5 font-semibold">US 6</td><td className="p-2.5">16.5 mm</td><td className="p-2.5">51.9 mm</td></tr>
                                <tr><td className="p-2.5 font-semibold">US 7</td><td className="p-2.5">17.3 mm</td><td className="p-2.5">54.4 mm</td></tr>
                                <tr><td className="p-2.5 font-semibold">US 8</td><td className="p-2.5">18.1 mm</td><td className="p-2.5">57.0 mm</td></tr>
                                <tr><td className="p-2.5 font-semibold">US 9</td><td className="p-2.5">18.9 mm</td><td className="p-2.5">59.5 mm</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-white p-3 border border-[#E8E5DF] text-xs text-[#737373] leading-relaxed space-y-1">
                        <p className="font-semibold text-[#121212] uppercase tracking-wider">How to measure:</p>
                        <p>1. Wrap a thin strip of paper snugly around your finger base.</p>
                        <p>2. Mark the exact overlap point with a pen.</p>
                        <p>3. Measure the millimeters against a ruler to find your circumference.</p>
                        <p className="text-[#A67C52] pt-1 font-medium">Need a custom size? Our master jeweler creates bespoke sizes on request via WhatsApp concierge.</p>
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
