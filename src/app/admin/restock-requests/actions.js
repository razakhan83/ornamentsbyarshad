'use server';

import { requireMutationAccess } from '@/lib/requireAdmin';
import mongooseConnect from '@/lib/mongooseConnect';
import StockRequest from '@/models/StockRequest';
import { revalidatePath } from 'next/cache';

export async function updateStockRequestStatus(requestId, newStatus) {
  try {
    await requireMutationAccess();

    await mongooseConnect();
    const updated = await StockRequest.findByIdAndUpdate(
      requestId,
      { status: newStatus },
      { new: true }
    );

    if (!updated) {
      return { success: false, message: 'Request not found' };
    }

    revalidatePath('/admin/restock-requests');
    return { success: true };
  } catch (error) {
    console.error('Failed to update stock request status:', error);
    return { success: false, message: error.message };
  }
}
