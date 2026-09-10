import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import User from '@/models/User';
import { userProfileSchema } from '@/lib/validation';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await mongooseConnect();
    const user = await User.findOne({ email: session.user.email }).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      city: user.city || '',
      address: user.address || '',
      landmark: user.landmark || '',
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = userProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues?.[0]?.message || 'Validation failed' }, { status: 400 });
    }
    const { name, phone, city, address, landmark } = validation.data;

    await mongooseConnect();
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { 
        name, 
        phone, 
        city, 
        address,
        landmark
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Settings updated successfully',
      name: user.name,
      phone: user.phone,
      city: user.city,
      address: user.address,
      landmark: user.landmark,
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
