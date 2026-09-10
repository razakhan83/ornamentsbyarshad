import { NextResponse } from 'next/server';
import { requireApiAdmin } from '@/lib/requireAdmin';
import mongooseConnect from '@/lib/mongooseConnect';
import Notification from '@/models/Notification';

// GET recent notifications
export async function GET() {
  try {
    const auth = await requireApiAdmin();
    if (auth.error) return auth.error;

    await mongooseConnect();
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Admin notifications GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load notifications' }, { status: 500 });
  }
}

// PATCH mark as read
export async function PATCH(req) {
  try {
    const auth = await requireApiAdmin({ mutation: true });
    if (auth.error) return auth.error;

    const { id, all } = await req.json();
    await mongooseConnect();

    if (all) {
      await Notification.updateMany({ isRead: false }, { isRead: true });
    } else if (id) {
      await Notification.findByIdAndUpdate(id, { isRead: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin notifications PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update notifications' }, { status: 500 });
  }
}

