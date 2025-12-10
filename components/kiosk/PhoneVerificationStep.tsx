'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/components/button';
import { Input } from '@/components/auth/input';
import { Card } from '@/components/auth/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, Phone, ArrowLeft } from 'lucide-react';
import { VerificationCodeInput } from './VerificationCodeInput';

interface PhoneVerificationStepProps {
  /** Kiosk station slug for branding */
  stationSlug?: string;
  /** Callback when verification is successful */
  onVerified: (phone: string) => void;
  /** Callback to go back to previous step */
  onBack?: () => void;
}

type Step = 'input-phone' | 'input-code' | 'success';

export function PhoneVerificationStep({
  stationSlug,
  onVerified,
  onBack
}: PhoneVerificationStepProps) {
  const [step, setStep] = useState<Step>('input-phone');
  const [phone, setPhone] = useState('+40');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for code expiration
  useEffect(() => {
    if (step === 'input-code' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setError('Codul a expirat. Cere un cod nou.');
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Ensure it starts with +40
    if (!value.startsWith('+40')) {
      value = '+40';
    }

    // Remove non-digits after +40
    const digits = value.slice(3).replace(/\D/g, '');

    // Limit to 9 digits
    setPhone('+40' + digits.slice(0, 9));
  };

  // Validate phone number
  const isValidPhone = (phoneNumber: string): boolean => {
    return /^\+40\d{9}$/.test(phoneNumber);
  };

  // Send verification code
  const handleSendCode = async () => {
    if (!isValidPhone(phone)) {
      setError('Numr de telefon invalid. Format: +40XXXXXXXXX');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, stationSlug })
      });

      const data = await response.json();

      if (data.success) {
        setStep('input-code');
        setTimeLeft(data.expiresIn || 600);
        setCanResend(false);
        setResendCooldown(60); // 60 seconds cooldown
      } else {
        setError(data.error || 'Eroare la trimiterea codului');
      }
    } catch (err) {
      setError('Eroare de conexiune. Verific internetul.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify code
  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('Codul trebuie s aib 6 cifre');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });

      const data = await response.json();

      if (data.success && data.verified) {
        setStep('success');
        // Auto-proceed after 2 seconds
        setTimeout(() => {
          onVerified(phone);
        }, 2000);
      } else {
        setError(data.error || 'Cod invalid');
        setAttemptsRemaining(data.attemptsRemaining || 0);
        setCode(''); // Clear code input

        if (data.attemptsRemaining === 0) {
          setCanResend(true);
        }
      }
    } catch (err) {
      setError('Eroare de conexiune. Verific internetul.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    if (!canResend || resendCooldown > 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/verification/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, stationSlug })
      });

      const data = await response.json();

      if (data.success) {
        setTimeLeft(data.expiresIn || 600);
        setAttemptsRemaining(3);
        setCode('');
        setCanResend(false);
        setResendCooldown(60);
        setError(null);
      } else {
        setError(data.error || 'Eroare la retrimiterea codului');
      }
    } catch (err) {
      setError('Eroare de conexiune. Verific internetul.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format time left
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render step: Input phone
  if (step === 'input-phone') {
    return (
      <Card className="w-full max-w-md mx-auto p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Phone className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold">Verificare telefon</h2>
          <p className="text-gray-600">
            Introducei numrul de telefon pentru a primi codul de verificare prin SMS
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2">
              Numr de telefon
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+40712345678"
              className="text-lg h-14"
              inputMode="numeric"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: +40XXXXXXXXX (9 cifre dup +40)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSendCode}
            disabled={!isValidPhone(phone) || isLoading}
            className="w-full h-14 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Se trimite...
              </>
            ) : (
              'Trimite cod SMS'
            )}
          </Button>

          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full h-12"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              �napoi
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Render step: Input code
  if (step === 'input-code') {
    return (
      <Card className="w-full max-w-md mx-auto p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Introdu codul</h2>
          <p className="text-gray-600">
            Am trimis un cod de 6 cifre la <br />
            <span className="font-semibold">{phone}</span>
          </p>
          <p className={`text-sm font-medium ${timeLeft < 60 ? 'text-red-600' : 'text-gray-500'}`}>
            Expir �n: {formatTime(timeLeft)}
          </p>
        </div>

        <div className="space-y-4">
          <VerificationCodeInput
            value={code}
            onChange={setCode}
            length={6}
            onComplete={handleVerifyCode}
            disabled={isLoading}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
                {attemptsRemaining > 0 && (
                  <> ({attemptsRemaining} �ncercri rmase)</>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleVerifyCode}
            disabled={code.length !== 6 || isLoading}
            className="w-full h-14 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Se verific...
              </>
            ) : (
              'Verific codul'
            )}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">Nu ai primit codul?</p>
            {resendCooldown > 0 ? (
              <p className="text-sm text-gray-500">
                Poi retrimite �n {resendCooldown}s
              </p>
            ) : (
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={!canResend || isLoading}
                className="h-12"
              >
                Retrimite codul
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              setStep('input-phone');
              setCode('');
              setError(null);
            }}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Schimb numrul
          </Button>
        </div>
      </Card>
    );
  }

  // Render step: Success
  return (
    <Card className="w-full max-w-md mx-auto p-8 space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-600">Telefon verificat!</h2>
        <p className="text-gray-600">
          Numrul <span className="font-semibold">{phone}</span> a fost verificat cu succes
        </p>
        <div className="pt-4">
          <div className="animate-bounce">
            <Loader2 className="mx-auto h-6 w-6 text-gray-400 animate-spin" />
          </div>
          <p className="text-sm text-gray-500 mt-2">Se continu...</p>
        </div>
      </div>
    </Card>
  );
}
