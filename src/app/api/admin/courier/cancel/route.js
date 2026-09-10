import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import { cancelNocParcel } from '@/lib/nocCourier';
import { requireApiAdmin } from '@/lib/requireAdmin';

export async function POST(request) {
  const auth = await requireApiAdmin({ mutation: true });
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { orderId, trackingNumber, portalKey } = body;

    await mongooseConnect();

    let order = null;
    if (orderId) {
      const orderIdStr = String(orderId).trim();
      const orConditions = [{ orderId: orderIdStr }];
      if (mongoose.Types.ObjectId.isValid(orderIdStr) && orderIdStr.length === 24) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(orderIdStr) });
      }
      order = await Order.findOne({
        $or: orConditions,
        isDeleted: { $ne: true },
      });
    } else if (trackingNumber) {
      order = await Order.findOne({ trackingNumber: String(trackingNumber).trim(), isDeleted: { $ne: true } });
    }

    const targetParcelNo = trackingNumber || order?.trackingNumber;
    const targetPortalKey = portalKey || order?.nocAccountId || 'portal_1';

    if (!targetParcelNo) {
      return NextResponse.json(
        { success: false, error: 'Tracking number is required to cancel courier booking.' },
        { status: 400 }
      );
    }

    const apiResult = await cancelNocParcel([targetParcelNo], targetPortalKey);

    if (order) {
      order.courierBookingStatus = 'cancelled';
      if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
      order.statusHistory.push({
        status: 'Courier Booking Cancelled',
        timestamp: new Date(),
      });
      await order.save();
    }

    return NextResponse.json({
      success: true,
      message: `Cancellation request submitted to NOC Express for parcel #${targetParcelNo}.`,
    });
  } catch (error) {
    console.error('Error cancelling NOC parcel:', error);
    return NextResponse.json(
      { success: false, error: 'Server error cancelling NOC parcel' },
      { status: 500 }
    );
  }
}
