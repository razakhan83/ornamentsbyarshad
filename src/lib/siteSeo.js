export const SITE_NAME = 'Ornaments by Arshad';

export const SITE_TITLE_DEFAULT = 'Ornaments by Arshad | Timeless Luxury & Handcrafted Elegance';

export const SITE_DESCRIPTION =
  'Handcrafted luxury jewelry, 22K pure gold heirlooms, and bespoke bridal masterworks.';

const TITLE_SUFFIX_PATTERN = /\s*[|–—-]\s*Ornaments by Arshad\s*$/i;

export function metadataTitle(value = '') {
  return String(value || '')
    .replace(TITLE_SUFFIX_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function pageMetadata({ title, description } = {}) {
  const safeTitle = metadataTitle(title);
  const safeDescription = String(description || '').trim();

  return {
    title: safeTitle || SITE_TITLE_DEFAULT,
    description: safeDescription && safeDescription !== safeTitle ? safeDescription : SITE_DESCRIPTION,
  };
}
