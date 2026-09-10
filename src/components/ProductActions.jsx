'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartActions } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import ProductWishlistButton from '@/components/ProductWishlistButton';
import { cn } from '@/lib/utils';
import { BellRing, ShoppingCart, Share2, Minus, Plus, BadgeCheck, PackageCheck, Truck } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { toast } from 'sonner';
import { buildProductWhatsAppMessage, createWhatsAppUrl } from '@/lib/whatsapp';
import { getProductTagById } from '@/lib/productTags';
import { flyToCart } from '@/lib/flyToCart';
import { useActionLock } from '@/hooks/useActionLock';

export function ProductSocialActions({ product, className = '' }) {
    const handleShare = async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const title = product.Name || product.name || 'Check out this product!';

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

    const secondaryActionClass =
        "h-11 shrink-0 rounded-xl border-[color:color-mix(in_oklab,var(--color-primary)_16%,var(--color-border))] bg-[color:color-mix(in_oklab,var(--color-input)_92%,white)] text-foreground shadow-[0_1px_0_color-mix(in_oklab,var(--color-background)_65%,white)] transition-all duration-300 hover:bg-[color:color-mix(in_oklab,var(--color-muted)_74%,white)] active:scale-[0.96]";

    return (
        <div className={cn('flex gap-3', className)}>
            <Button
                onClick={handleShare}
                variant="outline"
                className={cn(secondaryActionClass, "size-11 px-0 hover:text-blue-500 hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-500/10")}
                title="Share"
            >
                <Share2 className="size-5" />
            </Button>
            <ProductWishlistButton
                product={product}
                mode="detail"
                className={cn(secondaryActionClass, "hidden md:inline-flex size-11 shrink-0 px-0 [&>span]:hidden hover:text-red-500 hover:border-red-500/40 hover:bg-red-50/50 dark:hover:bg-red-500/10")}
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
            toast.error('WhatsApp number is not available right now.');
            return;
        }
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <button
            type="button"
            onClick={handleWhatsApp}
            className={cn(
                "w-full h-11 sm:h-12 flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground font-bold text-sm transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-none",
                className
            )}
        >
            <WhatsAppIcon className="size-5 text-[#25D366] shrink-0" />
            <span className="font-bold text-sm text-foreground">Order on WhatsApp</span>
        </button>
    );
}

