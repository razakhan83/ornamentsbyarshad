import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import mongoose from 'mongoose';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import { trackNocParcel } from '@/lib/nocCourier';
import { requireApiAdmin } from '@/lib/requireAdmin';

export async function POST(request) {
  const auth = await requireApiAdmin({ mutation: true });
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const {
      orderId,
      parcelNo,
      courierName = 'NOC Express',
      thirdPartyNo = '',
      portalKey = 'portal_1',
      nocStatus = 'Booked',
      nocStatusTime = '',
    } = body;

    const cleanParcel = String(parcelNo || '').trim();
    if (!orderId || !cleanParcel) {
      return NextResponse.json(
        { success: false, error: 'Order ID and Parcel Number are required to link.' },
        { status: 400 }
      );
    }

    await mongooseConnect();

    const isObjId = mongoose.Types.ObjectId.isValid(orderId) && orderId.length === 24;
    const orConditions = [{ orderId: String(orderId) }];
    if (isObjId) orConditions.push({ _id: new mongoose.Types.ObjectId(orderId) });

    const order = await Order.findOne({ $or: orConditions, isDeleted: { $ne: true } });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 });
    }

    const now = new Date();
    const formattedNow =
      nocStatusTime ||
      now.toLocaleDateString('en-GB') +
        ' ' +
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    order.nocParcelNo = cleanParcel;
    order.trackingNumber = cleanParcel;
    order.courierName = courierName || 'NOC Express';
    order.nocThirdPartyNo = String(thirdPartyNo || '').trim();
    order.nocAccountId = portalKey || 'portal_1';
    order.nocLabelUrl = `https://shipnoc.com/PrintAirWayBill.aspx?ParcelNo=${cleanParcel}`;
    order.courierBookingStatus = 'booked';
    order.nocStatus = nocStatus || 'Booked';
    order.nocStatusTime = formattedNow;
    order.courierBookingDate = order.courierBookingDate || now;
    order.isDraft = false;

    if (['Draft', 'Pending', 'Order Confirmed', 'In Process', 'Packed'].includes(order.status)) {
      order.status = 'Shipped';
      if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
      order.statusHistory.push({
        status: 'Shipped',
        timestamp: now,
        notes: `Linked with NOC Parcel #${cleanParcel} (${order.courierName})`,
      });
    }

    // Attempt instant live tracking lookup to populate timeline events
    try {
      const trackingData = await trackNocParcel(cleanParcel, portalKey);
      if (Array.isArray(trackingData) && trackingData.length > 0) {
        order.nocTrackingHistory = trackingData;
        const latest = trackingData[trackingData.length - 1];
        if (latest?.Status) {
          order.nocStatus = latest.Status;
          if (latest.StatusDate) order.nocStatusTime = latest.StatusDate;
          if (latest.Remarks) order.nocRemarks = latest.Remarks;
        }
      }
    } catch (trackErr) {
      console.warn(`[Link Parcel] Immediate tracking check failed for ${cleanParcel}:`, trackErr.message);
    }

    await order.save();

    try {
      revalidateTag('orders');
      revalidateTag('admin-dashboard');
      revalidatePath('/admin/orders');
      revalidatePath(`/admin/orders/${order._id}`);
    } catch (revErr) {
      console.error('Revalidation error:', revErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully linked order ${order.orderId} to NOC Parcel #${cleanParcel}.`,
      order: {
        orderId: order.orderId,
        nocParcelNo: order.nocParcelNo,
        trackingNumber: order.trackingNumber,
        courierName: order.courierName,
        nocThirdPartyNo: order.nocThirdPartyNo,
        nocStatus: order.nocStatus,
        status: order.status,
      },
    });
  } catch (error) {
    console.error('Error linking NOC parcel to order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to link parcel to order.' },
      { status: 500 }
    );
  }
}
