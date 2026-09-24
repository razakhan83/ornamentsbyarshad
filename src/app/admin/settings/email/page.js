import { Mail } from 'lucide-react';
import { requireAdmin } from '@/lib/requireAdmin';

export default async function EmailSettingsPage() {
  await requireAdmin();
  
  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Email Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage order confirmation, invoice delivery, and customer email alerts.
        </p>
      </div>
      <div className="surface-card rounded-sm p-8 flex flex-col items-center justify-center min-h-[360px] border border-dashed border-border text-center">
        <div className="mb-6 flex items-center justify-center p-6 bg-primary/5 rounded-full ring-8 ring-primary/5">
          <Mail className="size-16 text-primary opacity-80" strokeWidth={1.5} />
        </div>
        <div className="text-center max-w-sm">
          <p className="font-semibold text-base text-foreground">Transactional Email Pipeline Active</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Order emails are automatically dispatched via Resend. Advanced email template customization and broadcast controls will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
