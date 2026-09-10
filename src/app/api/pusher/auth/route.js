import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPusherServer } from '@/lib/pusher-server';

export async function POST(request) {
  try {
    const pusher = getPusherServer();
    if (!pusher) {
      // Pusher not configured, return 400 silently
      return NextResponse.json({ error: 'Realtime engine not configured' }, { status: 400 });
    }

    // Parse form data or json body sent by Pusher client
    const contentType = request.headers.get('content-type') || '';
    let socketId = '';
    let channelName = '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      socketId = formData.get('socket_id')?.toString() || '';
      channelName = formData.get('channel_name')?.toString() || '';
    } else {
      const body = await request.json().catch(() => ({}));
      socketId = body.socket_id || '';
      channelName = body.channel_name || '';
    }

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    // Ephemeral unique ID for presence channel (no DB write)
    const presenceUserId = 'usr_' + crypto.randomBytes(8).toString('hex');

    const url = new URL(request.url);
    const role = url.searchParams.get('role') || 'visitor';
    const lat = parseFloat(url.searchParams.get('lat') || '');
    const lng = parseFloat(url.searchParams.get('lng') || '');
    const city = url.searchParams.get('city') || 'Global Visitor';
    const country = url.searchParams.get('country') || 'Worldwide';

    const presenceData = {
      user_id: presenceUserId,
      user_info: {
        id: presenceUserId,
        role,
        lat: !isNaN(lat) ? Math.round(lat * 10) / 10 : 24.9,
        lng: !isNaN(lng) ? Math.round(lng * 10) / 10 : 67.0,
        city: city.slice(0, 50),
        country: country.slice(0, 50),
        joinedAt: Date.now(),
      },
    };

    const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(authResponse);
  } catch {
    return NextResponse.json({ error: 'Authorization failed' }, { status: 500 });
  }
}
