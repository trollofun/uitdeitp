'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createBrowserClient } from '@/lib/supabase/client';
import { AlertCircle, Loader2, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const supabase = createBrowserClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError('Eroare la trimiterea email-ului. Te rugăm să încerci din nou.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
            Email trimis!
          </h2>
          <p className="text-muted-foreground mb-4">
            Am trimis un link de resetare a parolei la adresa <strong>{email}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Verifică inbox-ul (și folderul spam) și urmează instrucțiunile din email.
          </p>
        </div>
        <div className="pt-4">
          <Link href="/auth/login">
            <Button variant="outline" className="w-full">
              Înapoi la Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Resetare parolă</h2>
        <p className="text-sm text-muted-foreground">
          Introdu adresa ta de email și îți vom trimite un link pentru resetarea parolei
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
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
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11"
          disabled={loading || !email}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Se trimite...
            </>
          ) : (
            'Trimite link de resetare'
          )}
        </Button>
      </form>

      <div className="text-center text-sm space-y-2">
        <div>
          <Link
            href="/auth/login"
            className="text-primary hover:underline"
          >
            ← Înapoi la Login
          </Link>
        </div>
        <div>
          <span className="text-muted-foreground">Nu ai cont? </span>
          <Link
            href="/auth/register"
            className="text-primary font-medium hover:underline"
          >
            Înregistrează-te
          </Link>
        </div>
      </div>
    </div>
  );
}
