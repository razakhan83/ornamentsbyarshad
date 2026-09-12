import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';

import mongooseConnect from '@/lib/mongooseConnect';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { getProductCategories } from '@/lib/productCategories';
import { normalizeProductImages } from '@/lib/productImages';
import { ensureProductImagesBlur } from '@/lib/serverImageBlur';
import { formatSeoKeywords } from '@/lib/seoKeywords';
import { resolveStockStatus } from '@/lib/productCommerce';
import { getProductRating, normalizeProductRating, seedProductRating } from '@/lib/productReviewUtils';

const PUBLIC_PRODUCT_SELECT = 'Name Description shortDescription seoTitle seoDescription seoKeywords seoCanonicalUrl seoOgTitle seoOgDescription seoOgImage seoOgImageRatio Price compareAtPrice Images Category StockStatus slug showOnStore createdAt updatedAt stockQuantity isUnlimitedStock isNewArrival isBestSelling isFeatured featuredPriority tags primaryTag metalType purity plating grossWeightGrams certificateNumber size availableSizes availableColors gemstone customReviewCount rating';

function toPublicProductPayload(product) {
    const {
        Image,
        ImageURL,
        vendors,
        packOptions,
        discountPercentage,
        isDiscounted,
        discountedPrice,
        isFreeDelivery,
        ...safeProduct
    } = product;

    return {
        ...safeProduct,
        _id: safeProduct._id.toString(),
        id: safeProduct.slug || safeProduct._id.toString(),
        Category: getProductCategories(safeProduct),
        Images: normalizeProductImages(safeProduct.Images),
        rating: getProductRating(safeProduct),
        stockQuantity: Math.max(0, Number(safeProduct.stockQuantity) || 0),
    };
}

export function resolveProductQuery(id) {
    const rawId = String(id || '').trim();
    if (!rawId) return { _id: null };

    let decoded = rawId;
    try {
        decoded = decodeURIComponent(rawId).trim();
    } catch {}

    const hyphenCandidate = decoded.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    const candidates = Array.from(new Set([rawId, decoded, rawId.toLowerCase(), decoded.toLowerCase(), hyphenCandidate])).filter(Boolean);

    const validObjectIds = candidates
        .filter((val) => mongoose.Types.ObjectId.isValid(val) && val.length === 24 && String(new mongoose.Types.ObjectId(val)) === val)
        .map((val) => new mongoose.Types.ObjectId(val));

    if (validObjectIds.length > 0) {
        return {
            $or: [
                { _id: { $in: validObjectIds } },
                { slug: { $in: candidates } }
            ]
        };
    }

    return { slug: { $in: candidates } };
}

