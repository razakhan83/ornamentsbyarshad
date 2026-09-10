import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import mongooseConnect from '@/lib/mongooseConnect';
import Review from '@/models/Review';

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await mongooseConnect();
    
    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
    }

    revalidateTag(`reviews-${review.productId?.toString?.() || review.productId}`);
    revalidateTag('all-reviews');
    revalidateTag('storefront-testimonials');

    return NextResponse.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
