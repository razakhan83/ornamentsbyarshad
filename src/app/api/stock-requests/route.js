import { NextResponse } from 'next/server';

import mongooseConnect from '@/lib/mongooseConnect';
import { normalizeEmail, normalizePhone } from '@/lib/admin';
import Product from '@/models/Product';
import StockRequest from '@/models/StockRequest';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    await mongooseConnect();

    const body = await request.json();
    const productId = String(body.productId || '').trim();
    
    // Optional: get session user if logged in
    const session = await getServerSession(authOptions);
    const sessionName = session?.user?.name || '';
    
    const email = normalizeEmail(body.email) || normalizeEmail(session?.user?.email);
    const whatsappNumber = normalizePhone(body.whatsappNumber);

    if (!productId) {
      return NextResponse.json({ success: false, message: 'Product is required.' }, { status: 400 });
    }

    if (!email && !whatsappNumber) {
      return NextResponse.json(
        { success: false, message: 'Please provide a WhatsApp number or an email address.' },
        { status: 400 }
      );
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (whatsappNumber && whatsappNumber.length < 10) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid WhatsApp number.' },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId)
      .select('_id Name slug StockStatus showOnStore')
      .lean();

    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found.' }, { status: 404 });
    }

    const isUnavailable = product.StockStatus === 'Out of Stock' || product.showOnStore === false;
    if (!isUnavailable) {
      return NextResponse.json(
        { success: false, message: 'This product is already available.' },
        { status: 400 }
      );
    }

    const duplicateFilters = [email ? { email } : null, whatsappNumber ? { whatsappNumber } : null].filter(Boolean);
    if (duplicateFilters.length > 0) {
      const existingRequest = await StockRequest.findOne({
        productId: product._id,
        status: 'pending',
        $or: duplicateFilters,
      }).lean();

      if (existingRequest) {
        return NextResponse.json({
          success: true,
          message: 'You are already on the restock list for this product.',
        });
      }
    }

    await StockRequest.create({
      productId: product._id,
      productSlug: product.slug || '',
      productName: product.Name,
      userName: sessionName,
      whatsappNumber,
      email,
    });

    return NextResponse.json({
      success: true,
      message: 'We will let you know when this product is back in stock.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
