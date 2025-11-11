'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Phone, Check, AlertCircle, Loader2, Shield } from 'lucide-react';

interface PhoneVerificationStepProps {
  phone?: string;  // Optional: If provided (kiosk), skip phone input and auto-send SMS
  stationSlug: string;
  onVerified: (phone: string, consent: boolean) => void;  // Return both phone and consent
  onBack: () => void;
}

export function PhoneVerificationStep({
  phone: phoneProp,
  stationSlug,
  onVerified,
  onBack,
}: PhoneVerificationStepProps) {
  // Internal state for phone (if not provided as prop)
  const [phone, setPhone] = useState(phoneProp || '');
  const [step, setStep] = useState<'phone' | 'code'>(phoneProp ? 'code' : 'phone');
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Auto-send SMS code when phone prop is provided (kiosk mode)
  useEffect(() => {
    if (phoneProp) {
      handleSendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer for code expiration
  useEffect(() => {
    if (expiresIn > 0) {
      const timer = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [expiresIn]);

  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setPhone(value);
      setError('');
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setCode(value);
      setError('');
    }
  };

  const handleSendCode = async () => {
    if (phone.length !== 10) {
      setError('Te rugăm să introduci un număr valid de telefon');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, stationSlug }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Eroare la trimiterea codului');
      setStep('code');
      setExpiresIn(data.expiresIn || 600);
      setCanResend(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la trimiterea codului');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('Codul trebuie să aibă 6 cifre');
      return;
    }
    if (!consent) {
      setError('Trebuie să accepți prelucrarea datelor pentru a continua');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Cod invalid');
      if (data.verified) onVerified(phone, consent);  // Return both phone and consent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cod invalid');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    setCode('');
    try {
      const response = await fetch('/api/verification/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, stationSlug }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Eroare');
      setExpiresIn(data.expiresIn || 600);
      setCanResend(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {step === 'phone' ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Phone className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Verificare Telefon</h2>
            <p className="text-muted-foreground">Introdu numărul tău de telefon</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Număr de telefon</label>
            <Input type="tel" placeholder="07XX XXX XXX" value={formatPhoneDisplay(phone)}
              onChange={handlePhoneChange} disabled={loading} className="text-lg h-14 text-center" autoFocus />
          </div>
          {error && (<div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-5 h-5" /><span className="text-sm">{error}</span></div>)}
          <div className="flex gap-4">
            <Button variant="outline" onClick={onBack} disabled={loading} className="flex-1 h-14">Înapoi</Button>
            <Button onClick={handleSendCode} disabled={loading || phone.length !== 10} className="flex-1 h-14">
              {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Se trimite...</> : 'Trimite Cod'}
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Cod de Verificare</h2>
            <p className="font-mono font-bold text-lg">{formatPhoneDisplay(phone)}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Cod de verificare</label>
            <Input type="text" inputMode="numeric" placeholder="000000" value={code}
              onChange={handleCodeChange} disabled={loading} className="text-2xl h-16 text-center font-mono" autoFocus />
            <p className="text-xs text-muted-foreground text-center">Expiră în {formatTime(expiresIn)}</p>
          </div>

          {/* GDPR Consent */}
          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">Consimțământ GDPR</span>
                </div>
                <span className="text-gray-700">
                  Accept prelucrarea datelor mele personale (nume, telefon, număr auto)
                  în scopul trimiterii de reminder-uri SMS/Email despre expirarea ITP.
                  Datele vor fi stocate securizat conform GDPR.
                </span>
              </Label>
            </div>
          </div>

          {error && (<div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-5 h-5" /><span className="text-sm">{error}</span></div>)}
          <div className="space-y-3">
            <Button onClick={handleVerifyCode} disabled={loading || code.length !== 6 || !consent} className="w-full h-14">
              {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Se verifică...</> : 'Verifică și Continuă'}
            </Button>
            {canResend ? (
              <Button variant="outline" onClick={handleResendCode} disabled={loading} className="w-full h-12">Retrimite Cod</Button>
            ) : phoneProp ? (
              <Button variant="ghost" onClick={onBack} disabled={loading} className="w-full h-12">Înapoi</Button>
            ) : (
              <Button variant="ghost" onClick={() => setStep('phone')} disabled={loading} className="w-full h-12">Schimbă Numărul</Button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
