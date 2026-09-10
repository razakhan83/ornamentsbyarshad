import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { requireAdmin, requireMutationAccess } from '@/lib/requireAdmin';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import OrderLog from '@/models/OrderLog';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyInventoryAdjustments } from '@/lib/orderFulfillment';
import { isValidOrderStatus, normalizeOrderStatus } from '@/lib/order-status';
import { sendOrderDeliveredEmail } from '@/app/actions/order.actions';

export async function PATCH(req, { params }) {
  try {
    await requireMutationAccess();
    const { id } = await params;
    const body = await req.json();
    
    const { status, courierName, trackingNumber, weight, manualCodAmount, sourceTag } = body;

    await mongooseConnect();
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const nextStatus = status !== undefined ? normalizeOrderStatus(status) : undefined;
    const hasStatusChanged = nextStatus !== undefined && nextStatus !== order.status;
    const oldStatus = order.status;
    const wasDraft = order.isDraft === true;

    if (nextStatus !== undefined) {
      if (!isValidOrderStatus(nextStatus)) {
        return NextResponse.json({ success: false, error: 'Invalid order status' }, { status: 400 });
      }
      order.status = nextStatus;
      order.isDraft = false;
      
      if (hasStatusChanged) {
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({ status: nextStatus, timestamp: new Date() });
      }
    }
    if (courierName !== undefined) order.courierName = courierName;
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (weight !== undefined) order.weight = weight;
    if (sourceTag !== undefined) order.sourceTag = String(sourceTag || '').trim();
    if (manualCodAmount !== undefined) {
      if (manualCodAmount === '' || manualCodAmount === null) {
        order.manualCodAmount = undefined;
      } else {
        order.manualCodAmount = Number(manualCodAmount);
      }
    }

    await order.save();

    if (wasDraft && order.isDraft === false) {
      await applyInventoryAdjustments(order.items);
    }

    // Log the change
    try {
      const session = await getServerSession(authOptions);
      let details = 'Order updated';
      let action = 'UPDATE';

      if (wasDraft && order.isDraft === false && hasStatusChanged) {
        action = 'STATUS_CHANGE';
        details = `Draft published and status changed from Draft to ${order.status}`;
      } else if (wasDraft && order.isDraft === false) {
        action = 'STATUS_CHANGE';
        details = `Draft published to ${order.status}`;
      } else if (hasStatusChanged) {
        action = 'STATUS_CHANGE';
        details = `Status changed from ${oldStatus} to ${order.status}`;
      } else if (trackingNumber !== undefined) {
        action = 'TRACKING_UPDATE';
        details = `Tracking Number updated to ${trackingNumber}`;
      }

      await OrderLog.create({
        orderId: order._id,
        action,
        details,
        previousStatus: hasStatusChanged ? (wasDraft ? 'Draft' : oldStatus) : undefined,
        newStatus: hasStatusChanged ? order.status : undefined,
        adminName: session?.user?.name,
        adminEmail: session?.user?.email,
      });
    } catch (logError) {
      console.error('Failed to create API order log:', logError);
    }

    if (hasStatusChanged && nextStatus === 'Delivered' && order.customerEmail) {
      after(async () => {
        await sendOrderDeliveredEmail({ order });
      });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
