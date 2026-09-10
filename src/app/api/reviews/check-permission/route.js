import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import { normalizeEmail, getPhoneRegex } from '@/lib/admin';

export async function GET(req) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const orderId = searchParams.get('orderId');
    const secureToken = searchParams.get('secureToken');
    const guestOrdersParam = searchParams.get('guestOrders');

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    await mongooseConnect();

    // 1. Resolve product
    let product = null;
    if (mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findById(productId).select('_id slug Name').lean();
    }
    if (!product) {
      product = await Product.findOne({ slug: productId }).select('_id slug Name').lean();
    }
    if (!product) {
      return NextResponse.json({ success: true, canReview: false });
    }

    const productIdentifiers = Array.from(
      new Set([product._id.toString(), product.slug, productId].filter(Boolean))
    );

    // 2. If user is logged in
    if (session?.user?.email) {
      const email = normalizeEmail(session.user.email);
      const user = await User.findOne({ email }).select('_id phone').lean();

      // Check if user already reviewed this product
      if (user?._id) {
        const existingReview = await Review.findOne({
          productId: product._id,
          userId: user._id
        }).select('_id').lean();

        if (existingReview) {
          return NextResponse.json({ success: true, canReview: false, alreadyReviewed: true });
        }
      }

      const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const orConditions = [
        { customerEmail: email },
        { customerEmail: emailRegex }
      ];

      if (user?.phone) {
        const phoneRegex = getPhoneRegex(user.phone);
        if (phoneRegex) {
          orConditions.push({ customerPhone: { $regex: phoneRegex } });
        }
      }

      const eligibleOrder = await Order.findOne({
        status: { $in: ['Delivered', 'delivered'] },
        items: {
          $elemMatch: {
            productId: { $in: productIdentifiers },
            isReviewed: { $ne: true }
          }
        },
        $or: orConditions
      }).select('_id orderId customerName').lean();

      return NextResponse.json({ 
        success: true, 
        canReview: !!eligibleOrder,
        orderId: eligibleOrder?.orderId || null,
        customerName: eligibleOrder?.customerName || null
      });
    }

    // 3. If guest / non-signed in user (Check via orderId & token or guestOrders list)
    let candidateGuestOrders = [];
    if (orderId && secureToken) {
      candidateGuestOrders.push({ orderId, secureToken });
    }
    if (guestOrdersParam) {
      try {
        const parsed = JSON.parse(guestOrdersParam);
        if (Array.isArray(parsed)) {
          candidateGuestOrders.push(...parsed);
        }
      } catch (e) {
        // ignore parse error
      }
    }

    if (candidateGuestOrders.length > 0) {
      for (const cand of candidateGuestOrders) {
        if (!cand.orderId || !cand.secureToken) continue;

        const deliveredOrder = await Order.findOne({
          orderId: cand.orderId,
          secureToken: cand.secureToken,
          status: { $in: ['Delivered', 'delivered'] },
          items: {
            $elemMatch: {
              productId: { $in: productIdentifiers },
              isReviewed: { $ne: true }
            }
          }
        }).select('_id orderId secureToken customerName items').lean();

        if (deliveredOrder) {
          return NextResponse.json({
            success: true,
            canReview: true,
            isGuest: true,
            orderId: deliveredOrder.orderId,
            secureToken: deliveredOrder.secureToken,
            customerName: deliveredOrder.customerName
          });
        }
      }
    }

    return NextResponse.json({ success: true, canReview: false });

  } catch (error) {
    console.error('Check review permission error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

