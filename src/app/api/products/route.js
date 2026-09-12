import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import mongooseConnect from '@/lib/mongooseConnect';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { getProductCategories } from '@/lib/productCategories';
import { normalizeProductImages } from '@/lib/productImages';
import { ensureProductImagesBlur } from '@/lib/serverImageBlur';
import { formatSeoKeywords } from '@/lib/seoKeywords';
import { resolveStockStatus } from '@/lib/productCommerce';
import { generateNewProductRating, getProductRating, normalizeProductRating } from '@/lib/productReviewUtils';

const PUBLIC_PRODUCT_SELECT = 'Name Description shortDescription seoTitle seoDescription seoKeywords seoCanonicalUrl seoOgTitle seoOgDescription seoOgImage seoOgImageRatio Price compareAtPrice Images Category StockStatus slug showOnStore createdAt updatedAt stockQuantity isNewArrival isBestSelling isFeatured featuredPriority tags primaryTag metalType purity grossWeightGrams certificateNumber size availableSizes availableColors gemstone customReviewCount rating';

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

// Utility for formatting a string to a unique URL-friendly slug
const slugify = (text) => {
    return (text || '').toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

// GET all products - used by both Public Store and Admin 
export async function GET(req) {
    try {
        await mongooseConnect();

        // Support ?search= and ?limit= for admin product search
        const { searchParams } = new URL(req.url);
        const searchQuery = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit') || '0', 10);

        let filter = {};
        if (searchQuery.trim()) {
            const regex = new RegExp(searchQuery.trim(), 'i');
            filter = {
                $or: [
                    { Name: regex },
                    { shortDescription: regex },
                    { tags: regex },
                    { primaryTag: regex },
                ],
            };
        }

        let dbQuery = Product.find(filter)
            .select(PUBLIC_PRODUCT_SELECT)
            .populate({ path: 'Category', select: 'name slug bgColor' })
            .sort({ createdAt: -1 })
            .lean();

        if (limit > 0) dbQuery = dbQuery.limit(limit);

        const products = await dbQuery;

        // Format objectId to string securely
        const safeProducts = products.map((p) => toPublicProductPayload(p));

        return NextResponse.json({ success: true, data: safeProducts });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}


// POST new product - Protected Admin Route
export async function POST(req) {
    try {
        // Validation: Verify if the requester is the authorized Admin
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.isAdmin) {
            return NextResponse.json({ success: false, message: 'Unauthorized Access' }, { status: 401 });
        }

        await mongooseConnect();

        const body = await req.json();

        let {
            Name,
            Description,
            shortDescription,
            seoTitle,
            seoDescription,
            seoKeywords,
            seoCanonicalUrl,
            seoOgTitle,
            seoOgDescription,
            seoOgImage,
            Price,
            compareAtPrice,
            stockQuantity,
            isUnlimitedStock,
            Images,
            cloudinary_id,
            Category: categoryInput,
            slug,
            StockStatus,
            showOnStore,
            isNewArrival,
            isBestSelling,
            isFeatured,
            featuredPriority,
            tags,
            primaryTag,
            customReviewCount,
            rating,
            plating,
        } = body;

        if (!Name || !Price || !categoryInput) {
            return NextResponse.json({ success: false, message: 'Please provide Name, Price, and Category' }, { status: 400 });
        }

        if (!Images || !Array.isArray(Images) || Images.length === 0) {
            return NextResponse.json({ success: false, message: 'Please provide at least one product image' }, { status: 400 });
        }

        // Normalize Category to always be an array
        const categoryIds = Array.isArray(categoryInput) ? categoryInput : [categoryInput].filter(Boolean);
        const categories = await Category.find({ _id: { $in: categoryIds } }, '_id').lean();
        const validCategoryIdSet = new Set(categories.map((category) => category._id.toString()));
        const categoryArray = categoryIds.filter((id) => validCategoryIdSet.has(String(id)));

        if (categoryArray.length === 0) {
            return NextResponse.json({ success: false, message: 'Please provide valid categories' }, { status: 400 });
        }

        // Auto-generate slug if missing or empty
        let uniqueSlug = slug || slugify(Name);
        const baseSlug = slugify(Name);
        let counter = 1;

        while (await Product.exists({ slug: uniqueSlug })) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
        }

        const normalizedPrice = Number(Price);
        const normalizedCompareAtPrice = compareAtPrice === '' || compareAtPrice == null
            ? null
            : Number(compareAtPrice);
        const normalizedStockQuantity = isUnlimitedStock === true || isUnlimitedStock === 'true'
            ? 9999
            : Math.max(0, Number(stockQuantity) || 0);
        const stockStatus = isUnlimitedStock === true || isUnlimitedStock === 'true'
            ? 'In Stock'
            : resolveStockStatus(normalizedStockQuantity, StockStatus);
        const persistedRating = rating !== '' && rating != null
            ? normalizeProductRating(rating)
            : generateNewProductRating();

        const normalizedImages = await ensureProductImagesBlur(normalizeProductImages(Images));

        const product = await Product.create({
            Name,
            Description,
            shortDescription: typeof shortDescription === 'string' ? shortDescription.trim() : '',
            seoTitle: typeof seoTitle === 'string' ? seoTitle.trim() : '',
            seoDescription: typeof seoDescription === 'string' ? seoDescription.trim() : '',
            seoKeywords: formatSeoKeywords(seoKeywords),
            seoCanonicalUrl: typeof seoCanonicalUrl === 'string' ? seoCanonicalUrl.trim() : '',
            seoOgTitle: typeof seoOgTitle === 'string' ? seoOgTitle.trim() : '',
            seoOgDescription: typeof seoOgDescription === 'string' ? seoOgDescription.trim() : '',
            seoOgImage: typeof seoOgImage === 'string' ? seoOgImage.trim() : '',
            seoOgImageRatio: body.seoOgImageRatio === '1:1' ? '1:1' : '1.91:1',
            Price: normalizedPrice,
            compareAtPrice: Number.isFinite(normalizedCompareAtPrice) ? normalizedCompareAtPrice : null,
            customReviewCount: customReviewCount !== '' && customReviewCount != null ? Math.max(0, Number(customReviewCount)) : null,
            rating: persistedRating,
            Images: normalizedImages,
            cloudinary_id,
            Category: categoryArray,
            isUnlimitedStock: isUnlimitedStock === true || isUnlimitedStock === 'true',
            stockQuantity: normalizedStockQuantity,
            StockStatus: stockStatus,
            slug: uniqueSlug, // Ensure slug is saved
            showOnStore: showOnStore !== false && showOnStore !== 'false',
            isNewArrival: isNewArrival === true || isNewArrival === 'true',
            isBestSelling: isBestSelling === true || isBestSelling === 'true',
            isFeatured: isFeatured === true || isFeatured === 'true',
            tags: Array.isArray(tags) ? tags : [],
            primaryTag: primaryTag || '',
            metalType: typeof body.metalType === 'string' ? body.metalType.trim() : '',
            purity: typeof body.purity === 'string' ? body.purity.trim() : '',
            plating: typeof plating === 'string' ? plating.trim() : '',
            size: typeof body.size === 'string' ? body.size.trim() : '',
            availableSizes: Array.isArray(body.availableSizes) ? body.availableSizes : [],
            availableColors: Array.isArray(body.availableColors) ? body.availableColors : [],
            gemstone: {
                cut: typeof body.gemstone?.cut === 'string' ? body.gemstone.cut.trim() : '',
                carat: body.gemstone?.carat !== '' && body.gemstone?.carat != null ? Number(body.gemstone.carat) : null,
                clarity: typeof body.gemstone?.clarity === 'string' ? body.gemstone.clarity.trim() : '',
                color: typeof body.gemstone?.color === 'string' ? body.gemstone.color.trim() : '',
                gemstoneType: typeof body.gemstone?.gemstoneType === 'string' ? body.gemstone.gemstoneType.trim() : '',
            },
            grossWeightGrams: body.grossWeightGrams !== '' && body.grossWeightGrams != null ? Number(body.grossWeightGrams) : null,
            certificateNumber: typeof body.certificateNumber === 'string' ? body.certificateNumber.trim() : '',
        });

        revalidateTag('products');
        revalidateTag(`product-${uniqueSlug}`);
        revalidateTag(`product-${product._id.toString()}`);
        revalidateTag('admin-dashboard');
        revalidateTag('home-sections');
        revalidatePath('/admin/products');
        revalidatePath('/products');
        revalidatePath(`/products/${uniqueSlug}`);
        revalidatePath(`/products/${product._id.toString()}`);
        return NextResponse.json({
            success: true,
            data: toPublicProductPayload(product.toObject()),
        }, { status: 201 });
    } catch (error) {
        console.error('[API] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
