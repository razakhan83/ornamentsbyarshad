import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireApiAdmin } from '@/lib/requireAdmin';
import mongooseConnect from '@/lib/mongooseConnect';
import Review from '@/models/Review';

export async function GET() {
  try {
    const auth = await requireApiAdmin();
    if (auth.error) return auth.error;
    await mongooseConnect();

    const reviews = await Review.find({})
      .populate('productId', 'Name slug')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const serializedReviews = reviews.map((review) => ({
      ...review,
      _id: review._id.toString(),
      productId: review.productId
        ? {
            ...review.productId,
            _id: review.productId._id.toString(),
          }
        : null,
      userId: review.userId ? review.userId.toString() : null,
      createdAt: review.createdAt?.toISOString(),
      updatedAt: review.updatedAt?.toISOString(),
    }));

    return NextResponse.json({ success: true, data: serializedReviews });
  } catch (error) {
    console.error('Admin reviews GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load reviews' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const auth = await requireApiAdmin({ mutation: true });
    if (auth.error) return auth.error;
    const body = await req.json();
    const { id, status, showOnHome } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Review ID is required' }, { status: 400 });
    }

    await mongooseConnect();

    // Handle showOnHome toggle
    if (typeof showOnHome === 'boolean') {
      if (showOnHome) {
        const featuredCount = await Review.countDocuments({ showOnHome: true, _id: { $ne: id } });
        if (featuredCount >= 10) {
          return NextResponse.json(
            { success: false, error: 'Maximum 10 reviews can be featured on Home. Please remove another review first.' },
            { status: 400 }
          );
        }
      }

      const updateData = { showOnHome };
      // If featuring on home, automatically ensure review is approved
      if (showOnHome) {
        updateData.status = 'Approved';
        updateData.isApproved = true;
      }

      const result = await Review.findByIdAndUpdate(id, updateData, { new: true });
      if (!result) {
        return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
      }

      revalidateTag(`reviews-${result.productId?.toString?.() || result.productId}`);
      revalidateTag('all-reviews');
      revalidateTag('storefront-testimonials');
      revalidateTag('home-page');

      return NextResponse.json({
        success: true,
        message: showOnHome ? 'Review featured on Home page' : 'Review removed from Home page',
        data: { _id: result._id.toString(), showOnHome: result.showOnHome, status: result.status },
      });
    }

    // Handle status change
    if (status) {
      if (!['Approved', 'Rejected'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }

      const updatePayload = {
        status,
        isApproved: status === 'Approved',
      };
      if (status === 'Rejected') {
        updatePayload.showOnHome = false;
      }

      const result = await Review.findByIdAndUpdate(id, updatePayload, { new: true });

      if (!result) {
        return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
      }

      revalidateTag(`reviews-${result.productId?.toString?.() || result.productId}`);
      revalidateTag('all-reviews');
      revalidateTag('storefront-testimonials');
      revalidateTag('home-page');

      return NextResponse.json({ success: true, message: `Review ${status.toLowerCase()} successfully` });
    }

    return NextResponse.json({ success: false, error: 'No valid action provided' }, { status: 400 });
  } catch (error) {
    console.error('Admin reviews PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const auth = await requireApiAdmin({ mutation: true });
    if (auth.error) return auth.error;

    await mongooseConnect();
    const Product = (await import('@/models/Product')).default;
    const deleted = await Review.deleteMany({});
    await Product.updateMany({}, { $set: { averageRating: 0, reviewCount: 0 } });

    revalidateTag('all-reviews');
    revalidateTag('storefront-testimonials');
    revalidateTag('products');
    revalidateTag('home-page');

    return NextResponse.json({
      success: true,
      message: 'All reviews were removed. The review system is ready for new submissions.',
      deletedCount: deleted.deletedCount || 0,
    });
  } catch (error) {
    console.error('Admin reviews DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete reviews' }, { status: 500 });
  }
}
