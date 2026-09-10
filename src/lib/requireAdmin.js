// @ts-nocheck
import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

export const DEMO_MODE_MESSAGE = 'Demo Mode: Actions are disabled. You have read-only access.';

export const getAdminSession = cache(async () => getServerSession(authOptions));

export async function requireAdmin() {
  const session = await getAdminSession();

  if (!session || !session.user?.isAdmin) {
    redirect('/admin/login');
  }

  return session;
}

export async function requireMutationAccess() {
  const session = await requireAdmin();
  if (session.user?.isDemo) {
    throw new Error(DEMO_MODE_MESSAGE);
  }
  return session;
}

/** JSON 401/403 for Route Handlers — never redirect (redirects become 500 in API catch blocks). */
export async function requireApiAdmin({ mutation = false } = {}) {
  const session = await getAdminSession();

  if (!session || !session.user?.isAdmin) {
    return {
      session: null,
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (mutation && session.user?.isDemo) {
    return {
      session,
      error: NextResponse.json({ success: false, error: DEMO_MODE_MESSAGE }, { status: 403 }),
    };
  }

  return { session, error: null };
}
