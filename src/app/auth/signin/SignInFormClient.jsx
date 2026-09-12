'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function SignInFormClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';
  
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
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
      if (mode === 'signin') {
        const res = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
          callbackUrl,
        });

        if (res?.error) {
          toast.error('Invalid email or password. If you do not have a password, try signing in with Google.');
        } else if (res?.url) {
          window.location.href = res.url;
        }
      } else {
        // Sign Up with Credentials (or redirect to Google for instant verification)
        const res = await signIn('credentials', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          redirect: false,
          callbackUrl,
        });

        if (res?.error) {
          toast.info('To create a new customer account instantly, please use Continue with Google.');
        } else if (res?.url) {
          window.location.href = res.url;
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again or use Google sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* ── Subtitle Kicker & Main Heading ── */}
      <div className="mb-6 text-left">
        <p className="text-xs sm:text-sm font-medium text-[#737373] tracking-wide">
          {mode === 'signin' ? 'Please enter your details' : 'Create your customer profile'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121212] mt-1">
          {mode === 'signin' ? 'Welcome back' : 'Create an account'}
        </h1>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="block text-xs font-semibold text-[#121212] mb-1.5" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. Ayesha Khan"
              className="w-full h-11 px-3.5 rounded-xl border border-[#E0DCD5] bg-white text-sm text-[#121212] placeholder:text-[#9E9E9E] outline-none transition-colors focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#121212] mb-1.5" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="name@example.com"
            className="w-full h-11 px-3.5 rounded-xl border border-[#E0DCD5] bg-white text-sm text-[#121212] placeholder:text-[#9E9E9E] outline-none transition-colors focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#121212] mb-1.5" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={formData.password}
            onChange={handleInputChange}
            placeholder="••••••••"
            className="w-full h-11 px-3.5 rounded-xl border border-[#E0DCD5] bg-white text-sm text-[#121212] placeholder:text-[#9E9E9E] outline-none transition-colors focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20"
          />
        </div>

        {/* Remember me & Forgot Password */}
        {mode === 'signin' && (
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
        )}

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 mt-2 bg-[#121212] hover:bg-[#262626] text-white text-sm font-semibold rounded-xl flex items-center justify-center transition-all shadow-xs active:scale-[0.99] cursor-pointer disabled:opacity-70"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</span>
            </span>
          ) : (
            <span>{mode === 'signin' ? 'Sign in' : 'Sign up'}</span>
          )}
        </button>

        {/* Continue with Google */}
        <div className="pt-2">
          <GoogleSignInButton
            callbackUrl={callbackUrl}
            className="h-11 rounded-xl text-xs sm:text-sm font-medium border border-[#E0DCD5] bg-white hover:bg-[#FAF9F6] text-[#121212] shadow-2xs"
          />
        </div>

        {/* Mode Switcher */}
        <div className="text-center pt-3 text-xs text-[#737373]">
          {mode === 'signin' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-semibold text-[#121212] hover:text-[#A67C52] hover:underline transition-colors cursor-pointer"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-semibold text-[#121212] hover:text-[#A67C52] hover:underline transition-colors cursor-pointer"
              >
                Log in
              </button>
            </p>
          )}
        </div>
      </form>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
        <DialogContent className="max-w-md bg-white text-[#121212] rounded-2xl p-6 shadow-xl border border-[#E8E5DF]">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-bold text-[#121212]">
              Password Assistance
            </DialogTitle>
            <DialogDescription className="text-xs text-[#737373] leading-relaxed pt-1">
              If you registered using Google, you can sign in directly by clicking <strong>Continue with Google</strong>.
              <br /><br />
              For manual account password resets, please contact our customer concierge on WhatsApp at <strong>+92 300 0000000</strong> or email us with your registered order details.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="px-4 py-2 bg-[#121212] text-white text-xs font-semibold rounded-xl hover:bg-neutral-800"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
