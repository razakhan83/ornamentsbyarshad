import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import { getAdminSession } from '@/lib/requireAdmin';
import { normalizeOrderStatus } from '@/lib/order-status';

export async function GET(req, context) {
  try {
    const session = await getAdminSession();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const decodedId = decodeURIComponent(id);

    await mongooseConnect();

    const orders = await Order.find({
      $or: [
        { customerEmail: decodedId },
        { customerPhone: decodedId }
      ]
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      data: orders.map(order => ({
        ...order,
        _id: order._id.toString(),
        orderId: order.orderId,
        status: normalizeOrderStatus(order.status),
        paymentStatus: order.paymentStatus || 'COD',
        totalAmount: Number(order.totalAmount || 0),
        orderQuantity: Number(order.orderQuantity || 1),
        createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
      }))
    });
  } catch (error) {
    console.error('[API] Error fetching customer orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer orders' },
      { status: 500 }
    );
  }
}
