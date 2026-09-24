import { MessageSquare } from 'lucide-react';
import { requireAdmin } from '@/lib/requireAdmin';

export default async function WhatsAppSettingsPage() {
  await requireAdmin();
  
  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">WhatsApp Order Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure automated customer WhatsApp order confirmations, tracking alerts, and direct customer support.
        </p>
      </div>
      <div className="surface-card rounded-sm p-8 flex flex-col items-center justify-center min-h-[360px] border border-dashed border-border text-center">
        <div className="mb-6 flex items-center justify-center p-6 bg-primary/5 rounded-full ring-8 ring-primary/5">
          <MessageSquare className="size-16 text-primary opacity-80" strokeWidth={1.5} />
        </div>
        <div className="text-center max-w-sm">
          <p className="font-semibold text-base text-foreground">Direct WhatsApp Chat Active</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Storefront WhatsApp chat and floating buttons are active using your configured business number. Automated WhatsApp Business API integration will be manageable here.
          </p>
        </div>
      </div>
    </div>
  );
}
