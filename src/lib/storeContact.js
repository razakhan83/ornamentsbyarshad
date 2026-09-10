export const DEFAULT_STORE_PHONE = '03228252592';

export function resolveStorePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return String(value).trim();
  }
  return DEFAULT_STORE_PHONE;
}

export function formatStorePhone(value = '') {
  const digits = String(resolveStorePhone(value)).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('03')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)}${digits.slice(7)}`;
  }
  if (digits.length === 12 && digits.startsWith('92')) {
    return `0${digits.slice(2, 5)} ${digits.slice(5, 8)}${digits.slice(8)}`;
  }
  return resolveStorePhone(value);
}

export function storePhoneTelHref(value = '') {
  const digits = String(resolveStorePhone(value)).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return `tel:+92${digits.slice(1)}`;
  }
  if (digits.startsWith('92')) {
    return `tel:+${digits}`;
  }
  return `tel:${digits}`;
}
