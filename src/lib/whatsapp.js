import { normalizePhone } from '@/lib/admin';

export function normalizeWhatsappNumber(value) {
  return normalizePhone(value || '');
}

export function createWhatsAppUrl(number, message = '') {
  const normalizedNumber = normalizeWhatsappNumber(number);
  if (!normalizedNumber) return '';

  const text = String(message || '').trim();
  return text
    ? `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${normalizedNumber}`;
}

export function buildProductWhatsAppMessage({ productName, productUrl, storeName = 'Ornaments by Arshad', color = '', size = '', metal = '' }) {
  const lines = [
    `Hi ${storeName}, I'm interested in ${productName || 'this piece'}.`,
  ];

  if (color) {
    lines.push(`• Selected Color: ${color}`);
  }
  if (size) {
    lines.push(`• Selected Size: ${size}`);
  }
  if (metal) {
    lines.push(`• Metal: ${metal}`);
  }

  if (productUrl) {
    lines.push(productUrl);
  }

  return lines.join('\n');
}

export function buildCartWhatsAppMessage({ items = [], subtotal = 0, storeName = 'Ornaments by Arshad' }) {
  const lines = [`*New Order Inquiry from ${storeName}*`, '', '*Items*'];

  items.forEach((item, index) => {
    const name = item?.Name || item?.name || 'Item';
    const quantity = Math.max(1, Number(item?.quantity || 1));
    const price = Number(item?.Price ?? item?.price ?? 0);
    lines.push(`${index + 1}. ${name} - ${quantity} x Rs. ${price.toLocaleString('en-PK')}`);
  });

  lines.push('', `*Subtotal:* Rs. ${Number(subtotal || 0).toLocaleString('en-PK')}`);
  lines.push('Please confirm availability for these items.');

  return lines.join('\n');
}
