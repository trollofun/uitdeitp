'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'input' | 'verify' | 'success';

export function ChangeEmailModal({ isOpen, onClose }: ChangeEmailModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(newEmail)) {
      setError('Email invalid');
      return;
    }

    if (!currentPassword) {
      setError('Introdu parola curentă');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/security/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail,
          currentPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('verify');
        toast({
          title: 'Email trimis',
          description: 'Verifică noul email pentru codul de confirmare',
        });
      } else {
        setError(data.error || 'Nu s-a putut trimite email-ul de verificare');
      }
    } catch (err) {
      setError('Eroare de conexiune');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (verificationCode.length !== 6) {
      setError('Codul trebuie să aibă 6 cifre');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/security/verify-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
        setTimeout(() => {
          onClose();
          // Reset form
          setStep('input');
          setNewEmail('');
          setCurrentPassword('');
          setVerificationCode('');
        }, 2000);
      } else {
        setError(data.error || 'Cod invalid');
      }
    } catch (err) {
      setError('Eroare de conexiune');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {/* Step 1: Input new email */}
        {step === 'input' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-6 w-6" />
                <DialogTitle>Schimbă email-ul</DialogTitle>
              </div>
            </DialogHeader>

              <form onSubmit={handleSendVerification} className="space-y-4">
                <div>
                  <label htmlFor="new-email" className="block text-sm font-medium mb-2">
                    Email nou
                  </label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nou@email.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Parola curentă
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Anulează
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !newEmail || !currentPassword}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Se trimite...
                      </>
                    ) : (
                      'Continuă'
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Step 2: Verify code */}
          {step === 'verify' && (
            <>
              <DialogHeader className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
                <DialogTitle className="text-center">Verifică email-ul</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Am trimis un cod de 6 cifre la <br />
                  <span className="font-semibold">{newEmail}</span>
                </p>
              </DialogHeader>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium mb-2">
                    Cod de verificare
                  </label>
                  <Input
                    id="code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('input')}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Înapoi
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Se verifică...
                      </>
                    ) : (
                      'Verifică'
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <>
              <DialogHeader className="text-center">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
                <DialogTitle className="text-center">Email schimbat!</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground text-center">
                Email-ul tău a fost actualizat cu succes
              </p>
            </>
          )}
      </DialogContent>
    </Dialog>
  );
}
