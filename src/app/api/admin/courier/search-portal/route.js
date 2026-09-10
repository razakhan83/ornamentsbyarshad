import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import { fetchNocPortalDashboard } from '@/lib/nocCourier';
import { requireApiAdmin } from '@/lib/requireAdmin';

export async function GET(request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const orderIdParam = searchParams.get('orderId') || '';
    const queryPhone = searchParams.get('phone') || '';
    const queryName = searchParams.get('name') || '';
    const queryCity = searchParams.get('city') || '';
    const portalKey = searchParams.get('portalKey') || 'all';

    let order = null;
    let targetPhone = queryPhone.trim();
    let targetName = queryName.trim();
    let targetCity = queryCity.trim();

    await mongooseConnect();

    if (orderIdParam) {
      const isObjId = mongoose.Types.ObjectId.isValid(orderIdParam) && orderIdParam.length === 24;
      const orConditions = [{ orderId: orderIdParam }];
      if (isObjId) orConditions.push({ _id: new mongoose.Types.ObjectId(orderIdParam) });

      order = await Order.findOne({ $or: orConditions, isDeleted: { $ne: true } }).lean();
      if (order) {
        if (!targetPhone && order.customerPhone) targetPhone = order.customerPhone.trim();
        if (!targetName && order.customerName) targetName = order.customerName.trim();
        if (!targetCity && order.customerCity) targetCity = order.customerCity.trim();
      }
    }

    if (!targetPhone && !targetName && !orderIdParam) {
      return NextResponse.json(
        { success: false, error: 'Please provide an orderId, phone, or customer name to search on NOC.' },
        { status: 400 }
      );
    }

    // Clean phone numbers for comparison (remove leading 0 or +92)
    const normalizePhone = (num) => {
      if (!num) return '';
      return String(num).replace(/[^0-9]/g, '').slice(-10);
    };

    const targetPhone10 = normalizePhone(targetPhone);
    const targetNameNorm = targetName.toLowerCase().trim();
    const targetCityNorm = targetCity.toLowerCase().trim();

    // Fetch live dashboard rows from both portals (or requested portal)
    const portalsToFetch = portalKey === 'all' ? ['portal_1', 'portal_2'] : [portalKey];
    const fetchPromises = portalsToFetch.map((pkey) => fetchNocPortalDashboard(pkey));
    const portalResults = await Promise.allSettled(fetchPromises);

    let allDashboardRows = [];
    portalResults.forEach((res) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allDashboardRows.push(...res.value);
      }
    });

    if (allDashboardRows.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
        message: 'No active bookings found on NOC portal within the last 45 days.',
        orderContext: order ? { orderId: order.orderId, customerName: order.customerName, customerPhone: order.customerPhone } : null,
      });
    }

    // Match each dashboard row against target customer
    const matches = [];

    allDashboardRows.forEach((row) => {
      const rowConsignee = (row.consignee || '').toLowerCase().trim();
      const rowCity = (row.city || '').toLowerCase().trim();
      const rowParcelNo = (row.parcelNo || '').trim();
      const row3rdParty = (row.thirdPartyNo || '').trim();
      const rowStatus = (row.status || '').trim();
      const rowDate = (row.statusDate || '').trim();

      let matchScore = 0;
      const reasons = [];

      // If order already has this tracking number
      if (order && (order.nocParcelNo === rowParcelNo || order.trackingNumber === rowParcelNo)) {
        matchScore += 100;
        reasons.push('Exact Tracking Number match');
      }

      // Exact name match
      if (targetNameNorm && rowConsignee) {
        if (rowConsignee === targetNameNorm) {
          matchScore += 50;
          reasons.push('Exact Customer Name match');
        } else if (rowConsignee.includes(targetNameNorm) || targetNameNorm.includes(rowConsignee)) {
          matchScore += 30;
          reasons.push('Partial Customer Name match');
        }
      }

      // City match
      if (targetCityNorm && rowCity) {
        if (rowCity.includes(targetCityNorm) || targetCityNorm.includes(rowCity)) {
          matchScore += 20;
          reasons.push('City match');
        }
      }

      // Recent/Active Status bonus (prioritize Booked / In Transit over Delivered/Cancelled)
      const isAncientStatus = /delivered|completed|returned|cancelled|payment done/i.test(rowStatus);
      const isRecentStatus = /booked|transit|pickup|station|dispatched|arrival|runshet|office/i.test(rowStatus);

      if (isRecentStatus) {
        matchScore += 25;
      } else if (isAncientStatus) {
        matchScore -= 10;
      }

      if (matchScore >= 30) {
        matches.push({
          parcelNo: rowParcelNo,
          thirdPartyNo: row3rdParty,
          courier: row.courier || 'NOC',
          status: rowStatus || 'Booked',
          statusDate: rowDate,
          consignee: row.consignee,
          city: row.city,
          portalKey: row.portalKey,
          matchScore,
          matchReasons: reasons,
          isRecent: isRecentStatus,
          isAlreadyLinked: Boolean(order && (order.nocParcelNo === rowParcelNo || order.trackingNumber === rowParcelNo)),
        });
      }
    });

    // Sort by match score (highest first) and then by date
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      success: true,
      matches,
      totalFound: matches.length,
      orderContext: order
        ? {
            _id: order._id,
            orderId: order.orderId,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerCity: order.customerCity,
            totalAmount: order.totalAmount,
            currentParcelNo: order.nocParcelNo || order.trackingNumber || '',
            currentStatus: order.status,
          }
        : null,
    });
  } catch (error) {
    console.error('Error searching NOC portal bookings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search NOC portal' },
      { status: 500 }
    );
  }
}
