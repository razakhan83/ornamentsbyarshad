// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import mongooseConnect from '@/lib/mongooseConnect';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await mongooseConnect();
    const users = await User.find({})
      .select('name email image createdAt disabled forceLogoutAt')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      success: true,
      data: users.map(user => ({
        ...user,
        _id: user._id.toString(),
      })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

