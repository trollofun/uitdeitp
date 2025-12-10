'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createBrowserClient } from '@/lib/supabase/client';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { AlertCircle, Loader2, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createBrowserClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email sau parolă incorectă');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Redirect to dashboard
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('Eroare la autentificare. Te rugăm să încerci din nou.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Bine ai revenit!</h2>
        <p className="text-sm text-muted-foreground">
          Conectează-te la contul tău pentru a gestiona reminder-ele
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="exemplu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Parolă
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <Link
            href="/auth/forgot-password"
            className="text-primary hover:underline"
          >
            Ai uitat parola?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full h-11"
          disabled={loading || !email || !password}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Se conectează...
            </>
          ) : (
            'Conectează-te'
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            sau
          </span>
        </div>
      </div>

      <GoogleSignInButton className="w-full" />

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Nu ai cont? </span>
        <Link
          href="/auth/register"
          className="text-primary font-medium hover:underline"
        >
          Înregistrează-te
        </Link>
      </div>

      <div className="text-center">
        <Link
          href="/kiosk"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Înapoi la Kiosk
        </Link>
      </div>
    </div>
  );
}
