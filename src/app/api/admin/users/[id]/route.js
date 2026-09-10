import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import mongooseConnect from '@/lib/mongooseConnect';
import User from '@/models/User';

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (session.user?.isDemo) {
      return NextResponse.json({ success: false, message: 'Demo Mode: Actions are disabled. You have read-only access.' }, { status: 403 });
    }

    const { id } = await params;
    const { disabled, action } = await request.json();
    await mongooseConnect();

    let update = {};
    if (action === 'force-logout') {
      update.forceLogoutAt = new Date();
    } else if (typeof disabled === 'boolean') {
      update.disabled = disabled;
      if (disabled === true) {
        // Automatically invalidate existing sessions when disabling
        update.forceLogoutAt = new Date();
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true }).lean();

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        _id: user._id.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
