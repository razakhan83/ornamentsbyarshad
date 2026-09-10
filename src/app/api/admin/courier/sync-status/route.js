import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import mongoose from 'mongoose';
import mongooseConnect from '@/lib/mongooseConnect';
import Order from '@/models/Order';
import { trackNocParcel, fetchNocPortalDashboard } from '@/lib/nocCourier';
import { mapNocStatusToStoreLifecycle } from '@/lib/order-status';
import { parseDateSafe } from '@/lib/timeAgo';
import { requireApiAdmin } from '@/lib/requireAdmin';

function findLatestNocEvent(details) {
  if (!Array.isArray(details) || details.length === 0) return null;
  if (details.length === 1) return details[0];

  let latest = details[0];
  let maxTime = parseDateSafe(latest.DateTime || latest.dateTime || latest.Date_Time || latest.Date)?.getTime() || 0;

  for (let i = 1; i < details.length; i++) {
    const item = details[i];
    const parsed = parseDateSafe(item.DateTime || item.dateTime || item.Date_Time || item.Date);
    const itemTime = parsed ? parsed.getTime() : 0;
    if (itemTime > maxTime || (itemTime === maxTime && itemTime > 0)) {
      maxTime = itemTime;
      latest = item;
    } else if (maxTime === 0 && itemTime === 0) {
      latest = item;
    }
  }
  return latest;
}

