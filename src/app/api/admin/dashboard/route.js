// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { DEFAULT_ORDER_STATUS, getOrderStatusQueryValue, normalizeOrderStatus } from '@/lib/order-status';

export async function GET(request) {
    try {
        void request.headers.get('host');
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.isAdmin) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized Access' },
                { status: 401 }
            );
        }

        await mongooseConnect();

        // --- Summary Stats ---
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: getOrderStatusQueryValue(DEFAULT_ORDER_STATUS) });

        const revenueAgg = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        const customersAgg = await Order.aggregate([
            { $group: { _id: '$customerName' } },
            { $count: 'count' },
        ]);
        const totalCustomers = customersAgg[0]?.count || 0;

        // --- Monthly Orders (last 6 months) ---
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const monthlyOrdersAgg = await Order.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        const monthNames = [
            '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ];

        // Fill in all 6 months (including zero-order months)
        const monthlyOrders = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const found = monthlyOrdersAgg.find(
                (m) => m._id.year === year && m._id.month === month
            );
            monthlyOrders.push({
                month: monthNames[month],
                orders: found ? found.orders : 0,
            });
        }

        // --- Top 5 Selling Products ---
        const topSellersAgg = await Order.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.name',
                    totalSold: { $sum: '$items.quantity' },
                    image: { $first: '$items.image' },
                    productId: { $first: '$items.productId' },
                },
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    name: '$_id',
                    totalSold: 1,
                    image: 1,
                    productId: 1,
                },
            },
        ]);

        // --- Recent 5 Orders ---
        const recentOrders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const safeRecentOrders = recentOrders.map((o) => ({
            _id: o._id.toString(),
            orderId: o.orderId,
            customerName: o.customerName,
            totalAmount: o.totalAmount,
            status: normalizeOrderStatus(o.status),
            createdAt: o.createdAt,
        }));

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalOrders,
                    totalRevenue,
                    totalCustomers,
                    pendingOrders,
                },
                monthlyOrders,
                topSellers: topSellersAgg,
                recentOrders: safeRecentOrders,
            },
        });
    } catch (error) {
        if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
            throw error;
        }
        console.error('Dashboard API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
