'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

/**
 * Phone Verification Page
 *
 * Post-Google Sign-In flow: Verify phone number via SMS
 *
 * Flow:
 * 1. User enters Romanian phone number (+40XXXXXXXXX)
 * 2. Click "Trimite cod" → send SMS via NotifyHub
 * 3. Enter 6-digit code
 * 4. Validate code → mark phone_verified = true
 * 5. Redirect to /dashboard
 *
 * Features:
 * - 60-second cooldown between SMS sends
 * - Rate limiting (max 3 SMS per hour)
 * - Code expiry (5 minutes)
 * - Max 10 validation attempts
 */

export default function VerifyPhonePage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verificationId, setVerificationId] = useState<string | null>(null);

  // Check if already verified
  useEffect(() => {
    async function checkVerification() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('phone_verified')
        .eq('id', user.id)
        .single();

      if (profile?.phone_verified) {
        router.push('/dashboard');
      }
    }

    checkVerification();
  }, [supabase, router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  /**
   * Send SMS verification code
   */
  async function handleSendCode() {
    if (!phone || phone.length < 10) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Introduceți un număr de telefon valid',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/verify-phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone) }),
      });

      const data = await response.json();

      if (!data.success) {
        toast({
          variant: 'destructive',
          title: 'Eroare',
          description: data.error || 'Nu am putut trimite SMS-ul',
        });
        return;
      }

      setVerificationId(data.verificationId);
      setStep('code');
      setCooldown(60); // 60-second cooldown

      toast({
        title: 'SMS trimis!',
        description: 'Verificați telefonul pentru codul de verificare',
      });
    } catch (error) {
      console.error('Send code error:', error);
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'A apărut o eroare neașteptată',
      });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Validate verification code
   */
  async function handleValidateCode() {
    if (!code || code.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Introduceți codul de 6 cifre',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/verify-phone/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizePhone(phone),
          code,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast({
          variant: 'destructive',
          title: 'Cod incorect',
          description: data.error || 'Codul introdus nu este corect',
        });
        return;
      }

      // Success!
      toast({
        title: 'Verificare reușită!',
        description: 'Telefonul a fost verificat cu succes',
        duration: 3000,
      });

      // Redirect to dashboard after brief delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Validate code error:', error);
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'A apărut o eroare neașteptată',
      });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Normalize Romanian phone number to E.164
   */
  function normalizePhone(input: string): string {
    const digits = input.replace(/\D/g, '');

    if (digits.startsWith('40')) {
      return `+${digits}`;
    } else if (digits.startsWith('0')) {
      return `+4${digits}`;
    } else if (digits.length === 9) {
      return `+40${digits}`;
    }

    return input;
  }

  /**
   * Skip verification (allow dashboard access without phone)
   */
  function handleSkip() {
    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Verificare Telefon</CardTitle>
          <CardDescription>
            {step === 'phone'
              ? 'Introduceți numărul de telefon pentru a primi notificări SMS'
              : 'Introduceți codul primit prin SMS'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 'phone' ? (
            // Step 1: Enter Phone Number
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Număr de telefon
                </label>
                <Input
                  type="tel"
                  placeholder="+40712345678 sau 0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="text-lg"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Format acceptat: +40XXXXXXXXX sau 07XXXXXXXX
                </p>
              </div>

              <Button
                onClick={handleSendCode}
                disabled={loading || !phone || phone.length < 10}
                className="w-full text-lg py-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    Se trimite SMS...
                  </>
                ) : (
                  <>
                    Trimite cod
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>

              {/* Skip option */}
              <div className="text-center pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={loading}
                >
                  Verifică mai târziu
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Vei putea adăuga numărul de telefon din profil
                </p>
              </div>
            </div>
          ) : (
            // Step 2: Enter Verification Code
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Cod de verificare
                </label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  Codul expiră în 5 minute
                </p>
              </div>

              <Button
                onClick={handleValidateCode}
                disabled={loading || code.length !== 6}
                className="w-full text-lg py-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    Se verifică...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 w-5 h-5" />
                    Verifică codul
                  </>
                )}
              </Button>

              {/* Resend code */}
              <div className="text-center pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCode('');
                    handleSendCode();
                  }}
                  disabled={loading || cooldown > 0}
                >
                  {cooldown > 0
                    ? `Trimite din nou (${cooldown}s)`
                    : 'Trimite din nou codul'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Nu ai primit SMS-ul? Verifică numărul: <strong>{phone}</strong>
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setStep('phone')}
                  className="text-xs"
                >
                  Schimbă numărul
                </Button>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-900">
              <strong>De ce verificăm telefonul?</strong>
              <br />
              Pentru a-ți trimite notificări SMS cu reminder-e ITP. Poți dezactiva SMS-urile oricând din setări.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
