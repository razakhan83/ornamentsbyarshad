const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ornamentsbyarshad.com';

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    url.pathname = url.pathname.replace(/\/$/, '');
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function isLocalhostUrl(value) {
  return /localhost|127\.0\.0\.1/i.test(String(value || ''));
}

function normalizeRequestOrigin(value) {
  const normalized = normalizeUrl(value);
  return normalized || '';
}

export function getSiteUrlFromHeaders(headersList) {
  const forwardedProto = headersList?.get?.('x-forwarded-proto') || 'https';
  const forwardedHost = headersList?.get?.('x-forwarded-host');
  const host = forwardedHost || headersList?.get?.('host');
  const requestOrigin = host ? `${forwardedProto}://${host}` : '';
  const normalizedRequestOrigin = normalizeRequestOrigin(requestOrigin);

  if (normalizedRequestOrigin) {
    return normalizedRequestOrigin;
  }

  return getSiteUrl();
}

export function getSiteUrl() {
  const explicitCandidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.SITE_URL,
    process.env.NEXTAUTH_URL,
  ];

  for (const candidate of explicitCandidates) {
    const normalized = normalizeUrl(candidate);
    if (!normalized) continue;

    if (process.env.NODE_ENV === 'production' && isLocalhostUrl(normalized)) {
      continue;
    }

    // Ignore vercel.app if someone inadvertently set it in NEXTAUTH_URL
    if (process.env.NODE_ENV === 'production' && /\.vercel\.app/i.test(normalized)) {
      continue;
    }

    return normalized;
  }

  // Official custom domain is the definitive primary origin
  return DEFAULT_SITE_URL;
}

export function getMetadataBase() {
  return new URL(getSiteUrl());
}
