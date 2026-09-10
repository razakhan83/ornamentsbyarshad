import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import { requireApiAdmin } from '@/lib/requireAdmin';

export async function GET(request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const orderIdsParam = searchParams.get('orderIds') || '';
    const portalKey = searchParams.get('portalKey') || 'portal_1';

    const orderIdList = orderIdsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (orderIdList.length === 0) {
      return new Response('No order IDs provided.', { status: 400 });
    }

    await mongooseConnect();

    const validObjectIds = orderIdList
      .filter((id) => mongoose.Types.ObjectId.isValid(id) && id.length === 24)
      .map((id) => new mongoose.Types.ObjectId(id));

    const orConditions = [{ orderId: { $in: orderIdList } }];
    if (validObjectIds.length > 0) {
      orConditions.push({ _id: { $in: validObjectIds } });
    }

    const orders = await Order.find({
      $or: orConditions,
      isDeleted: { $ne: true },
    }).lean();

    if (!orders || orders.length === 0) {
      return new Response('No matching orders found.', { status: 404 });
    }

    // Collect all valid parcel numbers
    const validParcelNumbers = [];
    orders.forEach((o) => {
      const pNo = (o.nocParcelNo || o.trackingNumber || '').trim();
      if (pNo) {
        validParcelNumbers.push(pNo);
      }
    });

    if (validParcelNumbers.length === 0) {
      return new Response(
        `<html><body style="font-family:system-ui,sans-serif;padding:30px;text-align:center;">
          <h2>No NOC Tracking Numbers Found</h2>
          <p>Selected orders have not been booked with NOC Express yet. Please book them first.</p>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Direct redirect to NOC official multi-airwaybill page containing all selected slips
    const multiCnQuery = validParcelNumbers.join(',');
    const nocDirectUrl = `https://shipnoc.com/PrintAirWayBill.aspx?ParcelNo=${multiCnQuery}`;

    return NextResponse.redirect(nocDirectUrl, { status: 302 });
  } catch (error) {
    console.error('Error generating print slips:', error);
    return new Response(`Error generating print slips: ${error.message}`, { status: 500 });
  }
}
