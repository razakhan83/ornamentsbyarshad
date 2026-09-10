'use server';

import { revalidatePath } from 'next/cache';
import { connection } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import mongooseConnect from '@/lib/mongooseConnect';
import Counter from '@/models/Counter';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import Order from '@/models/Order';
import Product from '@/models/Product';
import ManualCustomer from '@/models/ManualCustomer';
import { normalizePhone } from '@/lib/admin';

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

function makeOrderId() {
  return `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export async function getNextInvoiceNumberAction() {
  await assertAdmin(true);
  await mongooseConnect();
  
  // Atomic increment for unique sequential INV-00001
  const counter = await Counter.findOneAndUpdate(
    { _id: 'invoice_number' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // If new counter, start from 485 to match existing series or start clean
  let num = counter.seq;
  if (num < 485) {
    const updated = await Counter.findOneAndUpdate(
      { _id: 'invoice_number' },
      { $set: { seq: 485 } },
      { new: true }
    );
    num = updated.seq;
  }

  const formatted = `INV-${String(num).padStart(5, '0')}`;
  return formatted;
}

export async function getNextPaymentNumberAction() {
  await assertAdmin(true);
  await mongooseConnect();
  const counter = await Counter.findOneAndUpdate(
    { _id: 'payment_number' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `PAY-${String(counter.seq).padStart(5, '0')}`;
}

export async function getCustomerPreviousBalanceAction(phone) {
  await assertAdmin(false);
  if (!phone) return { previousBalance: 0, unpaidCount: 0 };
  await mongooseConnect();

  const normPhone = normalizePhone(phone);
  if (!normPhone) return { previousBalance: 0, unpaidCount: 0 };

  const unpaidInvoices = await Invoice.find({
    customerPhone: { $regex: normPhone, $options: 'i' },
    status: { $in: ['SENT', 'PARTIALLY_PAID', 'DRAFT'] },
    isDeleted: false,
  })
    .select('balanceDue')
    .lean();

  const previousBalance = unpaidInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
  return { previousBalance, unpaidCount: unpaidInvoices.length };
}

export async function quickCreateDraftProductAction(productData) {
  await assertAdmin(true);
  await mongooseConnect();

  const { name, description = '', price = 0, sku = '', image = '' } = productData;
  if (!name || !name.trim()) {
    throw new Error('Product name is required.');
  }

  const numPrice = Number(price) || 0;

  const Category = (await import('@/models/Category')).default;
  let cat = await Category.findOne({}).select('_id').lean();
  if (!cat) {
    cat = await Category.create({ name: 'General', slug: 'general' });
  }

  const slugBase = (name.trim() || 'item')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '');
  const uniqueSlug = `${slugBase}-${Date.now().toString(36)}`;

  const newProduct = await Product.create({
    Name: name.trim(),
    Description: description.trim(),
    Price: numPrice,
    compareAtPrice: numPrice,
    slug: uniqueSlug,
    Images: image ? [{ url: image }] : [],
    Category: [cat._id],
    showOnStore: false, // Draft on website as requested!
    stockQuantity: 999,
    StockStatus: 'In Stock',
  });

  return {
    success: true,
    product: {
      _id: newProduct._id.toString(),
      productId: newProduct._id.toString(),
      name: newProduct.Name,
      description: newProduct.Description || '',
      price: newProduct.Price,
      image: newProduct.Images?.[0]?.url || '',
      sku: sku.trim(),
    },
  };
}

export async function createInvoiceAction(formData) {
  await assertAdmin(true);
  await mongooseConnect();

  const {
    invoiceNumber: customInvNum,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    customerCity,
    location = 'Unique Items Collection',
    invoiceDate,
    dueDate,
    terms = 'Due on Receipt',
    salesperson = '',
    items = [],
    discountAmount: flatDiscountAmount,
    discountPercentage = 0,
    shippingAmount = 0,
    previousBalance = 0,
    customerNotes = '1. Thank you for choosing us. We look forward to serving you again.',
    termsAndConditions = '',
    status = 'DRAFT',
    createLinkedOrder = true,
  } = formData;

  if (!customerName || !customerName.trim()) {
    throw new Error('Customer name is required.');
  }
  if (!items || items.length === 0) {
    throw new Error('At least one line item is required.');
  }

  let finalInvoiceNum = customInvNum?.trim();
  if (!finalInvoiceNum) {
    finalInvoiceNum = await getNextInvoiceNumberAction();
  } else {
    const existing = await Invoice.findOne({ invoiceNumber: finalInvoiceNum });
    if (existing) {
      finalInvoiceNum = await getNextInvoiceNumberAction();
    }
  }

  const parsedItems = items.map((it) => {
    const qty = Math.max(1, Number(it.quantity) || 1);
    const prc = Math.max(0, Number(it.price) || 0);
    return {
      productId: String(it.productId || ''),
      name: String(it.name || 'Unnamed Item').trim(),
      description: String(it.description || '').trim(),
      image: String(it.image || '').trim(),
      quantity: qty,
      price: prc,
      amount: qty * prc,
    };
  });

  const subtotal = parsedItems.reduce((sum, item) => sum + item.amount, 0);
  // Support flat PKR discount (new) or fallback to percentage (legacy)
  let discountAmount;
  if (flatDiscountAmount !== undefined && flatDiscountAmount !== null) {
    discountAmount = Math.max(0, Number(flatDiscountAmount) || 0);
  } else {
    const pct = Math.max(0, Math.min(100, Number(discountPercentage) || 0));
    discountAmount = Math.round((subtotal * pct) / 100);
  }
  const shipAmt = Math.max(0, Number(shippingAmount) || 0);
  const prevBal = Math.max(0, Number(previousBalance) || 0);

  const totalAmount = Math.max(0, subtotal - discountAmount + shipAmt + prevBal);
  const balanceDue = totalAmount; // Initially no payment recorded

  // 1. Create Invoice Document
  const invoice = await Invoice.create({
    invoiceNumber: finalInvoiceNum,
    customerName: customerName.trim(),
    customerPhone: (customerPhone || '').trim(),
    customerEmail: (customerEmail || '').trim().toLowerCase(),
    customerAddress: (customerAddress || '').trim(),
    customerCity: (customerCity || '').trim(),
    location,
    invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
    dueDate: dueDate ? new Date(dueDate) : new Date(),
    terms,
    salesperson,
    items: parsedItems,
    subtotal,
    discountPercentage: 0,
    discountAmount,
    shippingAmount: shipAmt,
    previousBalance: prevBal,
    totalAmount,
    paidAmount: 0,
    balanceDue,
    status: status || 'DRAFT',
    customerNotes,
    termsAndConditions,
  });

  // 2-Way Sync: Auto-create corresponding Order in database (if requested)
  let newOrder = null;
  if (createLinkedOrder) {
    const orderId = makeOrderId();
    newOrder = await Order.create({
      orderId,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerEmail: invoice.customerEmail,
      customerAddress: invoice.customerAddress,
      customerCity: invoice.customerCity,
      items: parsedItems.map((it) => ({
        productId: it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        image: it.image,
      })),
      totalAmount,
      shippingAmount: shipAmt,
      paymentStatus: status === 'PAID' ? 'Online' : 'COD',
      status: 'Order Confirmed',
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      isDraft: status === 'DRAFT',
    });

    // Update Invoice with Order link
    invoice.orderId = newOrder.orderId;
    invoice.orderRef = newOrder._id;
    await invoice.save();
  }


  // Save customer to ManualCustomers if phone provided
  if (invoice.customerPhone) {
    const existingCust = await ManualCustomer.findOne({ phone: invoice.customerPhone });
    if (!existingCust) {
      await ManualCustomer.create({
        name: invoice.customerName,
        phone: invoice.customerPhone,
        email: invoice.customerEmail,
        address: invoice.customerAddress,
        city: invoice.customerCity,
      }).catch(() => {});
    }
  }

  revalidatePath('/admin/invoices');
  revalidatePath('/admin/orders');

  return {
    success: true,
    invoiceId: invoice._id.toString(),
    invoiceNumber: invoice.invoiceNumber,
    orderId: newOrder.orderId,
  };
}

export async function updateInvoiceAction(invoiceId, formData) {
  await assertAdmin(true);
  await mongooseConnect();

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice || invoice.isDeleted) {
    throw new Error('Invoice not found.');
  }

  const {
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    customerCity,
    location,
    invoiceDate,
    dueDate,
    terms,
    salesperson,
    items = [],
    discountAmount: flatDiscountAmount,
    discountPercentage = 0,
    shippingAmount = 0,
    previousBalance = 0,
    customerNotes,
    termsAndConditions,
    status,
  } = formData;

  if (customerName) invoice.customerName = customerName.trim();
  if (customerPhone !== undefined) invoice.customerPhone = customerPhone.trim();
  if (customerEmail !== undefined) invoice.customerEmail = customerEmail.trim().toLowerCase();
  if (customerAddress !== undefined) invoice.customerAddress = customerAddress.trim();
  if (customerCity !== undefined) invoice.customerCity = customerCity.trim();
  if (location) invoice.location = location;
  if (invoiceDate) invoice.invoiceDate = new Date(invoiceDate);
  if (dueDate) invoice.dueDate = new Date(dueDate);
  if (terms) invoice.terms = terms;
  if (salesperson !== undefined) invoice.salesperson = salesperson;
  if (customerNotes !== undefined) invoice.customerNotes = customerNotes;
  if (termsAndConditions !== undefined) invoice.termsAndConditions = termsAndConditions;

  if (items && items.length > 0) {
    invoice.items = items.map((it) => {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const prc = Math.max(0, Number(it.price) || 0);
      return {
        productId: String(it.productId || ''),
        name: String(it.name || 'Unnamed Item').trim(),
        description: String(it.description || '').trim(),
        image: String(it.image || '').trim(),
        quantity: qty,
        price: prc,
        amount: qty * prc,
      };
    });
  }

  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  let discountAmount;
  if (flatDiscountAmount !== undefined && flatDiscountAmount !== null) {
    discountAmount = Math.max(0, Number(flatDiscountAmount) || 0);
  } else if (discountPercentage !== undefined && discountPercentage !== null) {
    const pct = Math.max(0, Math.min(100, Number(discountPercentage) || 0));
    discountAmount = Math.round((subtotal * pct) / 100);
  } else {
    discountAmount = invoice.discountAmount || 0;
  }
  const shipAmt = Math.max(0, Number(shippingAmount ?? invoice.shippingAmount) || 0);
  const prevBal = Math.max(0, Number(previousBalance ?? invoice.previousBalance) || 0);

  invoice.subtotal = subtotal;
  invoice.discountPercentage = 0;
  invoice.discountAmount = discountAmount;
  invoice.shippingAmount = shipAmt;
  invoice.previousBalance = prevBal;
  invoice.totalAmount = Math.max(0, subtotal - discountAmount + shipAmt + prevBal);

  // Recalculate balance due based on existing payments
  invoice.balanceDue = Math.max(0, invoice.totalAmount - (invoice.paidAmount || 0));

  if (status) {
    invoice.status = status;
  } else if (invoice.balanceDue <= 0 && invoice.totalAmount > 0) {
    invoice.status = 'PAID';
  } else if (invoice.paidAmount > 0) {
    invoice.status = 'PARTIALLY_PAID';
  }

  await invoice.save();

  // 2-Way Sync: Update linked Order
  if (invoice.orderRef || invoice.orderId) {
    const query = invoice.orderRef ? { _id: invoice.orderRef } : { orderId: invoice.orderId };
    await Order.updateOne(query, {
      $set: {
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        customerEmail: invoice.customerEmail,
        customerAddress: invoice.customerAddress,
        customerCity: invoice.customerCity,
        totalAmount: invoice.totalAmount,
        shippingAmount: invoice.shippingAmount,
        items: invoice.items.map((it) => ({
          productId: it.productId,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          image: it.image,
        })),
        isDraft: invoice.status === 'DRAFT',
      },
    }).catch(() => {});
  }

  revalidatePath('/admin/invoices');
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath('/admin/orders');

  return { success: true };
}

export async function deleteInvoiceAction(invoiceId) {
  await assertAdmin(true);
  await mongooseConnect();

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error('Invoice not found.');

  invoice.isDeleted = true;
  invoice.deletedAt = new Date();
  await invoice.save();

  if (invoice.orderRef || invoice.orderId) {
    const query = invoice.orderRef ? { _id: invoice.orderRef } : { orderId: invoice.orderId };
    await Order.updateOne(query, { $set: { isDeleted: true, deletedAt: new Date() } }).catch(() => {});
  }

  revalidatePath('/admin/invoices');
  revalidatePath('/admin/orders');
  return { success: true };
}

export async function restoreInvoiceAction(invoiceId) {
  await assertAdmin(true);
  await mongooseConnect();

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error('Invoice not found.');

  invoice.isDeleted = false;
  invoice.deletedAt = null;
  await invoice.save();

  // Also restore linked order
  if (invoice.orderRef || invoice.orderId) {
    const query = invoice.orderRef ? { _id: invoice.orderRef } : { orderId: invoice.orderId };
    await Order.updateOne(query, { $set: { isDeleted: false, deletedAt: null } }).catch(() => {});
  }

  revalidatePath('/admin/invoices');
  revalidatePath('/admin/orders');
  return { success: true };
}

export async function bulkMarkInvoicesSentAction(invoiceIds = []) {
  await assertAdmin(true);
  await mongooseConnect();

  const ids = Array.from(new Set(invoiceIds)).filter(Boolean);
  if (ids.length === 0) throw new Error('Select at least one invoice.');

  await Invoice.updateMany(
    { _id: { $in: ids }, isDeleted: false },
    { $set: { status: 'SENT' } }
  );

  revalidatePath('/admin/invoices');
  return { success: true, count: ids.length };
}

export async function bulkDeleteInvoicesAction(invoiceIds = []) {
  await assertAdmin(true);
  await mongooseConnect();

  const ids = Array.from(new Set(invoiceIds)).filter(Boolean);
  if (ids.length === 0) throw new Error('Select at least one invoice.');

  const invoices = await Invoice.find({ _id: { $in: ids } }).select('orderRef orderId').lean();

  await Invoice.updateMany(
    { _id: { $in: ids } },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );

  // 2-way sync: Also delete linked orders
  const orderRefs = invoices.map((i) => i.orderRef).filter(Boolean);
  const orderIds = invoices.map((i) => i.orderId).filter(Boolean);

  if (orderRefs.length > 0 || orderIds.length > 0) {
    await Order.updateMany(
      { $or: [{ _id: { $in: orderRefs } }, { orderId: { $in: orderIds } }] },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    ).catch(() => {});
  }

  revalidatePath('/admin/invoices');
  revalidatePath('/admin/orders');
  return { success: true, count: ids.length };
}

export async function bulkRestoreInvoicesAction(invoiceIds = []) {
  await assertAdmin(true);
  await mongooseConnect();

  const ids = Array.from(new Set(invoiceIds)).filter(Boolean);
  if (ids.length === 0) throw new Error('Select at least one invoice.');

  const invoices = await Invoice.find({ _id: { $in: ids } }).select('orderRef orderId').lean();

  await Invoice.updateMany(
    { _id: { $in: ids } },
    { $set: { isDeleted: false, deletedAt: null } }
  );

  // 2-way sync: Also restore linked orders
  const orderRefs = invoices.map((i) => i.orderRef).filter(Boolean);
  const orderIds = invoices.map((i) => i.orderId).filter(Boolean);

  if (orderRefs.length > 0 || orderIds.length > 0) {
    await Order.updateMany(
      { $or: [{ _id: { $in: orderRefs } }, { orderId: { $in: orderIds } }] },
      { $set: { isDeleted: false, deletedAt: null } }
    ).catch(() => {});
  }

  revalidatePath('/admin/invoices');
  revalidatePath('/admin/orders');
  return { success: true, count: ids.length };
}

export async function hardDeleteInvoiceAction(invoiceId) {
  await assertAdmin(true);
  await mongooseConnect();

  await Invoice.findByIdAndDelete(invoiceId);
  revalidatePath('/admin/invoices');
  return { success: true };
}

export async function emptyInvoiceTrashAction() {
  await assertAdmin(true);
  await mongooseConnect();

  const result = await Invoice.deleteMany({ isDeleted: true });
  revalidatePath('/admin/invoices');
  return { success: true, deletedCount: result.deletedCount };
}

export async function recordPaymentAction(paymentData) {
  await assertAdmin(true);
  await mongooseConnect();

  const { invoiceId, amount, paymentDate, paymentMode, referenceNumber, notes } = paymentData;

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice || invoice.isDeleted) {
    throw new Error('Invoice not found.');
  }

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const paymentNumber = await getNextPaymentNumberAction();

  const payment = await Payment.create({
    paymentNumber,
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    orderId: invoice.orderId || '',
    customerName: invoice.customerName,
    customerPhone: invoice.customerPhone,
    amount: numAmount,
    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    paymentMode: paymentMode || 'Cash',
    referenceNumber: (referenceNumber || '').trim(),
    notes: (notes || '').trim(),
  });

  invoice.paidAmount = (invoice.paidAmount || 0) + numAmount;
  invoice.balanceDue = Math.max(0, invoice.totalAmount - invoice.paidAmount);

  // Auto move from DRAFT to SENT/PARTIALLY_PAID or PAID on payment receipt
  if (invoice.balanceDue <= 0) {
    invoice.status = 'PAID';
  } else {
    invoice.status = 'PARTIALLY_PAID';
  }

  await invoice.save();

  // Sync payment status to order
  if (invoice.orderRef || invoice.orderId) {
    const query = invoice.orderRef ? { _id: invoice.orderRef } : { orderId: invoice.orderId };
    await Order.updateOne(query, {
      $set: {
        paymentStatus: invoice.status === 'PAID' ? 'Online' : 'COD',
      },
    }).catch(() => {});
  }

  revalidatePath('/admin/invoices');
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath('/admin/payments');
  revalidatePath('/admin/orders');

  return { success: true, paymentId: payment._id.toString(), paymentNumber: payment.paymentNumber };
}

// Manually move/update invoice status (e.g. DRAFT -> SENT, SENT -> DRAFT, etc.)
export async function updateInvoiceStatusAction(invoiceId, newStatus) {
  await assertAdmin();
  await mongooseConnect();

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice || invoice.isDeleted) {
    throw new Error('Invoice not found.');
  }

  const validStatuses = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error('Invalid invoice status.');
  }

  invoice.status = newStatus;
  await invoice.save();

  revalidatePath('/admin/invoices');
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { success: true, status: invoice.status };
}

export async function getInvoicesAction({ page = 1, limit = 20, search = '', status = 'ALL' }) {
  await assertAdmin(false);
  await connection();
  await mongooseConnect();

  const isTrash = status === 'TRASH';
  const query = { isDeleted: isTrash };

  if (!isTrash && status && status !== 'ALL') {
    query.status = status;
  }
  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { invoiceNumber: { $regex: s, $options: 'i' } },
      { orderId: { $regex: s, $options: 'i' } },
      { customerName: { $regex: s, $options: 'i' } },
      { customerPhone: { $regex: s, $options: 'i' } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  // Lightweight query using lean and select for server performance
  const [invoices, totalCount, aggregateStats, trashCount] = await Promise.all([
    Invoice.find(query)
      .select('invoiceNumber orderId customerName invoiceDate dueDate totalAmount balanceDue paidAmount status createdAt isDeleted deletedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(query),
    Invoice.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalUnpaid: { $sum: '$balanceDue' },
          draftCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'DRAFT'] }, 1, 0],
            },
          },
          sentCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'SENT'] }, 1, 0],
            },
          },
        },
      },
    ]),
    Invoice.countDocuments({ isDeleted: true }),
  ]);

  const stats = aggregateStats[0] || { totalUnpaid: 0, draftCount: 0, sentCount: 0 };
  stats.trashCount = trashCount;

  return {
    invoices: invoices.map((inv) => ({
      ...inv,
      _id: inv._id.toString(),
      invoiceDate: inv.invoiceDate?.toISOString() || null,
      dueDate: inv.dueDate?.toISOString() || null,
      createdAt: inv.createdAt?.toISOString() || null,
      deletedAt: inv.deletedAt?.toISOString() || null,
    })),
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    stats,
  };
}

export async function getInvoiceByIdAction(id) {
  await assertAdmin(false);
  await connection();
  await mongooseConnect();

  if (!id) return null;
  const mongoose = (await import('mongoose')).default;
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ _id: id }, { invoiceNumber: id }] }
    : { invoiceNumber: id };

  const invoice = await Invoice.findOne(query).lean();
  if (!invoice) return null;

  const payments = await Payment.find({ invoiceId: invoice._id }).sort({ paymentDate: -1 }).lean();

  const Settings = (await import('@/models/Settings')).default;
  const settingsDoc = await Settings.findOne({ key: 'site-settings' }).lean().catch(() => null);
  const logoUrl = settingsDoc?.branding?.darkLogoUrl || settingsDoc?.branding?.lightLogoUrl || '/Chaina-Store-Logo1.png';

  // Populate missing item images from Product collection (safe for ObjectId and slug)
  const rawItemProductIds = (invoice.items || [])
    .map((it) => it.productId)
    .filter(Boolean);

  let productImgMap = {};
  if (rawItemProductIds.length > 0) {
    const validObjectIds = rawItemProductIds.filter(
      (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)
    );
    const stringIds = rawItemProductIds.map(String);

    const orClauses = [];
    if (validObjectIds.length > 0) {
      orClauses.push({ _id: { $in: validObjectIds } });
    }
    if (stringIds.length > 0) {
      orClauses.push({ slug: { $in: stringIds } });
    }

    if (orClauses.length > 0) {
      const products = await Product.find({ $or: orClauses })
        .select('Images images slug _id')
        .lean()
        .catch(() => []);

      products.forEach((p) => {
        const imgUrl = p.Images?.[0]?.url || p.images?.[0]?.url || (typeof p.images?.[0] === 'string' ? p.images[0] : '');
        if (imgUrl) {
          if (p._id) productImgMap[p._id.toString()] = imgUrl;
          if (p.slug) productImgMap[p.slug] = imgUrl;
        }
      });
    }
  }

  return {
    ...invoice,
    _id: invoice._id.toString(),
    storeLogoUrl: logoUrl,
    orderRef: invoice.orderRef ? invoice.orderRef.toString() : null,
    invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.toISOString() : null,
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    createdAt: invoice.createdAt ? invoice.createdAt.toISOString() : null,
    updatedAt: invoice.updatedAt ? invoice.updatedAt.toISOString() : null,
    deletedAt: invoice.deletedAt ? invoice.deletedAt.toISOString() : null,
    items: (invoice.items || []).map((it) => {
      const fallbackImg = it.productId ? productImgMap[it.productId.toString()] : '';
      return {
        ...it,
        _id: it._id ? it._id.toString() : undefined,
        image: it.image || fallbackImg || '',
      };
    }),
    payments: payments.map((p) => ({
      ...p,
      _id: p._id.toString(),
      invoiceId: p.invoiceId.toString(),
      paymentDate: p.paymentDate ? p.paymentDate.toISOString() : null,
      createdAt: p.createdAt ? p.createdAt.toISOString() : null,
    })),
  };
}
