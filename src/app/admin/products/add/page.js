import { connection } from 'next/server';
import AddProductClient from './AddProductClient';
import { requireAdmin } from '@/lib/requireAdmin';

export default async function AddProductPage() {
  await connection();
  await requireAdmin();
  return (
    <div className="mx-auto w-full max-w-6xl">
      <AddProductClient />
    </div>
  );
}
