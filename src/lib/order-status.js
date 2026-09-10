export const ORDER_STATUSES = [
  'Order Confirmed',
  'In Process',
  'Packed',
  'Shipped',
  'Out For Delivery',
  'Delivered',
  'Returned',
];

export const DEFAULT_ORDER_STATUS = 'Order Confirmed';
export const DEFAULT_ADMIN_FILTER_STATUS = 'all';

export const LEGACY_ORDER_STATUS_MAP = {
  Pending: 'Order Confirmed',
  Confirmed: 'Order Confirmed',
  Sourcing: 'In Process',
  Packed: 'Packed',
  'Out for Delivery': 'Out For Delivery',
  'Delivery Address Issue': 'Returned',
};

/**
 * Maps courier (NOC Express) tracking statuses directly to Store Order lifecycle & payment status
 */
export function mapNocStatusToStoreLifecycle(rawNocStatus) {
  const s = String(rawNocStatus || '').trim().toLowerCase();
  if (!s) return null;

  // 1. Payment Done / COD Remitted -> Delivered + Paid
  if (
    s.includes('payment') ||
    s.includes('paid') ||
    s.includes('remit') ||
    s.includes('cr done') ||
    s.includes('cash collect') ||
    s.includes('cheque')
  ) {
    return {
      status: 'Delivered',
      paymentStatus: 'Paid',
    };
  }

  // 2. Delivered -> Delivered (payment pending)
  if (
    s.includes('deliver') &&
    !s.includes('out for') &&
    !s.includes('under deliver') &&
    !s.includes('attempt') &&
    !s.includes('fail')
  ) {
    return {
      status: 'Delivered',
    };
  }

  // 3. Return / Refused / Cancelled / RTO -> Returned
  if (
    s.includes('return') ||
    s.includes('refus') ||
    s.includes('cancel') ||
    s.includes('rto') ||
    s.includes('rts') ||
    s.includes('damage') ||
    s.includes('reject') ||
    s.includes('undelivered - ret')
  ) {
    return {
      status: 'Returned',
    };
  }

  // 4. In Transit / Out For Delivery / Movement on route / Hub / Runsheet -> Out For Delivery
  if (
    s.includes('transit') ||
    s.includes('out for') ||
    s.includes('dispatch') ||
    s.includes('route') ||
    s.includes('runsheet') ||
    s.includes('rider') ||
    s.includes('destination') ||
    s.includes('arrived at') ||
    s.includes('under deliver') ||
    s.includes('hub')
  ) {
    return {
      status: 'Out For Delivery',
    };
  }

  // 5. Initial / Booking / Received at office -> Shipped
  if (
    s.includes('book') ||
    s.includes('received at') ||
    s.includes('manifest') ||
    s.includes('pickup')
  ) {
    return {
      status: 'Shipped',
    };
  }

  return null;
}

/**
 * Maps raw courier checkpoint to clean, customer-friendly status and description.
 * Decouples intermediate courier milestones (Hub, In Transit, Destination, Out for Delivery)
 * into distinct, user-friendly stages.
 * Fully case-insensitive, space-agnostic, and punctuation-proof (e.g. INTRANSIT, REACHEDATDESTINATION).
 */
