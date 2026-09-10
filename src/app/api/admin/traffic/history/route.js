import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import DailyTraffic from '@/models/DailyTraffic';

export async function GET() {
  try {
    await mongooseConnect();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Calculate dates for 7 days ago and 30 days ago
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    const d7Str = d7.toISOString().split('T')[0];

    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 29);
    const d30Str = d30.toISOString().split('T')[0];

    // Fetch records for the last 30 days
    const logs = await DailyTraffic.find({
      date: { $gte: d30Str, $lte: todayStr },
    })
      .sort({ date: 1 })
      .lean();

    let todayVisits = 0;
    let last7DaysTotal = 0;
    let last30DaysTotal = 0;

    // Aggregate city counts across last 30 days
    const cityMap = new Map();

    // Prepare 7-day trend array
    const trend7DaysMap = new Map();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayKey = day.toISOString().split('T')[0];
      const dayLabel = day.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      trend7DaysMap.set(dayKey, { date: dayKey, label: dayLabel, visits: 0 });
    }

    logs.forEach((log) => {
      const visits = log.totalVisits || 0;
      last30DaysTotal += visits;

      if (log.date === todayStr) {
        todayVisits = visits;
      }

      if (log.date >= d7Str) {
        last7DaysTotal += visits;
        if (trend7DaysMap.has(log.date)) {
          trend7DaysMap.get(log.date).visits = visits;
        }
      }

      // Aggregate cities
      if (Array.isArray(log.cities)) {
        log.cities.forEach((c) => {
          if (!c.city) return;
          const current = cityMap.get(c.city) || {
            city: c.city,
            country: c.country || 'Pakistan',
            count: 0,
            lat: c.lat,
            lng: c.lng,
          };
          current.count += c.count || 1;
          cityMap.set(c.city, current);
        });
      }
    });

    const topCities = Array.from(cityMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const totalCityCounts = topCities.reduce((acc, c) => acc + c.count, 0) || 1;
    const topCitiesWithPercentage = topCities.map((c) => ({
      ...c,
      percentage: Math.min(100, Math.round((c.count / totalCityCounts) * 100)),
    }));

    return NextResponse.json({
      success: true,
      stats: {
        todayVisits,
        last7DaysTotal,
        last30DaysTotal,
        trend7Days: Array.from(trend7DaysMap.values()),
        topCities: topCitiesWithPercentage,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve traffic history',
        stats: {
          todayVisits: 0,
          last7DaysTotal: 0,
          last30DaysTotal: 0,
          trend7Days: [],
          topCities: [],
        },
      },
      { status: 500 }
    );
  }
}
