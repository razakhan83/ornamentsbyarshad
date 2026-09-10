export function normalizeSocialUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';

  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  return `https://${input.replace(/^\/+/, '')}`;
}
