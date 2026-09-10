import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { sendMetaCustomTrackingEvent } from '@/lib/trackingServer';

export async function POST(request) {
  try {
    const body = await request.json();
    const session = await getServerSession(authOptions);
    const eventName = String(body?.eventName || '').trim();

    if (!eventName) {
      return NextResponse.json({ success: false, error: 'eventName is required' }, { status: 400 });
    }

    const result = await sendMetaCustomTrackingEvent({
      eventName,
      eventId: String(body?.eventId || '').trim() || undefined,
      eventSourceUrl: String(body?.eventSourceUrl || '').trim() || request.headers.get('referer') || undefined,
      userData: {
        email: session?.user?.email || body?.userData?.email,
        phone: body?.userData?.phone,
        externalId: body?.userData?.externalId,
        clientIp:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          undefined,
        clientUserAgent: request.headers.get('user-agent') || undefined,
      },
      customData: body?.customData && typeof body.customData === 'object' ? body.customData : undefined,
    });

    return NextResponse.json({
      success: result.success,
      skipped: result.skipped === true,
      reason: result.reason,
      error: result.error,
      response: result.response,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
