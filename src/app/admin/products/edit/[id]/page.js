import { connection } from 'next/server';
import EditProductClient from './EditProductClient';
import { requireAdmin } from '@/lib/requireAdmin';

export default async function Page({ params }) {
    await connection();
    await requireAdmin();
    const { id } = await params;
    return (
        <div className="mx-auto w-full max-w-6xl">
            <EditProductClient id={id} />
        </div>
    );
}