export async function GET(_request, { params }) {
    try {
        await mongooseConnect();

        const { id } = await params;
        const query = resolveProductQuery(id);
        let product = await Product.findOne(query)
            .select(PUBLIC_PRODUCT_SELECT)
            .populate({ path: 'Category', select: 'name slug bgColor' })
            .lean();

        if (!product && typeof id === 'string' && id.trim()) {
            const escaped = id.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            product = await Product.findOne({ slug: { $regex: new RegExp(`^${escaped}$`, 'i') } })
                .select(PUBLIC_PRODUCT_SELECT)
                .populate({ path: 'Category', select: 'name slug bgColor' })
                .lean();
        }

        if (!product) {
            return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: toPublicProductPayload(product),
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.isAdmin) {
            return NextResponse.json({ success: false, message: 'Unauthorized Access' }, { status: 401 });
        }
        if (session.user?.isDemo) {
            return NextResponse.json({ success: false, message: 'Demo Mode: Actions are disabled. You have read-only access.' }, { status: 403 });
        }

        await mongooseConnect();

        const { id } = await params;
        const body = await request.json();
        const query = resolveProductQuery(id);
        const existingProduct = await Product.findOne(query);

        if (!existingProduct) {
            return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
        }

        if (Object.keys(body).length === 1 && Object.prototype.hasOwnProperty.call(body, 'showOnStore')) {
            existingProduct.showOnStore = body.showOnStore === true || body.showOnStore === 'true';
            await existingProduct.save();
            revalidateTag('products');
            if (existingProduct.slug) {
                revalidateTag(`product-${existingProduct.slug}`);
            }
            revalidateTag(`product-${existingProduct._id.toString()}`);
            revalidatePath(`/products/${existingProduct.slug}`);
            revalidatePath(`/products/${existingProduct._id.toString()}`);
            revalidateTag('admin-dashboard');
            revalidateTag('home-sections');
            revalidatePath('/admin/products');
            revalidatePath('/products');
            revalidatePath('/');
            return NextResponse.json({
                success: true,
                data: {
                    _id: existingProduct._id.toString(),
                    showOnStore: existingProduct.showOnStore,
                }
            });
        }

        if (Object.keys(body).length > 1) {
            if (!body.Name || !body.Price) {
                return NextResponse.json({ success: false, message: 'Please provide Name and Price' }, { status: 400 });
            }
            if (!body.Images || !Array.isArray(body.Images) || body.Images.length === 0) {
                return NextResponse.json({ success: false, message: 'Please provide at least one product image' }, { status: 400 });
            }
        }

        const categoryInput = Array.isArray(body.Category)
            ? body.Category
            : [body.Category].filter(Boolean);
        const categories = await Category.find({ _id: { $in: categoryInput } }, '_id').lean();
        const validCategoryIdSet = new Set(categories.map((category) => category._id.toString()));
        const categoryArray = categoryInput.filter((id) => validCategoryIdSet.has(String(id)));

        if (categoryArray.length === 0) {
            return NextResponse.json({ success: false, message: 'Please provide valid categories' }, { status: 400 });
        }

        const normalizedImages = await ensureProductImagesBlur(normalizeProductImages(body.Images));
        const previousSlug = existingProduct.slug;
        const normalizedCompareAtPrice = body.compareAtPrice === '' || body.compareAtPrice == null
            ? null
            : Number(body.compareAtPrice);

        existingProduct.Name = body.Name;
        existingProduct.Description = body.Description;
        existingProduct.shortDescription = typeof body.shortDescription === 'string' ? body.shortDescription.trim() : '';
        existingProduct.seoTitle = typeof body.seoTitle === 'string' ? body.seoTitle.trim() : '';
        existingProduct.seoDescription = typeof body.seoDescription === 'string' ? body.seoDescription.trim() : '';
        existingProduct.seoKeywords = formatSeoKeywords(body.seoKeywords);
        existingProduct.seoCanonicalUrl = typeof body.seoCanonicalUrl === 'string' ? body.seoCanonicalUrl.trim() : '';
        existingProduct.seoOgTitle = typeof body.seoOgTitle === 'string' ? body.seoOgTitle.trim() : '';
        existingProduct.seoOgDescription = typeof body.seoOgDescription === 'string' ? body.seoOgDescription.trim() : '';
        existingProduct.seoOgImage = typeof body.seoOgImage === 'string' && !body.seoOgImage.startsWith('data:') && body.seoOgImage.length < 2000 ? body.seoOgImage.trim() : '';
        existingProduct.seoOgImageRatio = body.seoOgImageRatio === '1:1' ? '1:1' : '1.91:1';
        existingProduct.Price = Number(body.Price);
        existingProduct.compareAtPrice = Number.isFinite(normalizedCompareAtPrice) ? normalizedCompareAtPrice : null;
        existingProduct.Images = normalizedImages;
        existingProduct.Category = categoryArray;
        existingProduct.set('tags', Array.isArray(body.tags) ? body.tags : [], { strict: false });
        existingProduct.set('primaryTag', body.primaryTag || '', { strict: false });
        existingProduct.showOnStore = body.showOnStore !== false && body.showOnStore !== 'false';
        
        existingProduct.isNewArrival = body.isNewArrival === true || body.isNewArrival === 'true';
        existingProduct.isBestSelling = body.isBestSelling === true || body.isBestSelling === 'true';
        existingProduct.isFeatured = body.isFeatured === true || body.isFeatured === 'true';
        if (body.featuredPriority !== undefined) {
            existingProduct.featuredPriority = Number(body.featuredPriority) || 0;
        }

        if (body.isUnlimitedStock !== undefined) {
            existingProduct.isUnlimitedStock = Boolean(body.isUnlimitedStock);
            if (existingProduct.isUnlimitedStock) {
                existingProduct.stockQuantity = 9999;
                existingProduct.StockStatus = 'In Stock';
            }
        }

        if (body.stockQuantity !== undefined && !existingProduct.isUnlimitedStock) {
            const nextQuantity = Math.max(0, Number(body.stockQuantity) || 0);
            existingProduct.stockQuantity = nextQuantity;
            existingProduct.StockStatus = resolveStockStatus(nextQuantity, body.StockStatus);
        }

        existingProduct.rating = body.rating !== undefined && body.rating !== '' && body.rating != null
            ? normalizeProductRating(body.rating, existingProduct)
            : (existingProduct.rating || seedProductRating(existingProduct));

        // Jewelry specifications
        if (body.metalType !== undefined) existingProduct.metalType = typeof body.metalType === 'string' ? body.metalType.trim() : '';
        if (body.purity !== undefined) existingProduct.purity = typeof body.purity === 'string' ? body.purity.trim() : '';
        if (body.plating !== undefined) existingProduct.plating = typeof body.plating === 'string' ? body.plating.trim() : '';
        if (body.size !== undefined) existingProduct.size = typeof body.size === 'string' ? body.size.trim() : '';
        if (body.availableSizes !== undefined) existingProduct.availableSizes = Array.isArray(body.availableSizes) ? body.availableSizes : [];
        if (body.availableColors !== undefined) existingProduct.availableColors = Array.isArray(body.availableColors) ? body.availableColors : [];
        if (body.gemstone !== undefined) {
            existingProduct.gemstone = {
                cut: typeof body.gemstone?.cut === 'string' ? body.gemstone.cut.trim() : '',
                carat: body.gemstone?.carat !== '' && body.gemstone?.carat != null ? Number(body.gemstone.carat) : null,
                clarity: typeof body.gemstone?.clarity === 'string' ? body.gemstone.clarity.trim() : '',
                color: typeof body.gemstone?.color === 'string' ? body.gemstone.color.trim() : '',
                gemstoneType: typeof body.gemstone?.gemstoneType === 'string' ? body.gemstone.gemstoneType.trim() : '',
            };
        }
        if (body.grossWeightGrams !== undefined) {
            existingProduct.grossWeightGrams = body.grossWeightGrams !== '' && body.grossWeightGrams != null ? Number(body.grossWeightGrams) : null;
        }
        if (body.certificateNumber !== undefined) {
            existingProduct.certificateNumber = typeof body.certificateNumber === 'string' ? body.certificateNumber.trim() : '';
        }

        if (body.customReviewCount !== undefined) {
            existingProduct.customReviewCount = body.customReviewCount !== '' && body.customReviewCount != null
                ? Math.max(0, Number(body.customReviewCount))
                : null;
        }

        await existingProduct.save();
        await existingProduct.populate({ path: 'Category', select: 'name slug bgColor' });
        revalidateTag('products');
        if (previousSlug) {
            revalidateTag(`product-${previousSlug}`);
            revalidatePath(`/products/${previousSlug}`, 'page');
        }
        if (existingProduct.slug) {
            revalidateTag(`product-${existingProduct.slug}`);
            revalidatePath(`/products/${existingProduct.slug}`, 'page');
        }
        revalidateTag(`product-${existingProduct._id.toString()}`);
        revalidatePath(`/products/${existingProduct._id.toString()}`, 'page');
        revalidateTag('admin-dashboard');
        revalidateTag('home-sections');
        revalidatePath('/admin/products');
        revalidatePath('/products', 'page');
        revalidatePath('/', 'page');

        return NextResponse.json({
            success: true,
            data: toPublicProductPayload(existingProduct.toObject()),
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH — discount-only update (dedicated endpoint, no full product reload needed)
export async function PATCH(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.isAdmin) {
            return NextResponse.json({ success: false, message: 'Unauthorized Access' }, { status: 401 });
        }
        if (session.user?.isDemo) {
            return NextResponse.json({ success: false, message: 'Demo Mode: Actions are disabled. You have read-only access.' }, { status: 403 });
        }

        await mongooseConnect();

        const { id } = await params;
        const body = await request.json();
        const query = resolveProductQuery(id);

        if (body.stockQuantity !== undefined) {
            const nextQuantity = Math.max(0, Number(body.stockQuantity) || 0);
            const nextStatus = resolveStockStatus(nextQuantity, body.StockStatus);

            const updatedProduct = await Product.findOneAndUpdate(
                query,
                { $set: { stockQuantity: nextQuantity, StockStatus: nextStatus } },
                { new: true, runValidators: false, strict: false }
            ).lean();

            if (!updatedProduct) {
                return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
            }

            revalidateTag('products');
            if (updatedProduct.slug) {
                revalidateTag(`product-${updatedProduct.slug}`);
                revalidatePath(`/products/${updatedProduct.slug}`);
            }
            revalidateTag(`product-${updatedProduct._id.toString()}`);
            revalidatePath(`/products/${updatedProduct._id.toString()}`);
            revalidateTag('admin-dashboard');
            revalidateTag('home-sections');
            revalidatePath('/admin/products');
            revalidatePath('/products');
            revalidatePath('/');

            return NextResponse.json({
                success: true,
                data: {
                    _id: updatedProduct._id.toString(),
                    stockQuantity: Number(updatedProduct.stockQuantity || 0),
                    StockStatus: updatedProduct.StockStatus,
                },
            });
        }

        // Handle StockStatus toggle
        if (body.StockStatus !== undefined) {
            const current = await Product.findOne(query).select('stockQuantity').lean();
            if (!current) {
                return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
            }
            const nextStatus = resolveStockStatus(current.stockQuantity, body.StockStatus);

            const updatedProduct = await Product.findOneAndUpdate(
                query,
                { $set: { StockStatus: nextStatus } },
                { new: true, runValidators: false, strict: false }
            ).lean();

            if (!updatedProduct) {
                return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
            }

            revalidateTag('products');
            if (updatedProduct.slug) {
                revalidateTag(`product-${updatedProduct.slug}`);
                revalidatePath(`/products/${updatedProduct.slug}`);
            }
            revalidateTag(`product-${updatedProduct._id.toString()}`);
            revalidatePath(`/products/${updatedProduct._id.toString()}`);
            revalidateTag('admin-dashboard');
            revalidateTag('home-sections');
            revalidatePath('/admin/products');
            revalidatePath('/products');
            revalidatePath('/');

            return NextResponse.json({
                success: true,
                data: {
                    _id: updatedProduct._id.toString(),
                    StockStatus: updatedProduct.StockStatus,
                    stockQuantity: Number(updatedProduct.stockQuantity || 0),
                },
            });
        }

        // Handle Marketing flags toggle
        if (body.isNewArrival !== undefined || body.isBestSelling !== undefined || body.isFeatured !== undefined || body.featuredPriority !== undefined) {
            const updateFields = {};
            if (body.isNewArrival !== undefined) updateFields.isNewArrival = body.isNewArrival === true || body.isNewArrival === 'true';
            if (body.isBestSelling !== undefined) updateFields.isBestSelling = body.isBestSelling === true || body.isBestSelling === 'true';
            if (body.isFeatured !== undefined) updateFields.isFeatured = body.isFeatured === true || body.isFeatured === 'true';
            if (body.featuredPriority !== undefined) updateFields.featuredPriority = Number(body.featuredPriority) || 0;

            const updatedProduct = await Product.findOneAndUpdate(
                query,
                { $set: updateFields },
                { new: true, runValidators: false, strict: false }
            ).lean();

            if (!updatedProduct) {
                return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
            }

            revalidateTag('products');
            if (updatedProduct.slug) {
                revalidateTag(`product-${updatedProduct.slug}`);
                revalidatePath(`/products/${updatedProduct.slug}`);
            }
            revalidateTag(`product-${updatedProduct._id.toString()}`);
            revalidatePath(`/products/${updatedProduct._id.toString()}`);
            revalidateTag('admin-dashboard');
            revalidateTag('home-sections');
            revalidatePath('/admin/products');
            revalidatePath('/products');
            revalidatePath('/');

            return NextResponse.json({
                success: true,
                data: {
                    _id: updatedProduct._id.toString(),
                    isNewArrival: updatedProduct.isNewArrival,
                    isBestSelling: updatedProduct.isBestSelling,
                    isFeatured: updatedProduct.isFeatured,
                    featuredPriority: updatedProduct.featuredPriority,
                },
            });
        }

        if (body.compareAtPrice !== undefined) {
            const nextCompare = body.compareAtPrice === '' || body.compareAtPrice == null
                ? null
                : Number(body.compareAtPrice);
            const compareAtPrice = Number.isFinite(nextCompare) && nextCompare > 0 ? nextCompare : null;

            const updatedProduct = await Product.findOneAndUpdate(
                query,
                { $set: { compareAtPrice } },
                { new: true, runValidators: false, strict: false }
            ).lean();

            if (!updatedProduct) {
                return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
            }

            revalidateTag('products');
            if (updatedProduct.slug) {
                revalidateTag(`product-${updatedProduct.slug}`);
                revalidatePath(`/products/${updatedProduct.slug}`);
            }
            revalidateTag(`product-${updatedProduct._id.toString()}`);
            revalidatePath(`/products/${updatedProduct._id.toString()}`);
            revalidateTag('admin-dashboard');
            revalidateTag('home-sections');
            revalidatePath('/admin/products');
            revalidatePath('/products');
            revalidatePath('/');

            return NextResponse.json({
                success: true,
                data: {
                    _id: updatedProduct._id.toString(),
                    compareAtPrice: updatedProduct.compareAtPrice ?? null,
                    Price: Number(updatedProduct.Price || 0),
                },
            });
        }

        return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 });
    } catch (error) {
        console.error('[PATCH product] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE a product by ID - Protected Admin Route
export async function DELETE(_request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.isAdmin) {
            return NextResponse.json({ success: false, message: 'Unauthorized Access' }, { status: 401 });
        }
        if (session.user?.isDemo) {
            return NextResponse.json({ success: false, message: 'Demo Mode: Actions are disabled. You have read-only access.' }, { status: 403 });
        }

        await mongooseConnect();

        const { id } = await params;
        const query = resolveProductQuery(id);
        const deletedProduct = await Product.findOneAndDelete(query);

        if (!deletedProduct) {
            return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
        }

        revalidateTag('products');
        if (deletedProduct.slug) {
            revalidateTag(`product-${deletedProduct.slug}`);
            revalidatePath(`/products/${deletedProduct.slug}`);
        }
        revalidateTag(`product-${deletedProduct._id.toString()}`);
        revalidatePath(`/products/${deletedProduct._id.toString()}`);
        revalidateTag('admin-dashboard');
        revalidateTag('home-sections');
        revalidatePath('/admin/products');
        revalidatePath('/products');

        return NextResponse.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
