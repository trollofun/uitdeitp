'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/auth/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/auth/card';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { resetPassword } from '@/lib/auth/actions';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Check for token in URL
  useEffect(() => {
    const token = searchParams.get('token') || searchParams.get('code');

    if (!token) {
      setTokenValid(false);
    } else {
      setTokenValid(true);
    }
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    // Client-side validation
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Parolele nu coincid',
      });
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Parola trebuie să aibă minim 8 caractere',
      });
      setLoading(false);
      return;
    }

    const result = await resetPassword({ password, confirmPassword });

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: result.error,
      });
      setLoading(false);
    } else {
      setSuccess(true);
      toast({
        title: 'Succes',
        description: 'Parola a fost resetată cu succes!',
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    }
  }

  // Token validation loading state
  if (tokenValid === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm text-gray-600">Verificare link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token
  if (tokenValid === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Link invalid sau expirat</CardTitle>
            <CardDescription>
              Linkul de resetare a parolei este invalid sau a expirat. Vă rugăm să solicitați unul nou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/forgot-password">
              <Button className="w-full">
                Solicită un link nou
              </Button>
            </Link>
            <div className="mt-4 text-center">
              <Link href="/auth/login" className="text-sm text-gray-600 hover:underline">
                Înapoi la autentificare
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Parolă resetată!</CardTitle>
            <CardDescription>
              Parola dvs. a fost resetată cu succes. Veți fi redirecționat la pagina de autentificare...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login">
              <Button className="w-full">
                Continuă la autentificare
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-3xl">Resetare parolă</CardTitle>
          <CardDescription className="text-center">
            Introdu noua parolă pentru contul tău
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Parolă nouă</Label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="••••••••"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordStrengthMeter password={password} />
              <p className="text-xs text-gray-500">
                Minim 8 caractere, o literă mare, o cifră și un caracter special
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmă parola</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder="••••••••"
                required
                disabled={loading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                Parolele nu coincid
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se procesează...
                </>
              ) : (
                'Resetează parola'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:underline">
              Înapoi la autentificare
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
