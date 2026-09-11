import mongoose from 'mongoose';

const ProductImageSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true,
            trim: true,
        },
        blurDataURL: {
            type: String,
            default: '',
        },
        publicId: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        _id: false,
    }
);

const ProductSchema = new mongoose.Schema(
    {
        Name: {
            type: String,
            required: [true, 'Please provide a name for this product.'],
            maxlength: [200, 'Name cannot be more than 200 characters'],
        },
        Description: {
            type: String,
            required: false,
        },
        shortDescription: {
            type: String,
            trim: true,
            default: '',
        },
        seoTitle: {
            type: String,
            trim: true,
            maxlength: [70, 'SEO title cannot be more than 70 characters'],
            default: '',
        },
        seoDescription: {
            type: String,
            trim: true,
            maxlength: [320, 'SEO description cannot be more than 320 characters'],
            default: '',
        },
        seoKeywords: {
            type: String,
            trim: true,
            maxlength: [250, 'SEO keywords cannot be more than 250 characters'],
            default: '',
        },
        seoCanonicalUrl: {
            type: String,
            trim: true,
            default: '',
        },
        seoOgTitle: {
            type: String,
            trim: true,
            maxlength: [100, 'OG title cannot be more than 100 characters'],
            default: '',
        },
        seoOgDescription: {
            type: String,
            trim: true,
            maxlength: [350, 'OG description cannot be more than 350 characters'],
            default: '',
        },
        seoOgImage: {
            type: String,
            trim: true,
            default: '',
        },
        seoOgImageRatio: {
            type: String,
            enum: ['1.91:1', '1:1'],
            default: '1.91:1',
        },
        Price: {
            type: Number,
            required: [true, 'Please provide a price.'],
        },
        compareAtPrice: {
            type: Number,
            default: null,
            min: 0,
        },
        Images: {
            type: [ProductImageSchema],
            default: []
        },
        Category: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category',
            }],
            required: [true, 'Please provide at least one category.'],
            default: [],
        },
        // Jewelry Specific Specifications
        metalType: {
            type: String,
            default: '',
            trim: true,
        },
        purity: {
            type: String,
            default: '',
            trim: true,
        },
        size: {
            type: String,
            default: '',
            trim: true,
        },
        availableSizes: {
            type: [String],
            default: [],
        },
        availableColors: {
            type: [String],
            default: [],
        },
        gemstone: {
            cut: { type: String, default: '', trim: true },
            carat: { type: Number, default: null },
            clarity: { type: String, default: '', trim: true },
            color: { type: String, default: '', trim: true },
            gemstoneType: { type: String, default: '', trim: true },
        },
        grossWeightGrams: {
            type: Number,
            default: null,
            min: 0,
        },
        certificateNumber: {
            type: String,
            default: '',
            trim: true,
        },
        stockQuantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        StockStatus: {
            type: String,
            enum: ['In Stock', 'Out of Stock'], // Only allow these two values
            default: 'In Stock',
        },
        slug: {
            type: String,
            required: false,
            unique: true,
        },
        showOnStore: {
            type: Boolean,
            default: true
        },
        customReviewCount: {
            type: Number,
            default: null,
            min: 0,
        },
        rating: {
            type: Number,
            default: null,
            min: 1,
            max: 5,
        },
        isNewArrival: {
            type: Boolean,
            default: false,
        },
        isBestSelling: {
            type: Boolean,
            default: false,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        featuredPriority: {
            type: Number,
            default: 0,
        },
        tags: {
            type: [String],
            default: [],
        },
        primaryTag: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

ProductSchema.index({ showOnStore: 1, createdAt: -1 });
ProductSchema.index({ showOnStore: 1, Category: 1, createdAt: -1 });
ProductSchema.index({ showOnStore: 1, slug: 1 });
ProductSchema.index({ showOnStore: 1, isNewArrival: 1, createdAt: -1 });
ProductSchema.index({ showOnStore: 1, isBestSelling: 1, createdAt: -1 });
ProductSchema.index({ showOnStore: 1, isFeatured: 1, featuredPriority: -1, createdAt: -1 });
ProductSchema.index({ showOnStore: 1, Price: 1, createdAt: -1 });
ProductSchema.index({ showOnStore: 1, Price: -1, createdAt: -1 });
ProductSchema.index({ showOnStore: 1, rating: -1 });

const cachedProduct = mongoose.models.Product;
if (
    cachedProduct &&
    (
        !cachedProduct.schema.path('compareAtPrice') ||
        !cachedProduct.schema.path('shortDescription') ||
        !cachedProduct.schema.path('rating') ||
        !cachedProduct.schema.path('tags') ||
        !cachedProduct.schema.path('primaryTag') ||
        !cachedProduct.schema.path('isFeatured') ||
        !cachedProduct.schema.path('featuredPriority') ||
        !cachedProduct.schema.path('availableColors')
    )
) {
    delete mongoose.models.Product;
}

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
