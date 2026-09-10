import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import { trackNocParcel, fetchNocPortalDashboard } from '@/lib/nocCourier';
import { parseDateSafe } from '@/lib/timeAgo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingNumber = searchParams.get('trackingNumber') || searchParams.get('parcelNo');
    const orderId = searchParams.get('orderId');
    const portalKeyParam = searchParams.get('portalKey');

    let order = null;

    await mongooseConnect();

    if (orderId) {
      order = await Order.findOne({
        $or: [{ orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }],
        isDeleted: { $ne: true },
      });
    } else if (trackingNumber) {
      order = await Order.findOne({
        $or: [
          { trackingNumber },
          { nocParcelNo: trackingNumber },
          { nocThirdPartyNo: trackingNumber }
        ],
        isDeleted: { $ne: true }
      });
    }

    const targetParcelNo = order?.nocParcelNo || order?.trackingNumber || trackingNumber;
    const targetPortalKey = portalKeyParam || order?.nocAccountId || 'portal_1';

    // If order has no 3rd party CN, courier is generic, or parcelNo is missing, attempt live portal resolution
    if (order) {
      try {
        const portalRows = await fetchNocPortalDashboard(targetPortalKey);
        const match = portalRows.find(
          (r) =>
            (targetParcelNo && r.parcelNo === targetParcelNo) ||
            (targetParcelNo && r.thirdPartyNo === targetParcelNo) ||
            (order.nocParcelNo && r.parcelNo === order.nocParcelNo) ||
            (order.nocThirdPartyNo && r.thirdPartyNo === order.nocThirdPartyNo) ||
            (order.trackingNumber && (r.parcelNo === order.trackingNumber || r.thirdPartyNo === order.trackingNumber))
        );
        if (match) {
          if (match.courier) order.courierName = match.courier;
          if (match.thirdPartyNo) order.nocThirdPartyNo = match.thirdPartyNo;
          if (match.parcelNo) order.nocParcelNo = match.parcelNo;
          if (match.status && !match.status.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
            order.nocStatus = match.status;
          }
          if (match.statusDate) order.nocStatusTime = match.statusDate;
          await order.save();
        }
      } catch (e) {
        console.warn('Live portal resolution in track route skipped:', e?.message);
      }
    }

    // Collect all candidate tracking numbers
    const candidateNumbers = [
      order?.nocParcelNo,
      order?.nocThirdPartyNo,
      order?.trackingNumber,
      trackingNumber,
    ].filter((n) => n && typeof n === 'string' && n.trim() !== '' && n.trim() !== '—' && n.trim() !== 'N/A' && !n.match(/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/));

    const uniqueCandidates = [...new Set(candidateNumbers.map((n) => n.trim()))];

    if (uniqueCandidates.length === 0 && !targetParcelNo) {
      return NextResponse.json(
        { success: false, error: 'Tracking number or order ID is required.' },
        { status: 400 }
      );
    }

    // Call NOC Express GetParcelTracking API across candidate numbers
    let trackingResult = null;
    let events = [];
    let fetchError = null;

    for (const cand of (uniqueCandidates.length > 0 ? uniqueCandidates : [targetParcelNo])) {
      try {
        const res = await trackNocParcel(cand, targetPortalKey);
        if (res?.Response === 'success' && Array.isArray(res?.detail) && res.detail.length > 0) {
          trackingResult = res;
          break;
        } else if (res?.Response === 'failure' && !fetchError) {
          fetchError = res.ErrorDescription;
        }
      } catch (err) {
        console.warn(`Error querying NOC tracking for ${cand}:`, err?.message);
        if (!fetchError) fetchError = err.message;
      }
    }

    if (trackingResult?.Response === 'success' && Array.isArray(trackingResult?.detail) && trackingResult.detail.length > 0) {
      events = trackingResult.detail
        .map((item) => {
          const rawTime = item.DateTime || item.dateTime || item.Date_Time || item.Date || '';
          const parsed = parseDateSafe(rawTime);
          return {
            status: item.PacelStatus || item.ParcelStatus || item.Status || 'Status Update',
            remarks: item.Remarks || '',
            dateTime: rawTime,
            timestamp: parsed ? parsed.getTime() : 0,
          };
        })
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // If order.nocStatus is INTRANSIT or advanced and not yet present in detail events, prepend it
      if (order?.nocStatus && !order.nocStatus.match(/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
        const hasMatchingEvent = events.some(e => e.status.toUpperCase() === order.nocStatus.toUpperCase());
        if (!hasMatchingEvent) {
          events.unshift({
            status: order.nocStatus,
            remarks: order.nocRemarks || `Status updated by ${order.courierName || 'NOC Courier'}`,
            dateTime: order.nocStatusTime || '',
            timestamp: parseDateSafe(order.nocStatusTime)?.getTime() || Date.now(),
          });
        }
      }
    }

    // If courier API returns no detailed events (e.g. NOC Tracking Disabled on old parcel), build timeline from genuinely recorded NOC events
    if (events.length === 0 && order) {
      const realEvents = [];
      const cName = order.courierName || 'Leopard';

      // 1. Include any previously recorded NOC events in DB
      if (Array.isArray(order.nocTrackingEvents) && order.nocTrackingEvents.length > 0) {
        order.nocTrackingEvents.forEach((ev) => {
          realEvents.push({
            status: ev.status,
            remarks: ev.remarks || '',
            dateTime: ev.dateTime,
            timestamp: ev.timestamp || parseDateSafe(ev.dateTime)?.getTime() || 0,
          });
        });
      }

      // 2. Include current NOC status if not already present in realEvents
      if (order.nocStatus && !order.nocStatus.match(/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
        const alreadyHas = realEvents.some(
          (e) => e.status.toUpperCase() === order.nocStatus.toUpperCase()
        );
        if (!alreadyHas) {
          realEvents.push({
            status: order.nocStatus,
            remarks: order.nocRemarks || `Status updated by ${cName}`,
            dateTime: order.nocStatusTime || '',
            timestamp: parseDateSafe(order.nocStatusTime)?.getTime() || Date.now(),
          });
        }
      }

      // 3. Genuine Parcel Booked milestone
      if (order.courierBookingDate || order.trackingNumber || order.nocParcelNo) {
        realEvents.push({
          status: 'Parcel Booked',
          remarks: `Booked with ${cName}${order.nocThirdPartyNo ? ` (CN: ${order.nocThirdPartyNo})` : ''}`,
          dateTime: order.courierBookingDate || order.createdAt,
          timestamp: parseDateSafe(order.courierBookingDate || order.createdAt)?.getTime() || 0,
        });
      }

      // 4. Genuine Order Placed milestone
      realEvents.push({
        status: 'Order Placed',
        remarks: 'Order received & confirmed',
        dateTime: order.createdAt,
        timestamp: parseDateSafe(order.createdAt)?.getTime() || 0,
      });

      // Deduplicate by status name and sort strictly descending by real timestamp
      const seen = new Set();
      events = realEvents
        .filter((e) => {
          const key = e.status.toUpperCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    const has3rdParty = order?.nocThirdPartyNo && String(order.nocThirdPartyNo).trim() !== '' && String(order.nocThirdPartyNo).trim().toUpperCase() !== 'N/A' && String(order.nocThirdPartyNo).trim().toUpperCase() !== 'NA';
    const effectiveTrackingNumber = has3rdParty ? String(order.nocThirdPartyNo).trim() : (order?.nocParcelNo || targetParcelNo);
    const effectiveCourierName = order?.courierName || 'NOC';

    return NextResponse.json({
      success: true,
      orderId: order?.orderId || null,
      courierName: effectiveCourierName,
      trackingNumber: effectiveTrackingNumber,
      parcelNo: order?.nocParcelNo || targetParcelNo,
      thirdPartyNo: has3rdParty ? String(order.nocThirdPartyNo).trim() : '',
      nocLabelUrl: order?.nocLabelUrl || '',
      orderStatus: order?.status || 'Shipped',
      nocStatus: order?.nocStatus || '',
      nocStatusTime: order?.nocStatusTime || '',
      orderType: order?.orderType || (order?.isDraft ? 'Admin' : 'Online'),
      sourceTag: order?.sourceTag || '',
      customerCity: order?.customerCity || '',
      fetchError,
      events,
      rawResponse: trackingResult,
    });
  } catch (error) {
    if (error?.digest?.startsWith('NEXT_')) {
      throw error;
    }
    console.error('Error in courier track API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error tracking courier parcel' },
      { status: 500 }
    );
  }
}
