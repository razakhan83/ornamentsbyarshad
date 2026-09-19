'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function AdminLoginFormClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/admin';
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        toast.error('Invalid admin credentials. Please verify your email and password.');
      } else if (res?.url) {
        window.location.href = res.url;
      }
    } catch (error) {
      toast.error('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* ── Subtitle & Title ── */}
      <div className="mb-6 text-left">
        <p className="text-xs sm:text-sm font-medium text-[#737373] tracking-wide">
          Please enter your credentials
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121212] mt-1">
          Admin Access
        </h1>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#121212] mb-1.5" htmlFor="admin-email">
            Admin Email
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="admin@example.com"
            className="w-full h-11 px-3.5 rounded-sm border border-[#E0DCD5] bg-white text-sm text-[#121212] placeholder:text-[#9E9E9E] outline-none transition-colors focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#121212] mb-1.5" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="••••••••"
            className="w-full h-11 px-3.5 rounded-sm border border-[#E0DCD5] bg-white text-sm text-[#121212] placeholder:text-[#9E9E9E] outline-none transition-colors focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20"
          />
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between pt-0.5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none text-[#525252]">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
              className="size-4 rounded-sm border-[#C7C2BA] data-[state=checked]:bg-[#121212] data-[state=checked]:border-[#121212]"
            />
            <span>Remember for 30 days</span>
          </label>

          <button
            type="button"
            onClick={() => setForgotModalOpen(true)}
            className="font-medium text-[#121212] hover:text-[#A67C52] transition-colors underline-offset-2 hover:underline cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 mt-2 bg-[#121212] hover:bg-[#262626] text-white text-sm font-semibold rounded-sm flex items-center justify-center transition-all shadow-xs active:scale-[0.99] cursor-pointer disabled:opacity-70"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Authenticating...</span>
            </span>
          ) : (
            <span>Sign in to Admin</span>
          )}
        </button>

        {/* Continue with Google */}
        <div className="pt-2">
          <GoogleSignInButton
            callbackUrl={callbackUrl}
            className="h-11 rounded-sm text-xs sm:text-sm font-medium border border-[#E0DCD5] bg-white hover:bg-[#FAF9F6] text-[#121212] shadow-2xs"
          />
        </div>
      </form>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
        <DialogContent className="max-w-md bg-white text-[#121212] rounded-sm p-6 shadow-xl border border-[#E8E5DF]">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-bold text-[#121212]">
              Admin Password Recovery
            </DialogTitle>
            <DialogDescription className="text-xs text-[#737373] leading-relaxed pt-1">
              Admin credentials are authenticated against master configuration or authorized Google workspace email.
              <br /><br />
              If you have lost your master admin password, check the system environment variables or log in using an authorized Google Admin email address.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="px-4 py-2 bg-[#121212] text-white text-xs font-semibold rounded-sm hover:bg-neutral-800"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
