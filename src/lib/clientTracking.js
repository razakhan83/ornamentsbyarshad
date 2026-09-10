'use client';

function getEventSourceUrl() {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}

function createEventId(fallbackSeed = 'event') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${fallbackSeed}-${Date.now()}`;
}

export function postMetaEvent(payload) {
  if (typeof window === 'undefined') return;

  fetch('/api/tracking/meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch((error) => {
    console.error('Meta CAPI request failed:', error);
  });
}

export function trackPageViewEvent() {
  const eventId = createEventId('pageview');

  const fireClientEvent = () => {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView', {}, { eventID: eventId });
    }
  };

  if (typeof window !== 'undefined') {
    if (typeof window.fbq === 'function') {
      fireClientEvent();
    } else {
      // Retry for up to 2 seconds if fbq isn't initialized yet
      let retries = 0;
      const interval = setInterval(() => {
        retries++;
        if (typeof window.fbq === 'function') {
          fireClientEvent();
          clearInterval(interval);
        } else if (retries >= 20) {
          clearInterval(interval);
        }
      }, 100);
    }
  }

  postMetaEvent({
    eventName: 'PageView',
    eventId,
    eventSourceUrl: getEventSourceUrl(),
  });
}

export function trackViewContentEvent({
  productId,
  name,
  category,
  value,
}) {
  const safeProductId = String(productId || '').trim();
  if (!safeProductId) return;

  const eventId = createEventId(`viewcontent-${safeProductId}`);
  const customData = {
    content_ids: [safeProductId],
    content_name: name || 'Product',
    content_category: category || '',
    content_type: 'product',
    value: Number(value || 0),
    currency: 'PKR',
  };

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'ViewContent', customData, { eventID: eventId });
  }

  postMetaEvent({
    eventName: 'ViewContent',
    eventId,
    eventSourceUrl: getEventSourceUrl(),
    customData,
  });
}

export function trackAddToCartEvent({
  productId,
  name,
  category,
  value,
  quantity = 1,
}) {
  const safeProductId = String(productId || '').trim();
  const safeQuantity = Math.max(1, Number(quantity || 1));
  if (!safeProductId) return;

  const eventId = createEventId(`addtocart-${safeProductId}`);
  const customData = {
    content_ids: [safeProductId],
    content_name: name || 'Product',
    content_category: category || '',
    content_type: 'product',
    contents: [
      {
        id: safeProductId,
        quantity: safeQuantity,
        item_price: Number(value || 0),
      },
    ],
    value: Number(value || 0) * safeQuantity,
    currency: 'PKR',
  };

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'AddToCart', customData, { eventID: eventId });
  }

  postMetaEvent({
    eventName: 'AddToCart',
    eventId,
    eventSourceUrl: getEventSourceUrl(),
    customData,
  });
}

export function trackSearchEvent({ searchString }) {
  const term = String(searchString || '').trim();
  if (!term) return;

  const eventId = createEventId('search');
  const customData = { search_string: term };

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Search', customData, { eventID: eventId });
  }

  postMetaEvent({
    eventName: 'Search',
    eventId,
    eventSourceUrl: getEventSourceUrl(),
    customData,
  });
}

export function trackInitiateCheckoutEvent({ cart = [], total = 0 }) {
  const contentIds = cart
    .map((item) => String(item?.id || item?._id || item?.slug || '').trim())
    .filter(Boolean);

  const eventId = createEventId('initiate-checkout');
  const customData = {
    currency: 'PKR',
    value: Number(total || 0),
    content_type: 'product',
    content_ids: contentIds,
  };

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'InitiateCheckout', customData, { eventID: eventId });
  }

  postMetaEvent({
    eventName: 'InitiateCheckout',
    eventId,
    eventSourceUrl: getEventSourceUrl(),
    customData,
  });
}

export function trackPurchaseEvent({ orderId, cart = [], total = 0 }) {
  const contentIds = cart
    .map((item) => String(item?.id || item?._id || item?.slug || '').trim())
    .filter(Boolean);
  const eventId = String(orderId || createEventId('purchase')).trim();

  const customData = {
    currency: 'PKR',
    value: Number(total || 0),
    content_type: 'product',
    content_ids: contentIds,
  };

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Purchase', customData, { eventID: eventId });
  }

  postMetaEvent({
    eventName: 'Purchase',
    eventId,
    eventSourceUrl: getEventSourceUrl(),
    customData,
  });
}
