import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import DailyTraffic from '@/models/DailyTraffic';

function roundCoordinate(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return null;
  // Round to 1 decimal place (~11km / city-level privacy accuracy)
  return Math.round(num * 10) / 10;
}

// Background fire-and-forget traffic aggregator
async function recordDailyTraffic(city, country, lat, lng) {
  try {
    await mongooseConnect();
    const todayStr = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const safeCity = city || 'Karachi';
    const safeCountry = country || 'Pakistan';

    // 1. Try to increment city count if it already exists in today's document
    const updated = await DailyTraffic.findOneAndUpdate(
      { date: todayStr, 'cities.city': safeCity },
      {
        $inc: { totalVisits: 1, 'cities.$.count': 1 },
      }
    );

    // 2. If the city wasn't in today's document, add it or create today's document
    if (!updated) {
      await DailyTraffic.findOneAndUpdate(
        { date: todayStr },
        {
          $inc: { totalVisits: 1 },
          $push: {
            cities: {
              city: safeCity,
              country: safeCountry,
              lat: lat || 24.9,
              lng: lng || 67.0,
              count: 1,
            },
          },
        },
        { upsert: true, new: true }
      );
    }
  } catch {
    // Silent fail - analytics must never crash or block requests
  }
}

export async function GET(request) {
  try {
    // 1. Next.js / Vercel Edge Geo Headers
    const vercelLat = request.headers.get('x-vercel-ip-latitude');
    const vercelLng = request.headers.get('x-vercel-ip-longitude');
    const vercelCity = request.headers.get('x-vercel-ip-city');
    const vercelCountry = request.headers.get('x-vercel-ip-country');

    if (vercelLat && vercelLng) {
      const lat = roundCoordinate(vercelLat);
      const lng = roundCoordinate(vercelLng);
      const city = vercelCity ? decodeURIComponent(vercelCity) : 'Karachi';
      const country = vercelCountry || 'Pakistan';

      // Background aggregate recording (non-blocking)
      recordDailyTraffic(city, country, lat, lng);

      return NextResponse.json({ lat, lng, city, country });
    }

    // 2. Local dev or non-Vercel fallback: Try ipwho.is (fast & accurate for Pakistan/Global)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '';
      const isLocalhost = !ip || ip === '127.0.0.1' || ip === '::1';

      const url = isLocalhost ? 'https://ipwho.is/' : `https://ipwho.is/${ip}`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ChinaUnique/1.0' },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.success !== false && data.latitude && data.longitude) {
          const lat = roundCoordinate(data.latitude);
          const lng = roundCoordinate(data.longitude);
          const city = data.city || 'Karachi';
          const country = data.country || 'Pakistan';

          recordDailyTraffic(city, country, lat, lng);

          return NextResponse.json({ lat, lng, city, country });
        }
      }
    } catch {
      // Catch timeout or network errors silently
    } finally {
      clearTimeout(timeoutId);
    }

    // Default safe fallback if unlocatable
    recordDailyTraffic('Karachi', 'Pakistan', 24.9, 67.0);
    return NextResponse.json({
      lat: 24.9,
      lng: 67.0,
      city: 'Karachi',
      country: 'Pakistan',
    });
  } catch {
    // Fail silently with default fallback
    return NextResponse.json({
      lat: 31.5,
      lng: 74.3,
      city: 'Lahore',
      country: 'Pakistan',
    });
  }
}
