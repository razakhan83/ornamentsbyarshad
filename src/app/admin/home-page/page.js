import { getAdminHomePageBuilderData } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';
import HomePageBuilderWrapper from './HomePageBuilderWrapper';

export default async function AdminHomePageBuilderPage() {
  await requireAdmin();

  const data = await getAdminHomePageBuilderData();

  return (
    <HomePageBuilderWrapper
      initialSections={data.sections}
      availableCategories={data.categories}
    />
  );
}