export function mapCourierEventForCustomer(rawStatus, rawRemarks = '') {
  const s = String(rawStatus || '').trim().toLowerCase();
  const compact = s.replace(/[^a-z0-9]/g, '');
  const rem = String(rawRemarks || '').trim();

  // 1. Delivered
  if (
    compact.includes('payment') ||
    compact.includes('paid') ||
    compact.includes('remit') ||
    compact.includes('crdone') ||
    compact.includes('cashcollect') ||
    compact.includes('cheque') ||
    (compact.includes('deliver') &&
      !compact.includes('outfor') &&
      !compact.includes('attempt') &&
      !compact.includes('fail') &&
      !compact.includes('underdeliver') &&
      !compact.includes('undeliver'))
  ) {
    return {
      title: 'Delivered',
      description: 'Parcel has been successfully delivered.',
    };
  }

  // 2. Delivery Attempt Failed / Consignee unavailable / Rescheduled
  if (
    compact.includes('attempt') ||
    compact.includes('fail') ||
    compact.includes('undeliver') ||
    compact.includes('reschedule') ||
    compact.includes('unavailable') ||
    compact.includes('notavailable') ||
    compact.includes('notreach')
  ) {
    return {
      title: 'Delivery Rescheduled',
      description: 'Courier could not reach you; next attempt scheduled.',
    };
  }

  // 3. Returned / Refused / Cancelled / RTO
  if (
    compact.includes('return') ||
    compact.includes('refus') ||
    compact.includes('rto') ||
    compact.includes('rts') ||
    compact.includes('damage') ||
    compact.includes('reject') ||
    compact.includes('cancel')
  ) {
    return {
      title: 'Returned',
      description: 'Shipment returning to store.',
    };
  }

  // 4. Out For Delivery (with rider / on runsheet)
  if (
    compact.includes('outfordeliver') ||
    compact.includes('withrider') ||
    compact.includes('rider') ||
    compact.includes('runsheet') ||
    compact.includes('underdeliver') ||
    compact.includes('courierdeliver') ||
    (compact.includes('out') && compact.includes('deliver'))
  ) {
    return {
      title: 'Out for Delivery',
      description: 'Rider is on the way to deliver your parcel today.',
    };
  }

  // 5. REACHED AT DESTINATION (Arrived in Destination City / Local station)
  if (
    compact.includes('reachedatdestination') ||
    compact.includes('arrivedatdestination') ||
    compact.includes('arrivalatdestination') ||
    compact.includes('reacheddestination') ||
    compact.includes('arriveddestination') ||
    compact.includes('destinationhub') ||
    compact.includes('destinationoffice') ||
    compact.includes('destinationfacility') ||
    compact.includes('destinationstation') ||
    compact.includes('destinationcity') ||
    compact.includes('arrivedin') ||
    (compact.includes('destination') &&
      (compact.includes('reach') ||
        compact.includes('arriv') ||
        compact.includes('hub') ||
        compact.includes('station') ||
        compact.includes('office') ||
        compact.includes('facility') ||
        compact.includes('city') ||
        compact.includes('at')))
  ) {
    return {
      title: 'Arrived in Your City',
      description: 'Package has reached your local delivery station.',
    };
  }

  // 6. INTRANSIT / In Transit / On the Way
  if (
    compact.includes('intransit') ||
    compact.includes('transit') ||
    compact.includes('enroute') ||
    compact.includes('linehaul') ||
    compact.includes('ontheway') ||
    compact.includes('onroute') ||
    s.includes('in transit') ||
    s.includes('dispatched')
  ) {
    return {
      title: 'On the Way',
      description: 'Package is moving towards your destination city.',
    };
  }

  // 7. Received At Office / Processing at Hub
  if (
    compact.includes('receivedatoffice') ||
    compact.includes('receivedat') ||
    compact.includes('originhub') ||
    compact.includes('pickupdone') ||
    compact.includes('pickedup') ||
    compact.includes('facility') ||
    compact.includes('office') ||
    compact.includes('sorting') ||
    s.includes('received at')
  ) {
    return {
      title: 'Processing at Hub',
      description: 'Package received at origin sorting facility.',
    };
  }

  // 8. Parcel Booked / Order Shipped
  if (
    compact.includes('parcelbooked') ||
    compact.includes('booked') ||
    compact.includes('booking') ||
    compact.includes('manifest') ||
    (compact.includes('shipped') && !compact.includes('return')) ||
    compact.includes('ordershipped')
  ) {
    return {
      title: 'Order Shipped',
      description: 'Parcel has been handed over to courier partner.',
    };
  }

  // 9. Order Placed
  if (
    compact.includes('orderplaced') ||
    compact.includes('orderconfirmed') ||
    compact.includes('ordercreated') ||
    compact.includes('orderreceived') ||
    s.includes('order placed') ||
    s.includes('order confirmed')
  ) {
    return {
      title: 'Order Placed',
      description: 'Order received & confirmed.',
    };
  }

  return {
    title: rawStatus || 'Order Update',
    description: rem || 'Package is being processed by courier.',
  };
}

