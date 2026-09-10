import Image from 'next/image';
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
      <div className="surface-card rounded-2xl p-8 flex flex-col items-center justify-center min-h-[360px] border border-dashed border-border text-center">
        <div className="mb-6 flex items-center justify-center">
          <Image
            src="/undraw_online-chat_qx4x.svg"
            alt="WhatsApp Chat Support Illustration"
            width={200}
            height={160}
            className="h-auto w-[180px] sm:w-[220px] object-contain select-none opacity-95"
            priority
          />
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
