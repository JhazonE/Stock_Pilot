
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Settings,
  User,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ConnectionSettingsDialog } from './connection-settings-dialog';

const loginSchema = z.object({
  username: z.string().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface PosLoginFormProps {
  onLoginSuccess: (user: any) => void;
}

export function PosLoginForm({ onLoginSuccess }: PosLoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [now, setNow] = useState<string>('');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Live clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(
        d.toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { getApiUrl } = await import('@/lib/api-config');
      const response = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        onLoginSuccess(result);
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCapsCheck = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  };

  return (
    <>
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl">
        {/* Brand header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 px-8 pb-10 pt-8 text-primary-foreground">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10 pointer-events-none" />
          <div className="absolute -top-12 -right-10 h-44 w-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-black/10 blur-2xl pointer-events-none" />

          {/* Settings button (top-right) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-9 w-9 text-primary-foreground/80 hover:bg-white/15 hover:text-primary-foreground"
            onClick={() => setIsSettingsOpen(true)}
            title="Connection Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <div className="relative flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-lg ring-1 ring-white/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ljma_logo.png" alt="LJMA" className="h-full w-full object-contain" />
            </div>
            <h1 className="mt-4 text-3xl font-black uppercase tracking-[0.25em] drop-shadow-sm">
              POS
            </h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.3em] text-primary-foreground/80">
              Point of Sale Terminal
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="-mt-5 rounded-t-2xl bg-card px-7 pb-7 pt-7">
          <div className="mb-5 text-center">
            <h2 className="text-xl font-bold">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to start your shift</p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">Login failed</p>
                <p className="text-xs opacity-90">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Username
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your cashier username"
                  className="h-12 pl-10 text-base"
                  autoFocus
                  {...form.register('username')}
                />
              </div>
              {form.formState.errors.username && (
                <p className="text-xs font-medium text-destructive">{form.formState.errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-12 pl-10 pr-12 text-base"
                  onKeyDown={handleCapsCheck}
                  onKeyUp={handleCapsCheck}
                  {...form.register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(prev => !prev)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                </Button>
              </div>
              {capsLock && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Caps Lock is on
                </p>
              )}
              {form.formState.errors.password && (
                <p className="text-xs font-medium text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="group h-12 w-full text-base font-bold shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 space-y-3 border-t pt-4">
            <p className="text-center text-xs text-muted-foreground">{now}</p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Need help?</span>
              <span className="opacity-50">·</span>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary"
              >
                <Settings className="h-3 w-3" />
                Connection Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConnectionSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </>
  );
}
