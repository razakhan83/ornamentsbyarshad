'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { updateTag } from 'next/cache';

import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import { getServerSession } from 'next-auth';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function assertAdmin(isMutation = true) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.isAdmin) {
    throw new Error('Unauthorized access');
  }
  if (isMutation && session.user?.isDemo) {
    throw new Error('Demo Mode: Actions are disabled. You have read-only access.');
  }
  return session;
}

// ---------------------------------------------------------------------------
// Exported Server Actions
// ---------------------------------------------------------------------------

export async function getProductDetailsAction(productId) {
  await assertAdmin(false);
  await mongooseConnect();
  const Product = (await import('@/models/Product')).default;

  const product = await Product.findById(productId).populate('Category').lean();
  if (!product) {
    throw new Error('Product not found');
  }
  return JSON.parse(JSON.stringify(product));
}

export async function toggleProductLiveAction(productId, nextValue) {
  await assertAdmin();
  await mongooseConnect();
  const Product = (await import('@/models/Product')).default;

  const product = await Product.findById(productId).lean();
  if (!product) {
    throw new Error('Product not found');
  }

  const isLive = nextValue === true || nextValue === 'true';

  const updateResult = await Product.updateOne(
    { _id: productId },
    { $set: { showOnStore: isLive } }
  );

  console.log(`toggleProductLiveAction: updated ${productId} to ${isLive}. Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount}`);

  updateTag('products');
  if (product.slug) {
    updateTag(`product-${product.slug}`);
  }
  updateTag(`product-${product._id.toString()}`);
  updateTag('admin-dashboard');
  updateTag('home-sections');
  revalidatePath(`/products/${product.slug}`);
  revalidatePath(`/products/${product._id.toString()}`);
  revalidatePath('/admin/products');
  revalidatePath('/products');

  return { success: true, showOnStore: isLive };
}

export async function deleteProductAction(productId) {
  await assertAdmin();
  await mongooseConnect();
  const Product = (await import('@/models/Product')).default;
  const Order = (await import('@/models/Order')).default;

  const product = await Product.findById(productId).lean();
  if (!product) {
    throw new Error('Product not found');
  }

  const activeOrderCount = await Order.countDocuments({
    'items.productId': { $in: [productId.toString(), product.slug].filter(Boolean) },
    status: { $in: ['Order Confirmed', 'In Process', 'Packed', 'Shipped', 'Out For Delivery'] },
    isDeleted: false,
    isDraft: false,
  });

  if (activeOrderCount > 0) {
    throw new Error(`Cannot delete product "${product.Name}" because it is in ${activeOrderCount} active unfulfilled order(s). Please fulfill or cancel those orders first, or turn off store visibility.`);
  }

  await Product.findByIdAndDelete(productId);

  updateTag('products');
  if (product.slug) {
    updateTag(`product-${product.slug}`);
  }
  updateTag(`product-${product._id.toString()}`);
  updateTag('admin-dashboard');
  updateTag('home-sections');
  revalidatePath(`/products/${product.slug}`);
  revalidatePath(`/products/${product._id.toString()}`);
  revalidatePath('/admin/products');
  revalidatePath('/products');

  return { success: true };
}

export async function setProductDiscountAction(productId, discountPercentage) {
  await assertAdmin();
  await mongooseConnect();
  const Product = (await import('@/models/Product')).default;

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const pct = Math.min(100, Math.max(0, Number(discountPercentage) || 0));
  product.discountPercentage = pct;
  product.isDiscounted = pct > 0;
  
  // Compute discountedPrice if needed
  if (product.isDiscounted) {
    product.discountedPrice = Math.round(Number(product.Price) * (1 - pct / 100));
  } else {
    product.discountedPrice = null;
  }
  
  await product.save();

  // Use revalidateTag (hard/immediate flush) not updateTag (lazy background)
  // so the admin page re-render after this action gets fresh data from MongoDB
  updateTag('products');
  if (product.slug) {
    updateTag(`product-${product.slug}`);
  }
  updateTag(`product-${product._id.toString()}`);
  updateTag('admin-dashboard');
  updateTag('home-sections');
  revalidatePath(`/products/${product.slug}`);
  revalidatePath(`/products/${product._id.toString()}`);
  revalidatePath('/admin/products');
  revalidatePath('/products');

  return { success: true, discountPercentage: product.discountPercentage, isDiscounted: product.isDiscounted };
}
