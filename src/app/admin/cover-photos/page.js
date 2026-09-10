import { getAdminCoverPhotos } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';

import CoverPhotosClient from './CoverPhotosClient';

export default async function AdminCoverPhotosPage() {
  await requireAdmin();

  return <CoverPhotosContent />;
}

async function CoverPhotosContent() {
  const coverPhotos = await getAdminCoverPhotos();
  return <CoverPhotosClient initialSlides={coverPhotos} />;
}
