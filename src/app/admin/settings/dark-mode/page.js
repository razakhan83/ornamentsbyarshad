import { Moon } from 'lucide-react';
import { requireAdmin } from '@/lib/requireAdmin';

export default async function DarkModeSettingsPage() {
  await requireAdmin();
  
  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Appearance & Dark Mode</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure storefront and admin visual appearance preferences.
        </p>
      </div>
      <div className="surface-card rounded-sm p-8 flex flex-col items-center justify-center min-h-[360px] border border-dashed border-border text-center">
        <div className="mb-6 flex items-center justify-center p-6 bg-primary/5 rounded-full ring-8 ring-primary/5">
          <Moon className="size-16 text-primary opacity-80" strokeWidth={1.5} />
        </div>
        <div className="text-center max-w-sm">
          <p className="font-semibold text-base text-foreground">Theme & Display Settings</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
            The storefront currently adapts to the user&apos;s system preference automatically. Granular theme override controls are rolling out soon.
          </p>
        </div>
      </div>
    </div>
  );
}
