'use client';

import Image from 'next/image';
import { useCartActions } from '@/context/CartContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import { getProductCategoryNames, getProductCategoryBgColor } from '@/lib/productCategories';
import { getPrimaryProductImage } from '@/lib/productImages';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { buildProductWhatsAppMessage, createWhatsAppUrl } from '@/lib/whatsapp';
import { X, ShoppingCart, Image as ImageIcon } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';

export default function ProductModal({ product, onClose, whatsappNumber = '', storeName = 'Ornaments by Arshad' }) {
    const { addToCart } = useCartActions();

    if (!product) return null;

    const formatPrice = (raw) => {
        let cleanNumbers = String(raw).replace(/[^\d.]/g, '');
        if (!cleanNumbers) return 'Rs.\u00A00';
        return `Rs.\u00A0${Number(cleanNumbers).toLocaleString('en-PK')}`;
    };

    const categories = getProductCategoryNames(product);
    const primaryImage = getPrimaryProductImage(product);
    const primaryImageSrc = primaryImage?.url
        ? optimizeCloudinaryUrl(primaryImage.url, CLOUDINARY_IMAGE_PRESETS.productModal)
        : '';
    const productUrl = typeof window !== 'undefined' ? window.location.href : '';
    const whatsappUrl = createWhatsAppUrl(
        whatsappNumber,
        buildProductWhatsAppMessage({
            productName: product.Name || product.name || 'Premium Item',
            productUrl,
            storeName,
        }),
    );

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-fadeIn"
                onClick={onClose}
            >
                {/* Modal */}
                <div
                    className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card border border-border/80 shadow-2xl animate-fadeInUp"
                    style={{ willChange: 'transform, opacity' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                        <X className="size-4.5" />
                    </button>

                    <div className="flex flex-col md:flex-row">
                        <div 
                            className="relative aspect-square w-full overflow-hidden group md:min-h-[300px] md:w-1/2 md:aspect-auto"
                            style={{ backgroundColor: getProductCategoryBgColor(product) }}
                        >
                            {primaryImageSrc ? (
                                <Image
                                    src={primaryImageSrc}
                                    alt={product.Name || product.name || 'Product'}
                                    fill
                                    sizes="(max-width: 768px) 90vw, 28rem"
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    {...getBlurPlaceholderProps(primaryImage.blurDataURL)}
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
                                    <ImageIcon className="size-12 opacity-20" />
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-1/2 p-6 md:p-7 flex flex-col justify-center">
                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                                {categories.length > 0 ? (
                                    categories.map((cat, i) => (
                                        <Badge key={i} variant="secondary" className="rounded-md">
                                            {cat}
                                        </Badge>
                                    ))
                                ) : (
                                    <Badge variant="secondary" className="rounded-md">Premium Item</Badge>
                                )}
                            </div>

                            <h2 className="mb-2 text-xl font-bold leading-tight text-foreground sm:text-2xl">
                                {product.Name || product.name}
                            </h2>
                            <div className="mb-3 text-2xl font-extrabold tracking-tight text-primary tabular-nums">
                                {formatPrice(product.Price || product.price)}
                            </div>
                            <p className="mb-5 text-sm leading-relaxed text-muted-foreground line-clamp-4">
                                {product.Description || product.description || "Discover timeless luxury and handcrafted elegance. This fine piece from Ornaments by Arshad is crafted with exceptional precision and purity."}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-2.5 mt-auto pt-2">
                                <Button
                                    onClick={async () => {
                                        const result = await addToCart(product);
                                        if (result?.success) {
                                            onClose();
                                        }
                                    }}
                                    className="flex-1 h-11 rounded-[6px] font-semibold text-xs uppercase tracking-[0.18em] shadow-none active:scale-[0.98] transition-all duration-300 bg-[#A67C52] border border-[#A67C52] text-white hover:bg-[#121212] hover:border-[#121212] hover:text-white cursor-pointer"
                                >
                                    <ShoppingCart className="size-4 mr-2" /> Add to Cart
                                </Button>

                                <a
                                    href={whatsappUrl || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1"
                                >
                                    <button
                                        type="button"
                                        className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-[6px] border border-[#E8E5DF] bg-transparent text-[#121212] font-semibold text-xs uppercase tracking-[0.18em] transition-all duration-300 active:scale-[0.98] cursor-pointer shadow-none md:bg-transparent md:hover:bg-[#25D366] md:hover:border-[#25D366] md:hover:text-white group"
                                    >
                                        <WhatsAppIcon className="size-4 text-[#A67C52] group-hover:text-white transition-colors shrink-0" />
                                        <span>Order on WhatsApp</span>
                                    </button>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
