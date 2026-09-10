import { NextResponse } from 'next/server';


import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';

export async function GET(req) {
  try {

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'weekly';

    await mongooseConnect();

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    let startDate = new Date(now);
    let groupByFormat = '';
    let datePartFunc = {};
    let sortConfig = {};
    let generateLabels = [];

    if (period === 'weekly') {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      groupByFormat = '%Y-%m-%d';
      
      // Generate last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        generateLabels.push(d.toISOString().split('T')[0]);
      }
    } else if (period === 'monthly') {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      groupByFormat = '%Y-%m-%d';
      
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        generateLabels.push(d.toISOString().split('T')[0]);
      }
    } else if (period === 'yearly') {
      startDate.setMonth(now.getMonth() - 11);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      groupByFormat = '%Y-%m';
      
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        generateLabels.push(`${yyyy}-${mm}`);
      }
    } else if (period === 'custom') {
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        if (from && to) {
            startDate = new Date(from);
            now.setTime(new Date(to).getTime());
            now.setHours(23, 59, 59, 999);
        } else {
            // default fallback to monthly if custom parameters are malformed
            startDate.setDate(now.getDate() - 29);
            startDate.setHours(0, 0, 0, 0);
        }
        groupByFormat = '%Y-%m-%d';
    }

    const aggregationPipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupByFormat, date: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ];

    const results = await Order.aggregate(aggregationPipeline);

    const dataMap = new Map();
    results.forEach((row) => {
      dataMap.set(row._id, { revenue: row.revenue, orders: row.orders });
    });

    let finalData = [];
    
    if (period !== 'custom') {
        finalData = generateLabels.map((dateLabel) => {
            const data = dataMap.get(dateLabel) || { revenue: 0, orders: 0 };
            
            // Format label
            let displayLabel = dateLabel;
            if (period === 'weekly') {
                displayLabel = new Date(dateLabel).toLocaleDateString('en-US', { weekday: 'short' });
            } else if (period === 'monthly') {
                displayLabel = new Date(dateLabel).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (period === 'yearly') {
                const [year, month] = dateLabel.split('-');
                const d = new Date(Number(year), Number(month) - 1, 1);
                displayLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }

            return {
                rawDate: dateLabel,
                date: displayLabel,
                revenue: data.revenue,
                orders: data.orders,
            };
        });
    } else {
        // Just return the sorted database items for custom without gap filling
         finalData = results.map(row => {
            return {
                rawDate: row._id,
                date: new Date(row._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                revenue: row.revenue,
                orders: row.orders,
            }
         });
    }

    return NextResponse.json({ success: true, data: finalData });
  } catch (error) {
    if (error?.digest?.startsWith('NEXT_') || error?.digest === 'HANGING_PROMISE_REJECTION') {
      throw error;
    }
    console.error('Chart API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
