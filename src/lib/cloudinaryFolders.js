const CUSTOMER_FOLDERS = new Set(['ornaments_reviews', 'kifayatly_reviews']);

const ADMIN_FOLDERS = new Set([
  'ornaments_products',
  'ornaments_videos',
  'ornaments_homepage',
  'ornaments_homepage_videos',
  'ornaments_hero_videos',
  'ornaments_cover_videos',
  'ornaments_branding',
  'ornaments_categories',
  'ornaments_covers',
  'ornaments_social_og',
  'kifayatly_products',
  'kifayatly_videos',
  'kifayatly_homepage',
  'kifayatly_homepage_videos',
  'kifayatly_hero_videos',
  'kifayatly_cover_videos',
  'kifayatly_branding',
  'kifayatly_categories',
  'kifayatly_covers',
  'kifayatly_social_og',
]);

export function resolveCloudinaryFolder(rawFolder, session) {
  const folder = String(rawFolder || 'ornaments_products').trim();

  if (!/^[a-zA-Z0-9_-]+$/.test(folder)) {
    return { error: 'Invalid upload folder.', status: 400 };
  }

  if (CUSTOMER_FOLDERS.has(folder)) {
    if (!session?.user) {
      return { error: 'Unauthorized', status: 401 };
    }
    return { folder };
  }

  if (ADMIN_FOLDERS.has(folder)) {
    if (!session?.user?.isAdmin) {
      return { error: 'Unauthorized', status: 401 };
    }
    if (session.user?.isDemo) {
      return { error: 'Demo Mode: Actions are disabled. You have read-only access.', status: 403 };
    }
    return { folder };
  }

  return { error: 'Unauthorized', status: 401 };
}
