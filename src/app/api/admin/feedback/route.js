import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import Feedback from '@/models/Feedback';
import { requireApiAdmin } from '@/lib/requireAdmin';

export async function GET(req) {
  try {
    const { error } = await requireApiAdmin();
    if (error) return error;

    await mongooseConnect();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const rating = searchParams.get('rating') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '25', 10)));
    const skip = (page - 1) * limit;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (rating && rating !== 'all') {
      query.rating = Number(rating);
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { message: searchRegex },
        { suggestions: searchRegex },
        { name: searchRegex },
        { contact: searchRegex },
      ];
    }

    const [items, total, allDocs] = await Promise.all([
      Feedback.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Feedback.countDocuments(query),
      Feedback.find({}, 'status rating type').lean(),
    ]);

    // Calculate aggregated stats
    const totalAll = allDocs.length;
    let newCount = 0;
    let readCount = 0;
    let archivedCount = 0;
    let sumRating = 0;
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const typeCounts = { experience: 0, suggestion: 0, 'feature-request': 0, bug: 0, general: 0 };

    for (const doc of allDocs) {
      if (doc.status === 'new') newCount++;
      else if (doc.status === 'read') readCount++;
      else if (doc.status === 'archived') archivedCount++;

      const r = Math.min(5, Math.max(1, Math.round(doc.rating || 5)));
      ratingCounts[r] = (ratingCounts[r] || 0) + 1;
      sumRating += doc.rating || 5;

      const t = doc.type || 'experience';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }

    const avgRating = totalAll > 0 ? (sumRating / totalAll).toFixed(1) : '5.0';

    return NextResponse.json({
      success: true,
      items: JSON.parse(JSON.stringify(items)),
      total,
      totalPages: Math.ceil(total / limit) || 1,
      page,
      limit,
      summary: {
        totalAll,
        newCount,
        readCount,
        archivedCount,
        avgRating,
        ratingCounts,
        typeCounts,
      },
    });
  } catch (err) {
    console.error('Error fetching admin feedbacks:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { error } = await requireApiAdmin({ mutation: true });
    if (error) return error;

    await mongooseConnect();
    const body = await req.json().catch(() => ({}));
    const { ids } = body;

    if (Array.isArray(ids) && ids.length > 0) {
      await Feedback.deleteMany({ _id: { $in: ids } });
      return NextResponse.json({ success: true, message: `Deleted ${ids.length} feedback entries.` });
    }

    return NextResponse.json({ success: false, error: 'No IDs provided' }, { status: 400 });
  } catch (err) {
    console.error('Error deleting feedbacks:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete feedbacks' },
      { status: 500 }
    );
  }
}
