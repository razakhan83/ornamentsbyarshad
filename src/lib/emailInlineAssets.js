import { EMAIL_INLINE_ASSETS } from '@/lib/emailInlineAssetsData';

export const EMAIL_CID = {
  logoLight: 'cu-logo-light',
  logoDark: 'cu-logo-dark',
  facebook: 'cu-facebook',
  instagram: 'cu-instagram',
  whatsapp: 'cu-whatsapp',
  globe: 'cu-globe',
  email: 'cu-email',
  phone: 'cu-phone',
  chat: 'cu-chat',
  zigzagWhite: 'cu-zigzag-white',
  zigzagGreen: 'cu-zigzag-green',
};

export function cidSrc(id) {
  return `cid:${id}`;
}

export function collectEmailContentIds(html) {
  const matches = String(html || '').match(/cid:([a-z0-9-]+)/gi) || [];
  return [...new Set(matches.map((match) => match.slice(4).toLowerCase()))];
}

export function getEmailInlineAttachments(htmlOrIds) {
  const ids = typeof htmlOrIds === 'string' ? collectEmailContentIds(htmlOrIds) : htmlOrIds;
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const allowed = new Set(ids);
  return Object.entries(EMAIL_INLINE_ASSETS)
    .filter(([contentId]) => allowed.has(contentId))
    .map(([contentId, asset]) => ({
      filename: asset.filename,
      content: asset.content,
      contentId,
      contentType: 'image/png',
      contentDisposition: 'inline',
    }));
}