export function normalizeOrderStatus(status) {
  const rawStatus = String(status || '').trim();
  if (!rawStatus) return DEFAULT_ORDER_STATUS;
  if (rawStatus === 'all' || rawStatus === 'draft' || rawStatus === 'trash') return rawStatus;
  if (ORDER_STATUSES.includes(rawStatus)) return rawStatus;
  return LEGACY_ORDER_STATUS_MAP[rawStatus] || rawStatus;
}

export function isValidOrderStatus(status) {
  return ORDER_STATUSES.includes(normalizeOrderStatus(status));
}

export function getOrderStatusQueryValue(status) {
  const normalizedStatus = normalizeOrderStatus(status);

  switch (normalizedStatus) {
    case 'Order Confirmed':
      return { $in: ['Order Confirmed', 'Confirmed', 'Pending'] };
    case 'In Process':
      return { $in: ['In Process', 'Sourcing'] };
    case 'Packed':
      return { $in: ['Packed'] };
    case 'Out For Delivery':
      return { $in: ['Out For Delivery', 'Out for Delivery'] };
    case 'Returned':
      return { $in: ['Returned', 'Delivery Address Issue'] };
    default:
      return normalizedStatus;
  }
}

export function getOrderStatusSummaryCounts(statusCountMap) {
  const getCount = (keys) =>
    keys.reduce((total, key) => total + Number(statusCountMap.get(key) || 0), 0);

  const counts = {
    orderConfirmedCount: getCount(['Order Confirmed', 'Confirmed', 'Pending']),
    inProcessCount: getCount(['In Process', 'Sourcing']),
    packedCount: getCount(['Packed']),
    shippedCount: getCount(['Shipped']),
    outForDeliveryCount: getCount(['Out For Delivery', 'Out for Delivery']),
    deliveredCount: getCount(['Delivered']),
    returnedCount: getCount(['Returned', 'Delivery Address Issue']),
  };

  return {
    ...counts,
    allCount:
      counts.orderConfirmedCount +
      counts.inProcessCount +
      counts.packedCount +
      counts.shippedCount +
      counts.outForDeliveryCount +
      counts.deliveredCount +
      counts.returnedCount,
  };
}

export function getStatusBadgeClass(status, isDraft = false) {
  if (isDraft) {
    return 'border-slate-300 bg-slate-50 text-slate-700';
  }
  const normalizedStatus = normalizeOrderStatus(status).toLowerCase();

  if (normalizedStatus === 'order confirmed') {
    return 'border-sky-200 bg-sky-100 text-sky-800';
  }

  if (normalizedStatus === 'delivered') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-800';
  }

  if (
    normalizedStatus.includes('issue') ||
    normalizedStatus.includes('return')
  ) {
    return 'border-red-200 bg-red-100 text-red-800';
  }

  if (
    normalizedStatus === 'in process' ||
    normalizedStatus === 'packed' ||
    normalizedStatus === 'shipped' ||
    normalizedStatus === 'out for delivery'
  ) {
    return 'border-amber-200 bg-amber-100 text-amber-800';
  }

  return 'border-slate-200 bg-slate-100 text-slate-800';
}

export function getOrderOriginInfo(order) {
  const isAdmin = 
    order?.orderType === 'Admin' ||
    Boolean(order?.isDraft) ||
    Boolean(order?.sourceTag && String(order.sourceTag).trim() !== '') ||
    Boolean(order?.invoiceId || order?.invoiceNumber) ||
    (order?.manualCodAmount !== undefined && order?.manualCodAmount !== null && order?.manualCodAmount !== '') ||
    Boolean(order?.itemType && order?.itemType !== 'Mix');

  const isOnline = !isAdmin && (order?.orderType === 'Online' || !order?.orderType);
  const tag = order?.sourceTag || '';

  return {
    isOnline,
    isAdmin,
    label: isOnline ? 'Online (Website)' : (tag ? `Admin (${tag})` : 'Created by Admin'),
    shortLabel: isOnline ? 'Online' : (tag || 'Admin'),
    tooltip: isOnline 
      ? 'Online Order (Placed by customer on website)' 
      : `Created by Admin${tag ? ` • Channel: ${tag}` : ' (Manual / Draft)'}`,
    badgeClass: isOnline 
      ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300' 
      : 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
    iconClass: 'text-foreground shrink-0 select-none',
  };
}

