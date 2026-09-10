import mongoose from 'mongoose';
import { DEFAULT_ORDER_STATUS, normalizeOrderStatus, ORDER_STATUSES } from '@/lib/order-status';

const OrderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
        },
        idempotencyKey: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        customerEmail: {
            type: String,
            required: false,
            lowercase: true,
        },
        customerName: {
            type: String,
            required: [true, 'Customer name is required.'],
        },
        customerPhone: {
            type: String,
            required: false,
        },
        customerAddress: {
            type: String,
            required: false,
        },
        customerCity: {
            type: String,
            required: false,
        },
        landmark: {
            type: String,
            required: false,
        },
        paymentStatus: {
            type: String,
            enum: ['COD', 'Online'],
            default: 'COD',
        },
        weight: {
            type: Number,
            default: 2,
        },
        manualCodAmount: {
            type: Number,
            required: false,
        },
        itemType: {
            type: String,
            default: 'Mix',
        },
        orderQuantity: {
            type: Number,
            default: 1,
        },
        items: [
            {
                productId: { type: String },
                name: { type: String },
                price: { type: Number },
                packLabel: { type: String, default: '' },
                size: { type: String, default: '' },
                metalType: { type: String, default: '' },
                purity: { type: String, default: '' },
                gemstoneSpec: { type: String, default: '' },
                quantity: { type: Number, default: 1 },
                image: { type: String },
                isReviewed: { type: Boolean, default: false },
                sourcingVendors: [
                    {
                        vendorId: { type: String, default: '' },
                        name: { type: String, default: '' },
                        shopNumber: { type: String, default: '' },
                        phone: { type: String, default: '' },
                        whatsappNumber: { type: String, default: '' },
                        email: { type: String, default: '' },
                        address: { type: String, default: '' },
                        vendorProductName: { type: String, default: '' },
                        vendorPrice: { type: Number, default: null },
                    },
                ],
            },
        ],
        totalAmount: {
            type: Number,
            required: [true, 'Total amount is required.'],
        },
        isDraft: {
            type: Boolean,
            default: false,
        },
        inventoryAdjusted: {
            type: Boolean,
            default: false,
        },
        orderType: {
            type: String,
            enum: ['Online', 'Admin'],
            default: 'Online',
            index: true,
        },
        sourceTag: {
            type: String,
            default: '',
            trim: true,
        },
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice',
            default: null,
        },
        invoiceNumber: {
            type: String,
            default: '',
            trim: true,
        },
        status: {
            type: String,
            enum: ORDER_STATUSES,
            default: DEFAULT_ORDER_STATUS,
            set: normalizeOrderStatus,
        },
        statusHistory: [
            {
                status: { type: String, required: true },
                timestamp: { type: Date, default: Date.now }
            }
        ],
        courierName: {
            type: String,
            required: false,
        },
        trackingNumber: {
            type: String,
            required: false,
        },
        nocAccountId: {
            type: String,
            required: false,
            default: 'portal_1',
        },
        nocLabelUrl: {
            type: String,
            required: false,
            default: '',
        },
        courierBookingStatus: {
            type: String,
            enum: ['none', 'booked', 'failed', 'cancelled'],
            default: 'none',
        },
        courierBookingDate: {
            type: Date,
            default: null,
        },
        courierResponseDetails: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        nocStatus: {
            type: String,
            required: false,
            default: '',
        },
        nocStatusTime: {
            type: String,
            required: false,
            default: '',
        },
        nocParcelNo: {
            type: String,
            required: false,
            default: '',
        },
        nocThirdPartyNo: {
            type: String,
            required: false,
            default: '',
        },
        nocRemarks: {
            type: String,
            required: false,
            default: '',
        },
        nocTrackingEvents: [
            {
                status: { type: String, required: true },
                remarks: { type: String, default: '' },
                dateTime: { type: String, default: '' },
                timestamp: { type: Number, default: 0 },
            }
        ],
        nocLastTrackedAt: {
            type: Date,
            default: null,
        },
        notes: {
            type: String,
            required: false,
        },
        giftNote: {
            type: String,
            default: '',
            trim: true,
        },
        isPremiumPackaging: {
            type: Boolean,
            default: false,
        },
        secureToken: {
            type: String,
            required: false,
        },
        couponCode: {
            type: String,
            required: false,
        },
        discountAmount: {
            type: Number,
            default: 0,
        },
        shippingAmount: {
            type: Number,
            required: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

OrderSchema.index({ customerPhone: 1, createdAt: -1 });
OrderSchema.index({ normalizedPhone: 1, createdAt: -1 });
OrderSchema.index({ isDeleted: 1, isDraft: 1, status: 1, createdAt: -1 });
OrderSchema.index({ isDeleted: 1, isDraft: 1, status: 1, paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
OrderSchema.index({ isDeleted: 1, createdAt: -1 });
OrderSchema.index({ isDraft: 1, isDeleted: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ customerEmail: 1, createdAt: -1 });
OrderSchema.index({ secureToken: 1 });
OrderSchema.index({ trackingNumber: 1 });
OrderSchema.index({ nocParcelNo: 1 });
OrderSchema.index({ nocThirdPartyNo: 1 });
OrderSchema.index({ status: 1, customerEmail: 1, 'items.productId': 1, createdAt: -1 });
// TTL index: auto-purge trashed orders 50 days after deletion
OrderSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 50 * 24 * 60 * 60, partialFilterExpression: { isDeleted: true } });

// Next.js hot reloading can keep old models in memory. 
// If the cached Order model doesn't have the updated status enum or missing fields, we must delete it to force re-registration.
const cachedOrder = mongoose.models.Order;
if (cachedOrder) {
    const cachedStatuses = cachedOrder.schema.path('status').options.enum || [];
    const hasExpectedStatuses =
        cachedStatuses.length === ORDER_STATUSES.length &&
        ORDER_STATUSES.every((status) => cachedStatuses.includes(status));
    const hasTracking = !!cachedOrder.schema.paths.trackingNumber;
    const hasNocFields = !!cachedOrder.schema.paths.nocLabelUrl;
    const hasNocAccountId = !!cachedOrder.schema.paths.nocAccountId;
    const hasOrderType = !!cachedOrder.schema.paths.orderType;
    
    if (!hasExpectedStatuses || !hasTracking || !hasNocFields || !hasNocAccountId || !hasOrderType) {
        delete mongoose.models.Order;
    }
}

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
