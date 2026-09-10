'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SettingSection } from '@/app/admin/settings/settingsShared';
import { toggleGuestModeAction } from './actions';

export default function AdminAccessSectionClient({ isConfiguredAdmin, initialGuestMode }) {
  const [configuredAdmins, setConfiguredAdmins] = useState([]);
  const [dynamicAdmins, setDynamicAdmins] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingEmail, setRemovingEmail] = useState(null);
  const [guestMode, setGuestMode] = useState(initialGuestMode);
  const [togglingGuestMode, setTogglingGuestMode] = useState(false);

  useEffect(() => {
    async function fetchAdmins() {
      try {
        const res = await fetch('/api/settings/admins');
        const data = await res.json();
        if (data.success) {
          setConfiguredAdmins(data.data.configuredAdmins || []);
          setDynamicAdmins(data.data.dynamicAdmins || []);
        }
      } catch {
        toast.error('Failed to load admin list.');
      } finally {
        setLoadingList(false);
      }
    }

    if (isConfiguredAdmin) {
      fetchAdmins();
    } else {
      setLoadingList(false);
    }
  }, [isConfiguredAdmin]);

  async function handleAddAdmin(event) {
    event.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;

    setAdding(true);
    try {
      const res = await fetch('/api/settings/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add admin');
      setDynamicAdmins(data.data);
      setNewEmail('');
      toast.success(`${trimmed} added as admin.`);
    } catch (error) {
      toast.error(error.message || 'Failed to add admin.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveAdmin(email) {
    setRemovingEmail(email);
    try {
      const res = await fetch('/api/settings/admins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to remove admin');
      setDynamicAdmins(data.data);
      toast.success(`${email} removed from admin access.`);
    } catch (error) {
      toast.error(error.message || 'Failed to remove admin.');
    } finally {
      setRemovingEmail(null);
    }
  }

  async function handleToggleGuestMode(checked) {
    setTogglingGuestMode(true);
    setGuestMode(checked);
    try {
      const res = await toggleGuestModeAction(checked);
      if (!res.success) throw new Error('Failed to toggle guest mode');
      toast.success(`Guest Mode is now ${checked ? 'ON' : 'OFF'}.`);
    } catch (error) {
      setGuestMode(!checked);
      toast.error(error.message || 'Failed to update setting.');
    } finally {
      setTogglingGuestMode(false);
    }
  }


  if (!isConfiguredAdmin) {
    return (
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Access Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You do not have permission to view or edit access settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Access Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage which users have access to the admin panel.
        </p>
      </div>
      <div className="space-y-6">
        <SettingSection
          icon={ShieldCheck}
          title="Access Management"
          description="Configured admin accounts from environment variables always keep access. Additional admins can be managed here."
        >
          <form onSubmit={handleAddAdmin} className="flex gap-2">
            <Input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="admin@example.com"
              className="flex-1 rounded-md border-slate-300"
              required
            />
            <Button
              type="submit"
              disabled={adding || !newEmail.trim()}
              size="sm"
              className="admin-cta-button shrink-0"
            >
              {adding ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <UserPlus data-icon="inline-start" />}
              Add Admin
            </Button>
          </form>

          {loadingList ? (
            <div className="space-y-2 pt-2">
              {[1, 2].map((item) => (
                <div key={item} className="h-11 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : (
            <div className="space-y-5 pt-1">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Configured admins</p>
                {configuredAdmins.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    No configured admin emails found in environment variables.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {configuredAdmins.map((email) => (
                      <li
                        key={email}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/35 px-4 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ShieldCheck className="size-4 shrink-0 text-foreground" />
                          <span className="truncate text-sm font-medium text-foreground">{email}</span>
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                          Protected
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Additional admins</p>
                {dynamicAdmins.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    No additional admins yet. Add one above.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {dynamicAdmins.map((email) => (
                      <li
                        key={email}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/35 px-4 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ShieldCheck className="size-4 shrink-0 text-foreground" />
                          <span className="truncate text-sm font-medium text-foreground">{email}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemoveAdmin(email)}
                          disabled={removingEmail === email}
                          title={`Remove ${email}`}
                        >
                          {removingEmail === email ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </SettingSection>

        <SettingSection
          icon={ShieldCheck}
          title="Live Demo / Guest Mode"
          description="Allow prospective clients or users to explore the admin panel as a guest. All database mutations (saving, deleting) are strictly blocked in Demo Mode."
        >
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground">
                Enable &quot;Explore as Guest&quot;
              </div>
              <div className="text-xs text-muted-foreground">
                Displays the guest login button on the admin login page.
              </div>
            </div>
            <Switch
              checked={guestMode}
              onCheckedChange={handleToggleGuestMode}
              disabled={togglingGuestMode}
            />
          </div>
        </SettingSection>
      </div>
    </div>
  );
}
