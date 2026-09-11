import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import Settings from '@/models/Settings';

export async function POST(req) {
  try {
    const body = await req.json();
    await mongooseConnect();

    const settings = await Settings.findOne({ singletonKey: 'site-settings' }).lean();
    if (!settings?.asaanPayEnabled) {
      return NextResponse.json({ success: false, message: 'AsaanPay is disabled' }, { status: 400 });
    }

    // Extract relevant payload fields from AsaanPay webhook
    const orderId = body?.order_id || body?.orderId || body?.merchant_order_id || body?.transaction_id;
    const status = body?.status || body?.transaction_status || body?.payment_status;
    const paymentAmount = body?.amount || body?.transaction_amount;

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Missing order reference' }, { status: 400 });
    }

    // Find the matching order by tracking number, custom order ID, or MongoDB _id
    const order = await Order.findOne({
      $or: [
        { customOrderId: orderId },
        { trackingNumber: orderId },
        { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null },
      ].filter(Boolean),
    });

    if (order) {
      if (status === 'SUCCESS' || status === 'PAID' || status === 'COMPLETED' || status === 'success') {
        order.isPaid = true;
        order.paymentStatus = 'paid';
        order.paymentMethod = 'asaanpay';
        if (paymentAmount) order.paidAmount = Number(paymentAmount);
        await order.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: 'AsaanPay webhook received and processed successfully',
    });
  } catch (error) {
    console.error('[AsaanPay Webhook] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
