import { requireAdmin } from '@/lib/requireAdmin';

import AdminCategoriesClient from './AdminCategoriesClient';

export default async function AdminCategoriesPage() {
  await requireAdmin();

  return <AdminCategoriesClient />;
}
