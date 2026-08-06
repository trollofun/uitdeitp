'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/auth/input';
import { Label } from '@/components/auth/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/auth/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [lastResendTime, setLastResendTime] = useState<number>(0);

  async function handleResendEmail() {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Introduceți adresa de email pentru a retrimite verificarea.',
      });
      return;
    }

    // Rate limit: 1 resend per minute
    const now = Date.now();
    if (now - lastResendTime < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - lastResendTime)) / 1000);
      toast({
        variant: 'destructive',
        title: 'Prea multe încercări',
        description: `Vă rugăm să așteptați ${waitSeconds} secunde înainte de a trimite din nou.`,
      });
      return;
    }

    setResending(true);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setLastResendTime(now);
      toast({
        title: 'Email trimis',
        description: 'Am retrimis emailul de verificare. Verificați inbox-ul.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'A apărut o eroare la trimiterea emailului. Vă rugăm să încercați din nou.',
      });
    } finally {
      setResending(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();

    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Introduceți adresa de email.',
      });
      return;
    }

    if (verificationCode.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Codul de verificare trebuie să aibă 6 cifre.',
      });
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'signup',
      });

      if (error) throw new Error('Cod de verificare invalid sau expirat.');

      toast({
        title: 'Verificare reușită',
        description: 'Contul dvs. a fost verificat cu succes!',
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: error.message || 'Cod de verificare invalid. Vă rugăm să încercați din nou.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Verifică-ți emailul</CardTitle>
          <CardDescription>
            Am trimis un email cu un link de verificare. Accesează linkul pentru a-ți activa contul.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Nu găsești emailul?</p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                  <li>Verifică folderul de spam sau junk</li>
                  <li>Așteaptă câteva minute și reîncarcă inbox-ul</li>
                  <li>Trimite din nou emailul folosind butonul de mai jos</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {!searchParams.get('email') && (
              <div className="space-y-2">
                <Label htmlFor="email">Adresa de email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplu.ro"
                />
              </div>
            )}
            <Button
              onClick={handleResendEmail}
              disabled={resending}
              variant="outline"
              className="w-full"
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se trimite...
                </>
              ) : (
                'Retrimite emailul de verificare'
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Sau</span>
              </div>
            </div>

            {!showCodeInput ? (
              <Button
                onClick={() => setShowCodeInput(true)}
                variant="ghost"
                className="w-full"
              >
                Introdu codul de verificare manual
              </Button>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="code">Cod de verificare (6 cifre)</Label>
                  <Input
                    id="code"
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="text-center text-lg tracking-widest"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Se verifică...
                    </>
                  ) : (
                    'Verifică codul'
                  )}
                </Button>
              </form>
            )}
          </div>

          <div className="pt-4 text-center">
            <p className="text-sm text-gray-600">
              Înapoi la{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:underline">
                autentificare
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
