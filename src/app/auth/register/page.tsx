'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { createBrowserClient } from '@/lib/supabase/client';
import { AlertCircle, Loader2, Mail, Lock, User, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const supabase = createBrowserClient();

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Parola trebuie să aibă minimum 8 caractere';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Parola trebuie să conțină cel puțin o literă mare';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Parola trebuie să conțină cel puțin o literă mică';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Parola trebuie să conțină cel puțin o cifră';
    }
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validations
    if (!agreedToTerms) {
      setError('Trebuie să accepți termenii și condițiile');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Parolele nu se potrivesc');
      setLoading(false);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    try {
      // Sign up user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Acest email este deja înregistrat');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Create user profile with default role
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: 'user',
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }

        setSuccess(true);
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 2000);
      }
    } catch (err) {
      setError('Eroare la înregistrare. Te rugăm să încerci din nou.');
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
            Cont creat cu succes!
          </h2>
          <p className="text-muted-foreground">
            Te redirecționăm către dashboard...
          </p>
        </div>
      </div>
    );
  }

  const passwordStrength = password.length > 0 ? (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${
              password.length >= (i + 1) * 2
                ? password.length >= 12
                  ? 'bg-green-500'
                  : password.length >= 8
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {password.length >= 12
          ? 'Parolă puternică'
          : password.length >= 8
          ? 'Parolă medie'
          : 'Parolă slabă'}
      </p>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Creează cont nou</h2>
        <p className="text-sm text-muted-foreground">
          Înregistrează-te pentru a gestiona reminder-ele tale ITP
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            Nume complet
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              id="fullName"
              type="text"
              placeholder="Ion Popescu"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10"
              required
              disabled={loading}
              autoComplete="name"
            />
          </div>
        </div>

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
              autoComplete="new-password"
            />
          </div>
          {passwordStrength}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirmă parola
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
            disabled={loading}
          />
          <label
            htmlFor="terms"
            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Accept{' '}
            <Link href="/termeni-si-conditii" className="text-primary hover:underline">
              Termenii și Condițiile
            </Link>{' '}
            și{' '}
            <Link href="/politica-confidentialitate" className="text-primary hover:underline">
              Politica de Confidențialitate
            </Link>
          </label>
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
          disabled={loading || !email || !password || !confirmPassword || !fullName || !agreedToTerms}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Se creează contul...
            </>
          ) : (
            'Creează cont'
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Ai deja cont? </span>
        <Link
          href="/auth/login"
          className="text-primary font-medium hover:underline"
        >
          Conectează-te
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
