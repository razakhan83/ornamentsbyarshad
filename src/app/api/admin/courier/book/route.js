import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import { bookNocParcels } from '@/lib/nocCourier';
import { requireApiAdmin } from '@/lib/requireAdmin';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { orderIds, portalKey = 'portal_1' } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide a list of order IDs to book.' },
        { status: 400 }
      );
    }

    await mongooseConnect();

    // Fetch target orders
    const orders = await Order.find({
      $or: [
        { _id: { $in: orderIds.filter((id) => /^[0-9a-fA-F]{24}$/.test(id)) } },
        { orderId: { $in: orderIds } },
      ],
      isDeleted: { $ne: true },
    });

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No matching orders found to book.' },
        { status: 404 }
      );
    }

    // Preserve selection order
    const orderMap = new Map();
    orders.forEach((o) => {
      orderMap.set(String(o._id), o);
      if (o.orderId) orderMap.set(String(o.orderId), o);
    });

    const orderedList = [];
    orderIds.forEach((id) => {
      const found = orderMap.get(String(id));
      if (found && !orderedList.some((m) => String(m._id) === String(found._id))) {
        orderedList.push(found);
      }
    });

    const targetOrders = orderedList.length > 0 ? orderedList : orders;

    // Book each order with its own dedicated NOC API call so NOC creates distinct CNs
    const now = new Date();
    const formattedNow =
      now.toLocaleDateString('en-GB') +
      ' ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const updatedOrders = [];
    const failedOrders = [];
    const parcelNumbers = [];

    const bookingPromises = targetOrders.map(async (order) => {
      const codVal =
        order.manualCodAmount != null && order.manualCodAmount !== ''
          ? Number(order.manualCodAmount)
          : Number(order.totalAmount || 0);

      const emailRaw = (order.customerEmail || '').trim();
      const emailVal =
        emailRaw && emailRaw.includes('@') && emailRaw.includes('.')
          ? emailRaw
          : 'customer@chinaunique.pk';

      const singleParcelPayload = [
        {
          consigneeName: order.customerName || 'Customer',
          consigneeAddress: order.customerAddress || 'Address',
          consigneeEmail: emailVal,
          consigneeCellNo: order.customerPhone || '',
          itemType: order.itemType || 'Mix',
          city: order.customerCity || 'Karachi',
          quantity: order.orderQuantity || 1,
          codAmount: codVal,
          weight: order.weight || 2,
          specialInstruction: order.landmark || order.notes || '',
        },
      ];

      try {
        const apiResult = await bookNocParcels(singleParcelPayload, portalKey);

        if (apiResult.Response !== 'success') {
          throw new Error(
            apiResult.ErrorDescription || 'NOC Courier booking failed for this order.'
          );
        }

        // Parse unique parcel number from "Parcel Booked Successfully :16216206417422"
        const desc = apiResult.ErrorDescription || '';
        const colonIdx = desc.indexOf(':');
        let trackingNo = '';
        if (colonIdx !== -1) {
          trackingNo = desc.substring(colonIdx + 1).split(',')[0].trim();
        }

        if (!trackingNo) {
          throw new Error('NOC API did not return a valid parcel number.');
        }

        const slipUrl = apiResult.LabelURL || '';

        order.courierName = 'NOC Express';
        order.trackingNumber = trackingNo;
        order.nocParcelNo = trackingNo;
        order.nocThirdPartyNo = '';
        order.nocRemarks = '';
        order.nocLabelUrl = slipUrl;
        order.nocAccountId = portalKey;
        order.courierBookingStatus = 'booked';
        order.nocStatus = 'Booked';
        order.nocStatusTime = formattedNow;
        order.courierBookingDate = now;
        order.courierResponseDetails = apiResult;
        order.nocLastTrackedAt = null;

        // Update status to Shipped & convert draft if needed
        order.status = 'Shipped';
        order.isDraft = false;
        if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
        order.statusHistory.push({ status: 'Shipped', timestamp: now });

        await order.save();

        return {
          success: true,
          orderId: order.orderId,
          trackingNumber: trackingNo,
          labelUrl: slipUrl,
          status: 'Shipped',
        };
      } catch (err) {
        console.error(`NOC booking error for order ${order.orderId}:`, err.message);
        return {
          success: false,
          orderId: order.orderId,
          error: err.message || 'Booking failed',
        };
      }
    });

    const results = await Promise.all(bookingPromises);

    results.forEach((r) => {
      if (r.success) {
        updatedOrders.push(r);
        if (r.trackingNumber) parcelNumbers.push(r.trackingNumber);
      } else {
        failedOrders.push(r);
      }
    });

    if (updatedOrders.length === 0) {
      const firstErr = failedOrders[0]?.error || 'Failed to book parcels with NOC Express.';
      return NextResponse.json(
        {
          success: false,
          error: `NOC Booking Failed: ${firstErr}`,
          failedOrders,
        },
        { status: 400 }
      );
    }

    // Revalidate caches
    try {
      revalidateTag('orders');
      revalidateTag('admin-dashboard');
      revalidatePath('/admin/orders');
    } catch (revErr) {
      console.error('Error revalidating orders cache after NOC booking:', revErr);
    }

    const multiCnQuery = parcelNumbers.filter(Boolean).join(',');
    const multiLabelUrl = multiCnQuery
      ? `https://shipnoc.com/PrintAirWayBill.aspx?ParcelNo=${multiCnQuery}`
      : (updatedOrders[0]?.labelUrl || '');

    const accountLabel =
      portalKey === 'portal_2' ? 'Secondary Account (aamsaman)' : 'Main Account (unique items)';

    let message = `Successfully booked ${updatedOrders.length} order(s) individually with NOC Express (${accountLabel}).`;
    if (failedOrders.length > 0) {
      message += ` (${failedOrders.length} order(s) failed: ${failedOrders.map((f) => `${f.orderId} - ${f.error}`).join(', ')})`;
    }

    return NextResponse.json({
      success: true,
      message,
      labelUrl: multiLabelUrl,
      parcelNumbers,
      portalKey,
      updatedOrders,
      failedOrders,
    });
  } catch (error) {
    console.error('Courier bulk book API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error while booking courier.',
      },
      { status: 500 }
    );
  }
}
