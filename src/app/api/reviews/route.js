import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Review from '@/models/Review';
import Notification from '@/models/Notification';
import Order from '@/models/Order';
import User from '@/models/User';
import Product from '@/models/Product';
import { getPhoneRegex, normalizeEmail } from '@/lib/admin';
import { reviewSchema } from '@/lib/validation';

// GET reviews for a specific product
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    await mongooseConnect();
    const resolvedProductId = mongoose.Types.ObjectId.isValid(productId)
      ? new mongoose.Types.ObjectId(productId)
      : productId;

    const reviews = await Review.find({ 
      productId: resolvedProductId, 
      $or: [{ status: 'Approved' }, { isApproved: true }] 
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST submit a new review
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const validation = reviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.issues?.[0]?.message || 'Validation failed' }, { status: 400 });
    }
    const { productId, rating, comment, images } = validation.data;
    const { orderId, secureToken } = body;

    // Must be either authenticated or provide valid guest order verification
    if ((!session || !session.user) && (!orderId || !secureToken)) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in or provide a valid delivered order.' }, { status: 401 });
    }

    await mongooseConnect();

    // Resolve product — productId may be a real ObjectId string or a slug
    let product = null;
    if (mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findById(productId).select('_id slug Name').lean();
    }
    if (!product) {
      product = await Product.findOne({ slug: productId }).select('_id slug Name').lean();
    }
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const resolvedProductId = product._id;
    const productIdentifiers = Array.from(
      new Set([resolvedProductId.toString(), product.slug, productId].filter(Boolean))
    );

    let reviewerName = 'Verified Customer';
    let reviewerUserId = null;
    let verifiedOrderId = null;

    // Case 1: Authenticated User
    if (session?.user?.email) {
      const email = normalizeEmail(session.user.email);
      let user = await User.findOne({ email }).select('_id name phone').lean();
      if (!user) {
        user = await User.findOneAndUpdate(
          { email },
          { name: session.user.name || 'Customer', email },
          { upsert: true, new: true }
        ).select('_id name phone').lean();
      }

      reviewerName = user.name || session.user.name || 'Customer';
      reviewerUserId = user._id;

      const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const orConditions = [
        { customerEmail: email },
        { customerEmail: emailRegex }
      ];

      if (user?.phone) {
        const phoneRegex = getPhoneRegex(user.phone);
        if (phoneRegex) {
          orConditions.push({ customerPhone: { $regex: phoneRegex } });
        }
      }

      const eligibleOrder = await Order.findOne({
        status: { $in: ['Delivered', 'delivered'] },
        items: {
          $elemMatch: {
            productId: { $in: productIdentifiers },
          },
        },
        $or: orConditions,
      }).select('_id orderId').lean();

      if (!eligibleOrder) {
        return NextResponse.json(
          { success: false, error: 'Only delivered customers can review this product' },
          { status: 403 }
        );
      }

      verifiedOrderId = eligibleOrder._id;
    } 
    // Case 2: Guest User with orderId + secureToken
    else if (orderId && secureToken) {
      const guestOrder = await Order.findOne({
        orderId,
        secureToken,
        status: { $in: ['Delivered', 'delivered'] },
        items: {
          $elemMatch: {
            productId: { $in: productIdentifiers }
          }
        }
      }).select('_id orderId customerName').lean();

      if (!guestOrder) {
        return NextResponse.json(
          { success: false, error: 'Valid delivered order is required to submit a review' },
          { status: 403 }
        );
      }

      reviewerName = guestOrder.customerName || 'Verified Customer';
      verifiedOrderId = guestOrder._id;
    }

    const review = await Review.create({
      productId: resolvedProductId,
      userId: reviewerUserId,
      userName: reviewerName,
      rating: Number(rating),
      comment: comment || '',
      images: images || [],
    });

    // Mark item as reviewed in order
    if (verifiedOrderId) {
      await Order.updateOne(
        { _id: verifiedOrderId, 'items.productId': { $in: productIdentifiers } },
        { $set: { 'items.$.isReviewed': true } }
      );
    }

    // Create Admin Notification
    await Notification.create({
      type: 'review',
      message: `${reviewerName} left a ${rating}-star rating on ${product.Name}`,
      link: `/admin/reviews?id=${review._id}`,
      metadata: {
        id: resolvedProductId.toString(),
        userName: reviewerName,
        rating: Number(rating),
      }
    });

      revalidateTag(`reviews-${resolvedProductId.toString()}`);
      revalidateTag(`reviews-${productId}`);
      revalidateTag('all-reviews');
      revalidateTag('storefront-testimonials');

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error('Review submission error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
