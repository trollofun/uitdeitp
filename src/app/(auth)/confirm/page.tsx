'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/auth/card';
import { AlertCircle, Loader2 } from 'lucide-react';

/**
 * AuthConfirmPage - Handler pentru verificarea token-urilor din emailuri
 *
 * Gestionează:
 * - Email confirmation (type: 'email') - ACTUALIZAT 2025: era 'signup' înainte
 * - Password reset (type: 'recovery')
 * - Magic link (type: 'magiclink')
 * - Email change (type: 'email_change')
 *
 * Flow:
 * 1. User primește email cu link: /auth/confirm?token_hash=xxx&type=email
 * 2. Această pagină verifică token-ul cu verifyOtp()
 * 3. Redirect către destinație (dashboard, reset-password, etc.)
 */

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleConfirm = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type') as
          | 'email'        // Email confirmation (UPDATED: era 'signup' înainte)
          | 'recovery'     // Password reset
          | 'invite'       // User invite
          | 'magiclink'    // Magic link login
          | 'email_change' // Email change confirmation
          | null;
        const next = searchParams.get('next') || '/dashboard';

        if (!token_hash || !type) {
          throw new Error('Link invalid sau parametri lipsă');
        }

        const supabase = createBrowserClient();

        // Verifică token-ul OTP cu metoda actualizată (2025)
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash,
          type,
        });

        if (verifyError) {
          console.error('OTP verification error:', verifyError);
          throw verifyError;
        }

        // Verifică sesiunea după verificare
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          // Sesiune validă - redirecționează către destinație
          router.push(next);
        } else {
          // Nu există sesiune activă - redirecționează la login cu mesaj de succes
          router.push('/login?message=verification_success');
        }
      } catch (err) {
        console.error('Auth confirm error:', err);

        // Determină mesajul de eroare
        const errorMessage = err instanceof Error
          ? err.message
          : 'Link-ul de verificare este invalid sau a expirat';

        setError(errorMessage);

        // Redirecționează către pagina de eroare după 3 secunde
        setTimeout(() => {
          const errorType = errorMessage.includes('expirat') ? 'expired' : 'invalid';
          router.push(`/error?type=${errorType}`);
        }, 3000);
      }
    };

    handleConfirm();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-center">Eroare de verificare</CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center">
              Vei fi redirecționat automat către pagina de eroare...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
          <CardTitle className="text-center">Verificare în curs...</CardTitle>
          <CardDescription className="text-center">
            Te rugăm să aștepți în timp ce verificăm link-ul
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ConfirmContent />
    </Suspense>
  );
}
