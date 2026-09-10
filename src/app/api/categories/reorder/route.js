import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Category from '@/models/Category';
import { revalidateTag } from 'next/cache';

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await mongooseConnect();
    const body = await req.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ success: false, error: 'Invalid data format' }, { status: 400 });
    }

    // Bulk update the sortOrder for each category based on its index in the array
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await Category.bulkWrite(bulkOps);
    }

    revalidateTag('categories');
    revalidateTag('products');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