export default function ProductActions({ product, whatsappNumber = '', storeName = 'Ornaments by Arshad', basePrice = 0, compareAtPrice = null }) {
    const { addToCart } = useCartActions();
    const router = useRouter();
    const packOptions = Array.isArray(product?.packOptions) ? product.packOptions : [];
    const [selectedPack, setSelectedPack] = useState(packOptions.length > 0 ? packOptions[0] : null);
    const addLock = useActionLock();
    const buyLock = useActionLock();
    const [didJustAdd, setDidJustAdd] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [notifyModalOpen, setNotifyModalOpen] = useState(false);
    const [notifySubmitting, setNotifySubmitting] = useState(false);
    const [notifyForm, setNotifyForm] = useState({
        whatsappNumber: '',
        email: '',
    });
    const [isBottomNavHidden, setIsBottomNavHidden] = useState(false);

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
            const productToAdd = selectedPack ? {
                ...product,
                Price: selectedPack.price,
                discountedPrice: selectedPack.price,
                discountPercentage: 0,
                isDiscounted: false,
                packLabel: selectedPack.label,
                isFreeDelivery: Boolean(product?.isFreeDelivery),
            } : {
                ...product,
                isFreeDelivery: Boolean(product?.isFreeDelivery),
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
            window.setTimeout(() => setDidJustAdd(false), 650);
        }
    });

    const handleBuyNow = () => buyLock.run(async () => {
        if (isOutOfStock) return;
        try {
            const productToAdd = selectedPack ? {
                ...product,
                Price: selectedPack.price,
                discountedPrice: selectedPack.price,
                discountPercentage: 0,
                isDiscounted: false,
                packLabel: selectedPack.label,
                isFreeDelivery: Boolean(product?.isFreeDelivery),
            } : {
                ...product,
                isFreeDelivery: Boolean(product?.isFreeDelivery),
            };

            const result = await addToCart(productToAdd, quantity);
            if (result?.success) {
                router.push('/checkout');
            }
        } catch (error) {
            toast.error('Failed to proceed to checkout.');
        }
    });

    const handleWhatsApp = () => {
        const name = product.Name || product.name || 'this product';
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const message = buildProductWhatsAppMessage({
            productName: name,
            productUrl: url,
            storeName,
        });
        const whatsappUrl = createWhatsAppUrl(whatsappNumber, message);
        if (!whatsappUrl) {
            toast.error('WhatsApp number is not available right now.');
            return;
        }
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    const isOutOfStock = product.StockStatus === "Out of Stock" || product.showOnStore === false;
    const secondaryActionClass =
        "h-11 shrink-0 rounded-xl border-[color:color-mix(in_oklab,var(--color-primary)_16%,var(--color-border))] bg-[color:color-mix(in_oklab,var(--color-input)_92%,white)] text-foreground shadow-[0_1px_0_color-mix(in_oklab,var(--color-background)_65%,white)] transition-[border-color,background-color,box-shadow,color,transform] duration-200 hover:bg-[color:color-mix(in_oklab,var(--color-muted)_74%,white)] hover:text-foreground active:scale-[0.96]";

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

            toast.success(data.message || 'We will notify you when this item is back in stock.');
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
        const quantity = match ? parseInt(match[0], 10) : 1;
        const calculatedCompare = compareAtPrice * quantity;
        
        return calculatedCompare > selectedPack.price ? calculatedCompare : null;
    })();

    return (
        <>
        <div className="flex flex-col gap-6 md:gap-8">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        {formatPrice(displayPrice)}
                    </span>
                    {displayComparePrice ? (
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-medium text-muted-foreground line-through">
                                {formatPrice(displayComparePrice)}
                            </span>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200 shadow-none font-bold tracking-wide">
                                Save {formatPrice(displayComparePrice - displayPrice)}
                            </Badge>
                        </div>
                    ) : null}
                </div>

                {Array.isArray(product.tags) && product.tags.filter(tagId => tagId !== product.primaryTag).length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        {product.tags.filter(tagId => tagId !== product.primaryTag).map(tagId => {
                            const tag = getProductTagById(tagId);
                            if (!tag) return null;
                            const Icon = tag.icon;
                            return (
                                <Badge 
                                    key={tag.id}
                                    variant="outline" 
                                    className={cn("text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-md border-0 shadow-none flex items-center gap-1.5", tag.bgColor, tag.color)}
                                >
                                    <Icon className="size-3.5" />
                                    {tag.label}
                                </Badge>
                            );
                        })}
                    </div>
                )}
            </div>

            {packOptions.length > 1 && (
                <div className="space-y-2.5">
                    <span className="text-xs sm:text-sm font-semibold text-foreground">Pack Options</span>
                    <div className="flex flex-wrap gap-2">
                        {packOptions.map((pack, idx) => {
                            const isSelected = selectedPack?.label === pack.label;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedPack(pack)}
                                    className={cn(
                                        "flex h-8 min-w-[62px] items-center justify-center whitespace-nowrap rounded-lg px-3 text-xs sm:text-[13px] font-semibold transition-all duration-200 active:scale-[0.96] outline-none cursor-pointer",
                                        isSelected
                                            ? "bg-foreground text-background border border-foreground shadow-sm"
                                            : "border border-border bg-card text-foreground/75 hover:border-foreground/40 hover:text-foreground hover:bg-muted/50 font-medium"
                                    )}
                                >
                                    {pack.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {!isOutOfStock ? (
                <div className="hidden items-center gap-4 md:flex">
                    <span className="text-sm font-semibold text-foreground">Quantity</span>
                    <div className="inline-flex items-center overflow-hidden rounded-xl border border-border bg-background shadow-none">
                        <button
                            onClick={decrement}
                            className="inline-flex size-10 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Decrease quantity"
                        >
                            <Minus className="size-4" />
                        </button>
                        <span className="inline-flex min-w-12 items-center justify-center text-sm font-semibold text-foreground">{quantity}</span>
                        <button
                            onClick={increment}
                            className="inline-flex size-10 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Increase quantity"
                        >
                            <Plus className="size-4" />
                        </button>
                    </div>
                </div>
            ) : null}

            <div className="hidden gap-4 md:flex">
                {isOutOfStock ? (
                    <Button
                        onClick={() => setNotifyModalOpen(true)}
                        size="lg"
                        className="h-11 flex-1 rounded-xl active:scale-[0.96] shadow-none font-semibold"
                    >
                        <BellRing className="size-4.5" />
                        Notify Me When In Stock
                    </Button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={addLock.isPending || isOutOfStock}
                            className={cn(
                                "add-to-cart-button h-11 flex-1 inline-flex items-center justify-center rounded-xl active:scale-[0.96] font-semibold text-sm transition-all duration-200 border border-border text-foreground bg-card hover:bg-muted/50 hover:border-border shadow-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
                                addLock.isPending || isOutOfStock ? "bg-muted/20 text-foreground border-border/40 opacity-80" : "bg-card text-foreground border-border hover:border-border"
                            )}
                        >
                            <span className="relative inline-flex size-5 items-center justify-center mr-2">
                                <Spinner
                                    className={cn(
                                        "add-to-cart-icon absolute size-5",
                                        addLock.isPending ? "is-visible" : ""
                                    )}
                                />
                                <ShoppingCart
                                    className={cn(
                                        "add-to-cart-icon absolute size-5",
                                        !addLock.isPending ? "is-visible" : "",
                                        didJustAdd ? "text-primary" : ""
                                    )}
                                />
                            </span>
                            {didJustAdd ? "Added" : "Add to Cart"}
                        </button>
                        <Button
                            onClick={handleBuyNow}
                            disabled={buyLock.isPending || isOutOfStock}
                            className={cn(
                                "buy-now-button h-11 flex-1 rounded-xl active:scale-[0.96] font-semibold text-sm transition-all duration-200 border border-transparent shadow-none bg-primary text-primary-foreground hover:bg-primary/95",
                                buyLock.isPending ? "opacity-90 cursor-wait" : ""
                            )}
                            size="lg"
                        >
                            {buyLock.isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Spinner className="size-4 animate-spin text-primary-foreground" />
                                    <span>Opening Checkout...</span>
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <PackageCheck className="size-4" />
                                    <span>Buy Now</span>
                                </span>
                            )}
                        </Button>
                    </>
                )}
                <ProductSocialActions product={product} />
            </div>

            <div 
                className="product-sticky-bar fixed left-0 right-0 z-30 flex flex-col gap-2 border-t border-border/80 bg-background/98 p-2.5 backdrop-blur-md md:hidden transition-[bottom,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)] will-change-[bottom]"
                style={{
                    bottom: isBottomNavHidden
                        ? 'env(safe-area-inset-bottom, 0px)'
                        : 'calc(env(safe-area-inset-bottom, 0px) + var(--mobile-bottom-nav-offset, 58px))'
                }}
            >
                {!isOutOfStock ? (
                    <>
                        <div className="flex items-center gap-2">
                            <div className="inline-flex flex-[0.7] items-center justify-between overflow-hidden rounded-xl border border-border bg-background h-11 px-1 shadow-none">
                                <button onClick={decrement} aria-label="Decrease quantity" className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                    <Minus className="size-3.5" />
                                </button>
                                <span className="inline-flex min-w-6 items-center justify-center text-sm font-semibold text-foreground">{quantity}</span>
                                <button onClick={increment} aria-label="Increase quantity" className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                    <Plus className="size-3.5" />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={addLock.isPending || isOutOfStock}
                                className={cn(
                                    "add-to-cart-button h-11 flex-[1.3] inline-flex items-center justify-center rounded-xl active:scale-[0.96] font-semibold text-sm transition-all duration-200 border border-border text-foreground bg-card hover:bg-muted/50 hover:border-border shadow-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
                                    addLock.isPending || isOutOfStock ? "bg-muted/20 text-foreground border-border/40 opacity-80" : "bg-card text-foreground border-border hover:border-border"
                                )}
                            >
                                <span className="relative inline-flex size-4 items-center justify-center mr-1.5">
                                    <Spinner
                                        className={cn(
                                            "add-to-cart-icon absolute size-4",
                                            addLock.isPending ? "is-visible" : ""
                                        )}
                                    />
                                    <ShoppingCart
                                        className={cn(
                                            "add-to-cart-icon absolute size-4",
                                            !addLock.isPending ? "is-visible" : "",
                                            didJustAdd ? "text-primary" : ""
                                        )}
                                    />
                                </span>
                                {didJustAdd ? "Added" : "Add to Cart"}
                            </button>
                        </div>
                        <Button
                            onClick={handleBuyNow}
                            disabled={buyLock.isPending || isOutOfStock}
                            className={cn(
                                "buy-now-button h-11 w-full rounded-xl active:scale-[0.96] font-semibold text-sm transition-all duration-200 border border-transparent shadow-none bg-primary text-primary-foreground hover:bg-primary/95",
                                buyLock.isPending ? "opacity-90 cursor-wait" : ""
                            )}
                        >
                            {buyLock.isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Spinner className="size-4 animate-spin text-primary-foreground" />
                                    <span>Opening Checkout...</span>
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <PackageCheck className="size-4" />
                                    <span>Buy Now</span>
                                </span>
                            )}
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={() => setNotifyModalOpen(true)}
                        className="h-11 w-full rounded-xl active:scale-[0.96] font-bold text-sm"
                    >
                        <BellRing className="size-4 mr-2" />
                        Notify Me
                    </Button>
                )}
            </div>
        </div>
        <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Notify Me When In Stock</DialogTitle>
                    <DialogDescription>
                        Leave your WhatsApp number or email and we will save your restock request for {product.Name}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleNotifySubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="stock-request-whatsapp">WhatsApp Number</Label>
                        <Input
                            id="stock-request-whatsapp"
                            type="tel"
                            value={notifyForm.whatsappNumber}
                            onChange={handleNotifyFieldChange('whatsappNumber')}
                            placeholder="03XXXXXXXXX"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="stock-request-email">Email Address</Label>
                        <Input
                            id="stock-request-email"
                            type="email"
                            value={notifyForm.email}
                            onChange={handleNotifyFieldChange('email')}
                            placeholder="you@example.com"
                        />
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                        Enter at least one contact method. We will only use it for this restock alert.
                    </p>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setNotifyModalOpen(false)}
                            disabled={notifySubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={notifySubmitting}>
                            {notifySubmitting ? 'Saving...' : 'Save My Request'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        </>
    );
}
