'use server';

import { requireMutationAccess } from '@/lib/requireAdmin';
import mongooseConnect from '@/lib/mongooseConnect';
import Settings from '@/models/Settings';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function toggleGuestModeAction(isEnabled) {
  await requireMutationAccess();
  await mongooseConnect();

  await Settings.findOneAndUpdate(
    { singletonKey: 'site-settings' },
    { $set: { guestModeEnabled: Boolean(isEnabled) } },
    { new: true, upsert: true }
  );

  revalidateTag('settings');
  revalidatePath('/admin/roles/access');
  revalidatePath('/admin/login');
  
  return { success: true };
}
