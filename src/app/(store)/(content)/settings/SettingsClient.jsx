'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Save, 
  Loader2, 
  ChevronLeft,
  Navigation,
  Building2,
  ShieldCheck,
  MapPinned,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { PAKISTAN_CITIES } from '@/lib/cities';
import { cn } from '@/lib/utils';

async function safeReadJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse settings JSON response', error);
    return null;
  }
}

export default function SettingsClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    landmark: '',
  });
  const [cityOpen, setCityOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status, router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/user/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await safeReadJson(response);
      if (!data) throw new Error('Empty settings response');
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        city: data.city || '',
        address: data.address || '',
        landmark: data.landmark || '',
      });
    } catch (error) {
      console.error(error);
      toast.error('Could not load your settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          city: formData.city,
          address: formData.address,
          landmark: formData.landmark,
        }),
      });

      if (!response.ok) throw new Error('Failed to update settings');
      
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Button 
        variant="ghost" 
        className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => router.back()}
      >
        <ChevronLeft className="mr-1 size-4" />
        Back
      </Button>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your default contact and delivery information.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="surface-card border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="size-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Basic account details synced from your login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="name">Full Name</FieldLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10 focus:ring-primary/20"
                      placeholder="Your Full Name"
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="email" className="flex items-center gap-2">
                    Email Address
                    <ShieldCheck className="size-3 text-primary" title="Locked to your Google account" />
                  </FieldLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input 
                      id="email" 
                      value={formData.email} 
                      disabled 
                      className="pl-10 bg-muted/30"
                    />
                  </div>
                  <FieldDescription className="px-1 text-[10px]">
                    Email is locked to your signed-in Google account for security.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="surface-card border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MapPin className="size-5 text-primary" />
                Default Delivery Info
              </CardTitle>
              <CardDescription>
                These details will be pre-filled during checkout.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input 
                    id="phone" 
                    placeholder="e.g. 0300 1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10 focus:ring-primary/20"
                  />
                </div>
                </Field>
                <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="city">City</FieldLabel>
                    <Popover open={cityOpen} onOpenChange={setCityOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={cityOpen}
                          className={cn("w-full justify-between font-normal", !formData.city && "text-muted-foreground")}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 text-muted-foreground/60" />
                            {formData.city || "Select your city"}
                          </div>
                          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search city..." />
                          <CommandList className="max-h-60 overflow-y-auto">
                            <CommandEmpty>No city found.</CommandEmpty>
                            <CommandGroup>
                              {PAKISTAN_CITIES.map((city) => (
                                <CommandItem
                                  key={city}
                                  value={city}
                                  onSelect={(currentValue) => {
                                    const exactCity = PAKISTAN_CITIES.find(c => c.toLowerCase() === currentValue.toLowerCase()) || currentValue;
                                    setFormData({ ...formData, city: exactCity === formData.city ? "" : exactCity });
                                    setCityOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 size-4",
                                      formData.city === city ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {city}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="landmark">Nearest Landmark</FieldLabel>
                    <div className="relative">
                      <Navigation className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                      <Input 
                        id="landmark" 
                        placeholder="e.g. Near ABC Hospital"
                        value={formData.landmark}
                        onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </Field>
                </FieldGroup>

                <Field>
                  <FieldLabel htmlFor="address">Complete Address</FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <MapPinned className="absolute left-3 top-3 size-4 text-muted-foreground/60" />
                      <Textarea
                        id="address"
                        className="min-h-[100px] pl-10"
                        placeholder="Enter your complete home or office address (Street, Area, etc.)"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <FieldDescription>
                      These details are used to pre-fill checkout for faster ordering.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t border-border/40 px-6 py-4">
              <Button 
                type="submit" 
                className="ml-auto min-w-[120px] font-semibold"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
