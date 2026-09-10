import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Settings from '@/models/Settings';
import { getAllAdminEmails, getConfiguredAdminEmails, isAdminEmail, normalizeEmail } from '@/lib/admin';

const SETTINGS_KEY = 'site-settings';

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return null;
  }
  return session;
}

async function requireAnyAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return null;
  }
  return session;
}

// GET — list current dynamic admin emails
export async function GET() {
  try {
    const session = await requireAnyAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await mongooseConnect();
    const settings = await Settings.findOne({ singletonKey: SETTINGS_KEY }).lean();
    const configuredAdmins = getConfiguredAdminEmails();
    const dynamicAdmins = (settings?.adminEmails || []).map(normalizeEmail).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        configuredAdmins,
        dynamicAdmins,
        allAdmins: getAllAdminEmails(dynamicAdmins),
      },
    });
  } catch (error) {
    console.error('GET /api/settings/admins error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST — add a new dynamic admin email
export async function POST(req) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    await mongooseConnect();
    const settings = await Settings.findOneAndUpdate(
      { singletonKey: SETTINGS_KEY },
      { $addToSet: { adminEmails: email } }, // addToSet avoids duplicates
      { upsert: true, new: true },
    ).lean();

    return NextResponse.json({ success: true, data: settings.adminEmails });
  } catch (error) {
    console.error('POST /api/settings/admins error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE — remove a dynamic admin email
export async function DELETE(req) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    await mongooseConnect();
    const settings = await Settings.findOneAndUpdate(
      { singletonKey: SETTINGS_KEY },
      { $pull: { adminEmails: email } },
      { new: true },
    ).lean();

    return NextResponse.json({ success: true, data: settings?.adminEmails || [] });
  } catch (error) {
    console.error('DELETE /api/settings/admins error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
