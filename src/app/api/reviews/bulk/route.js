import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidateTag } from 'next/cache';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Review from '@/models/Review';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { normalizeEmail } from '@/lib/admin';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, reviews } = body;

    if (!orderId || !reviews || !Array.isArray(reviews)) {
      return NextResponse.json({ success: false, error: 'Invalid request data' }, { status: 400 });
    }

    await mongooseConnect();

    // Look up the DB user so we have a real ObjectId for userId
    const email = normalizeEmail(session.user.email);
    let dbUser = await User.findOne({ email }).select('_id name').lean();
    if (!dbUser) {
      dbUser = await User.findOneAndUpdate(
        { email },
        { name: session.user.name || 'Customer', email },
        { upsert: true, new: true }
      ).select('_id name').lean();
    }

    // Check if order exists and belongs to user
    const order = await Order.findById(orderId).select('_id customerEmail items').lean();
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Verify ownership (by email)
    if (order.customerEmail && order.customerEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];
    const errors = [];

    for (const reviewData of reviews) {
      const { productId, rating, comment } = reviewData;

      // 1. Resolve product — productId in Order.items is stored as a string (may be slug or ObjectId)
      let product = null;
      if (mongoose.Types.ObjectId.isValid(productId)) {
        product = await Product.findById(productId).select('_id slug Name').lean();
      }
      // Fall back to slug lookup if not a valid ObjectId or findById returned nothing
      if (!product) {
        product = await Product.findOne({ slug: productId }).select('_id slug Name').lean();
      }

      if (!product) {
        errors.push({ productId, error: 'This product could not be found' });
        continue;
      }

      // Always use the real Mongo _id for the Review reference
      const resolvedProductId = product._id;

      // 2. Create Review with a proper ObjectId reference
      const newReview = await Review.create({
        productId: resolvedProductId,
        userId: dbUser._id,
        userName: dbUser.name || session.user.name,
        rating,
        comment: comment || '',
      });

      // 3. Update Order Item Status (Order.items.productId is a String, match by original value)
      await Order.updateOne(
        { _id: orderId, 'items.productId': productId },
        { $set: { 'items.$.isReviewed': true } },
      );

      // 4. Create Notification for Admin
      await Notification.create({
        type: 'review',
        message: `${dbUser.name} left a ${rating}-star rating on ${product.Name}`,
        link: `/admin/reviews?id=${newReview._id}`,
        metadata: {
          id: resolvedProductId.toString(),
          userName: dbUser.name,
          rating,
        },
      });

      revalidateTag(`reviews-${resolvedProductId.toString()}`);
      revalidateTag(`reviews-${productId}`);
      revalidateTag('all-reviews');
      revalidateTag('storefront-testimonials');

      results.push(newReview);
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reviews submitted successfully',
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk review error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