export async function POST(request) {
  const auth = await requireApiAdmin({ mutation: true });
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { orderIds } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide at least one order ID to sync.' },
        { status: 400 }
      );
    }

    await mongooseConnect();

    const validObjectIds = orderIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id) && id.length === 24)
      .map((id) => new mongoose.Types.ObjectId(id));
    const orderIdStrings = orderIds.map(String);

    const orConditions = [{ orderId: { $in: orderIdStrings } }];
    if (validObjectIds.length > 0) {
      orConditions.push({ _id: { $in: validObjectIds } });
    }

    const orders = await Order.find({
      $or: orConditions,
      isDeleted: { $ne: true },
    });

    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No matching orders found.' },
        { status: 404 }
      );
    }

    // Fetch live portal dashboard in parallel for all relevant portal keys
    const portalKeys = [...new Set(orders.map((o) => o.nocAccountId || 'portal_1'))];
    const portalRowsMap = new Map();

    await Promise.all(
      portalKeys.map(async (pKey) => {
        try {
          const rows = await fetchNocPortalDashboard(pKey);
          for (const r of rows) {
            if (r.parcelNo) {
              portalRowsMap.set(r.parcelNo, r);
            }
          }
        } catch (err) {
          console.warn(`[Sync Status] Portal dashboard fetch failed for ${pKey}:`, err?.message);
        }
      })
    );

    const now = new Date();

    // Process all orders concurrently in parallel
    const results = await Promise.all(
      orders.map(async (order) => {
        let trackingNumber = (order.nocParcelNo || order.trackingNumber || order.nocThirdPartyNo || '').trim();
        const portalKey = order.nocAccountId || 'portal_1';

        // Auto-match from live portal dashboard if order has tracking or by consignee name & city if unlinked
        let portalInfo = trackingNumber
          ? (portalRowsMap.get(trackingNumber) || portalRowsMap.get(order.nocParcelNo) || portalRowsMap.get(order.trackingNumber))
          : null;

        if (!portalInfo && (!trackingNumber || trackingNumber === '')) {
          const cName = String(order.customerName || '').trim().toLowerCase();
          const cCity = String(order.customerCity || '').trim().toLowerCase();
          
          if (cName) {
            for (const [, r] of portalRowsMap) {
              const rName = String(r.consignee || '').trim().toLowerCase();
              const rCity = String(r.city || '').trim().toLowerCase();
              if (rName && (rName.includes(cName) || cName.includes(rName))) {
                if (!cCity || !rCity || rCity.includes(cCity) || cCity.includes(rCity)) {
                  portalInfo = r;
                  break;
                }
              }
            }
          }
        }

        if (portalInfo) {
          if (portalInfo.courier) order.courierName = portalInfo.courier;
          if (portalInfo.thirdPartyNo) order.nocThirdPartyNo = portalInfo.thirdPartyNo;
          if (portalInfo.parcelNo) {
            order.nocParcelNo = portalInfo.parcelNo;
            trackingNumber = portalInfo.parcelNo;
          }
          if (order.isDraft) order.isDraft = false;
          if (['Draft', 'Pending', 'Order Confirmed', 'Packed'].includes(order.status)) {
            order.status = 'Shipped';
          }
        }

        if (!trackingNumber) {
          return {
            orderId: order.orderId,
            _id: String(order._id),
            success: false,
            error: 'No tracking number found on NOC for this order.',
          };
        }

        try {
          let trackingData = await trackNocParcel(trackingNumber, portalKey);

          // If tracking via parcel number had no detail but 3rd party CN exists, try 3rd party CN
          if ((!trackingData?.detail || trackingData.detail.length === 0) && order.nocThirdPartyNo && order.nocThirdPartyNo !== trackingNumber) {
            const altData = await trackNocParcel(order.nocThirdPartyNo, portalKey);
            if (altData?.Response === 'success' && Array.isArray(altData?.detail) && altData.detail.length > 0) {
              trackingData = altData;
            }
          }

          if (trackingData?.Response === 'success' && Array.isArray(trackingData?.detail) && trackingData.detail.length > 0) {
            const latest = findLatestNocEvent(trackingData.detail) || trackingData.detail[0];
            let rawStatus = latest.PacelStatus || latest.ParcelStatus || latest.Status || 'Booked';
            let rawTime = latest.DateTime || latest.dateTime || latest.Date_Time || latest.Date || '';
            const remarks = latest.Remarks || '';

            // If portal dashboard has live advanced status (e.g. INTRANSIT, DELIVERED) while GetParcelTracking only returned initial pickup:
            if (portalInfo?.status && !portalInfo.status.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
              const portalUpper = portalInfo.status.toUpperCase();
              const rawUpper = (rawStatus || '').toUpperCase();
              if (
                (!rawStatus || rawUpper.includes('BOOK') || rawUpper.includes('RECEIVED AT OFFICE')) &&
                (portalUpper.includes('TRANSIT') || portalUpper.includes('OUT FOR') || portalUpper.includes('DELIVER') || portalUpper.includes('RETURN') || portalUpper.includes('RUNSHEET') || portalUpper.includes('DISPATCH'))
              ) {
                rawStatus = portalInfo.status;
                if (portalInfo.statusDate) {
                  rawTime = portalInfo.statusDate;
                }
              }
            }

            // Ensure rawStatus is never a date/time string
            if (rawStatus && rawStatus.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
              if (!rawTime) rawTime = rawStatus;
              rawStatus = portalInfo?.status && !portalInfo.status.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/) 
                ? portalInfo.status 
                : (order.nocStatus && !order.nocStatus.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/) ? order.nocStatus : 'Booked');
            }

            const rawCourierCandidate = 
              latest.CourierName || 
              latest.Courier || 
              latest.ThirdPartyCourier || 
              latest.Courier_Name || 
              latest['3rdPartyCourier'] ||
              portalInfo?.courier ||
              trackingData.CourierName || 
              trackingData.Courier || 
              order.courierName || 
              'NOC';

            const rawCourier = String(rawCourierCandidate || 'NOC').trim();

            const raw3rdParty = 
              latest.ThirdPartyNo || 
              latest.ThirdPartyNumber || 
              latest.ThirdPartyCN || 
              latest.TPNo || 
              latest.ThirdPartyTracking || 
              latest['3rdPartyNo'] || 
              latest.ReferenceNo || 
              portalInfo?.thirdPartyNo ||
              trackingData.ThirdPartyNo || 
              '';

            const rawParcelNo = latest.ParcelNo || portalInfo?.parcelNo || trackingData.ParcelNo || order.nocParcelNo || trackingNumber;
            
            const is3rdPartyValid = 
              raw3rdParty && 
              String(raw3rdParty).trim() !== '' && 
              String(raw3rdParty).trim().toUpperCase() !== 'N/A' && 
              String(raw3rdParty).trim().toUpperCase() !== 'NA' && 
              String(raw3rdParty).trim().toLowerCase() !== 'null' && 
              String(raw3rdParty).trim().toLowerCase() !== 'undefined';

            const finalThirdPartyNo = is3rdPartyValid ? String(raw3rdParty).trim() : (order.nocThirdPartyNo || '');
            const finalParcelNo = String(rawParcelNo || trackingNumber).trim();
            const effectiveTrackingNumber = is3rdPartyValid ? finalThirdPartyNo : finalParcelNo;

            // Automatically resolve store lifecycle & payment status from live NOC tracking
            const lifecycleUpdate = mapNocStatusToStoreLifecycle(rawStatus);

            let newStoreStatus = order.status;
            let newPaymentStatus = order.paymentStatus;

            if (lifecycleUpdate) {
              if (lifecycleUpdate.status && order.status !== 'Completed') {
                newStoreStatus = lifecycleUpdate.status;
              }
              if (lifecycleUpdate.paymentStatus) {
                newPaymentStatus = lifecycleUpdate.paymentStatus;
              }
            }

            const hasChanged =
              order.nocStatus !== rawStatus ||
              order.nocStatusTime !== rawTime ||
              order.courierName !== rawCourier ||
              order.nocParcelNo !== finalParcelNo ||
              order.nocThirdPartyNo !== finalThirdPartyNo ||
              order.status !== newStoreStatus ||
              order.paymentStatus !== newPaymentStatus;

            if (order.status !== newStoreStatus) {
              if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
              order.statusHistory.push({ status: newStoreStatus, timestamp: now });
            }

            // Record tracking events from NOC detail
            if (Array.isArray(trackingData?.detail) && trackingData.detail.length > 0) {
              const mappedEvents = trackingData.detail.map((d) => {
                const dTime = d.DateTime || d.dateTime || d.Date_Time || d.Date || '';
                return {
                  status: d.PacelStatus || d.ParcelStatus || d.Status || 'Status Update',
                  remarks: d.Remarks || '',
                  dateTime: dTime,
                  timestamp: parseDateSafe(dTime)?.getTime() || 0,
                };
              });
              order.nocTrackingEvents = mappedEvents;
            } else if (rawStatus) {
              if (!Array.isArray(order.nocTrackingEvents)) order.nocTrackingEvents = [];
              const eventTimestamp = parseDateSafe(rawTime)?.getTime() || Date.now();
              const exists = order.nocTrackingEvents.some((e) => e.status.toUpperCase() === rawStatus.toUpperCase());
              if (!exists) {
                order.nocTrackingEvents.push({
                  status: rawStatus,
                  remarks: remarks || '',
                  dateTime: rawTime,
                  timestamp: eventTimestamp,
                });
              }
            }

            // Determine genuine status time: Never overwrite an existing status milestone with a newer dashboard time
            let effectiveStatusTime = rawTime;
            const matchingExistingEvent = Array.isArray(order.nocTrackingEvents)
              ? order.nocTrackingEvents.find((e) => (e.status || '').trim().toUpperCase() === (rawStatus || '').trim().toUpperCase())
              : null;

            if (matchingExistingEvent?.dateTime) {
              effectiveStatusTime = matchingExistingEvent.dateTime;
            } else if (order.nocStatus && order.nocStatus.toUpperCase() === (rawStatus || '').toUpperCase() && order.nocStatusTime) {
              effectiveStatusTime = order.nocStatusTime;
            }

            order.nocStatus = rawStatus;
            order.nocStatusTime = effectiveStatusTime;
            order.courierName = rawCourier;
            order.nocParcelNo = finalParcelNo;
            order.nocThirdPartyNo = finalThirdPartyNo;
            order.nocRemarks = remarks;
            order.nocLastTrackedAt = now;
            order.status = newStoreStatus;
            order.paymentStatus = newPaymentStatus;

            await order.save();

            return {
              orderId: order.orderId,
              _id: String(order._id),
              success: true,
              changed: hasChanged,
              nocStatus: rawStatus,
              nocStatusTime: effectiveStatusTime,
              courierName: rawCourier,
              nocParcelNo: finalParcelNo,
              nocThirdPartyNo: finalThirdPartyNo,
              effectiveTrackingNumber,
              nocRemarks: remarks,
              nocLastTrackedAt: now,
              nocTrackingEvents: order.nocTrackingEvents || [],
            };
          } else if (portalInfo?.status && !portalInfo.status.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
            // Dashboard row fallback when GetParcelTracking returned no detail array
            const rawStatus = portalInfo.status;
            let rawTime = portalInfo.statusDate || order.nocStatusTime || '';
            const rawCourier = portalInfo.courier || order.courierName || 'NOC';
            const finalThirdPartyNo = portalInfo.thirdPartyNo || order.nocThirdPartyNo || '';
            const finalParcelNo = portalInfo.parcelNo || order.nocParcelNo || trackingNumber;
            const effectiveTrackingNumber = finalThirdPartyNo || finalParcelNo;

            const lifecycleUpdate = mapNocStatusToStoreLifecycle(rawStatus);
            let newStoreStatus = order.status;
            let newPaymentStatus = order.paymentStatus;

            if (lifecycleUpdate) {
              if (lifecycleUpdate.status && order.status !== 'Completed') {
                newStoreStatus = lifecycleUpdate.status;
              }
              if (lifecycleUpdate.paymentStatus) {
                newPaymentStatus = lifecycleUpdate.paymentStatus;
              }
            }

            // Determine genuine status time: Never overwrite an existing status milestone with a newer dashboard time
            let effectiveStatusTime = rawTime;
            const matchingExistingEvent = Array.isArray(order.nocTrackingEvents)
              ? order.nocTrackingEvents.find((e) => (e.status || '').trim().toUpperCase() === (rawStatus || '').trim().toUpperCase())
              : null;

            if (matchingExistingEvent?.dateTime) {
              effectiveStatusTime = matchingExistingEvent.dateTime;
            } else if (order.nocStatus && order.nocStatus.toUpperCase() === (rawStatus || '').toUpperCase() && order.nocStatusTime) {
              effectiveStatusTime = order.nocStatusTime;
            }

            if (!Array.isArray(order.nocTrackingEvents)) order.nocTrackingEvents = [];
            const exists = order.nocTrackingEvents.some((e) => (e.status || '').toUpperCase() === rawStatus.toUpperCase());
            if (!exists) {
              order.nocTrackingEvents.push({
                status: rawStatus,
                remarks: 'Status updated from NOC Courier Portal',
                dateTime: effectiveStatusTime || rawTime,
                timestamp: parseDateSafe(effectiveStatusTime || rawTime)?.getTime() || Date.now(),
              });
            }

            const hasChanged =
              order.nocStatus !== rawStatus ||
              order.nocStatusTime !== effectiveStatusTime ||
              order.courierName !== rawCourier ||
              order.nocParcelNo !== finalParcelNo ||
              order.nocThirdPartyNo !== finalThirdPartyNo ||
              order.status !== newStoreStatus ||
              order.paymentStatus !== newPaymentStatus;

            if (order.status !== newStoreStatus) {
              if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
              order.statusHistory.push({ status: newStoreStatus, timestamp: now });
            }

            order.nocStatus = rawStatus;
            order.nocStatusTime = effectiveStatusTime;
            order.courierName = rawCourier;
            order.nocParcelNo = finalParcelNo;
            order.nocThirdPartyNo = finalThirdPartyNo;
            order.nocLastTrackedAt = now;
            order.status = newStoreStatus;
            order.paymentStatus = newPaymentStatus;

            await order.save();

            return {
              orderId: order.orderId,
              _id: String(order._id),
              success: true,
              changed: hasChanged,
              nocStatus: rawStatus,
              nocStatusTime: effectiveStatusTime,
              courierName: rawCourier,
              nocParcelNo: finalParcelNo,
              nocThirdPartyNo: finalThirdPartyNo,
              effectiveTrackingNumber,
              nocLastTrackedAt: now,
              nocTrackingEvents: order.nocTrackingEvents || [],
            };
          }

          // Fallback if no timeline details yet
          await order.save();
          return {
            orderId: order.orderId,
            _id: String(order._id),
            success: true,
            changed: false,
            nocStatus: order.nocStatus || 'Booked',
            courierName: order.courierName || 'NOC',
            nocParcelNo: order.nocParcelNo || trackingNumber,
            nocThirdPartyNo: order.nocThirdPartyNo || '',
            nocLastTrackedAt: now,
          };
        } catch (itemErr) {
          console.error(`[Sync Status] Tracking failed for ${order.orderId}:`, itemErr);
          return {
            orderId: order.orderId,
            _id: String(order._id),
            success: false,
            changed: false,
            error: itemErr.message || 'Failed to track parcel',
          };
        }
      })
    );

    const successfulCount = results.filter((r) => r.success).length;
    const changedCount = results.filter((r) => r.changed).length;

    if (changedCount > 0) {
      try {
        revalidateTag('orders');
        revalidateTag('admin-dashboard');
        revalidatePath('/admin/orders');
      } catch (revErr) {
        console.error('Error revalidating orders cache after NOC sync:', revErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${successfulCount} of ${orders.length} order(s) with NOC Courier.`,
      successfulCount,
      changedCount,
      results,
    });
  } catch (error) {
    if (error?.digest?.startsWith('NEXT_') || error?.digest === 'HANGING_PROMISE_REJECTION') {
      throw error;
    }
    console.error('Error syncing NOC courier status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error syncing courier status' },
      { status: 500 }
    );
  }
}
