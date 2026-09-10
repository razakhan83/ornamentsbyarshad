import { NextResponse } from 'next/server';
import { requireApiAdmin } from '@/lib/requireAdmin';
import mongooseConnect from '@/lib/mongooseConnect';
import Product from '@/models/Product';
import { revalidateTag } from 'next/cache';

export async function PATCH(req) {
    try {
        const auth = await requireApiAdmin({ mutation: true });
        if (auth.error) return auth.error;

        const body = await req.json();
        const { action, productIds } = body;

        if (!action || !['live', 'hidden', 'in-stock', 'out-of-stock', 'delete'].includes(action)) {
            return NextResponse.json({ success: false, message: 'Invalid action provided.' }, { status: 400 });
        }

        await mongooseConnect();

        const filter = Array.isArray(productIds) && productIds.length > 0
            ? { _id: { $in: productIds } }
            : {};

        if (action === 'delete') {
            const result = await Product.deleteMany(filter);
            revalidateTag('products');
            revalidateTag('admin-dashboard');
            return NextResponse.json({
                success: true,
                message: `Successfully deleted ${result.deletedCount} product(s).`,
            });
        }

        let update = {};
        if (action === 'live') update = { showOnStore: true };
        else if (action === 'hidden') update = { showOnStore: false };
        else if (action === 'in-stock') update = { StockStatus: 'In Stock' };
        else if (action === 'out-of-stock') update = { StockStatus: 'Out of Stock' };

        const result = await Product.updateMany(filter, { $set: update });

        revalidateTag('products');
        revalidateTag('admin-dashboard');
        revalidateTag('home-sections');

        return NextResponse.json({
            success: true,
            message: `Successfully updated ${result.modifiedCount} product(s).`,
        });

    } catch (error) {
        console.error('[API] Bulk Action Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
