import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import Feedback from '@/models/Feedback';
import { requireApiAdmin } from '@/lib/requireAdmin';

export async function PATCH(req, { params }) {
  try {
    const { error } = await requireApiAdmin({ mutation: true });
    if (error) return error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Feedback ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!['new', 'read', 'archived'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    await mongooseConnect();

    const updated = await Feedback.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Feedback marked as ${status}`,
      data: JSON.parse(JSON.stringify(updated)),
    });
  } catch (err) {
    console.error('Error updating feedback status:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update feedback' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { error } = await requireApiAdmin({ mutation: true });
    if (error) return error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Feedback ID is required' }, { status: 400 });
    }

    await mongooseConnect();

    const deleted = await Feedback.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting feedback:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete feedback' },
      { status: 500 }
    );
  }
}
