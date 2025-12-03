'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { motion, LayoutGroup } from 'framer-motion';
import { Phone, Check, AlertCircle, Loader2, Shield } from 'lucide-react';

// Tastatura Numerică Compactă (inline component)
const ResponsiveNumpad = ({ onInput, onDelete }: { onInput: (v: string) => void, onDelete: () => void }) => (
  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full max-w-[320px] mx-auto select-none">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
      <motion.button
        key={num}
        whileTap={{ scale: 0.9, backgroundColor: "#e2e8f0" }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: num * 0.02 }}
        onClick={() => onInput(num.toString())}
        className="h-14 sm:h-16 text-2xl sm:text-3xl font-bold bg-white rounded-xl shadow-[0_2px_0_0_rgba(0,0,0,0.05)] border border-slate-200 text-slate-800 active:shadow-none active:translate-y-0.5 transition-all"
      >
        {num}
      </motion.button>
    ))}
    <div className="h-14 sm:h-16" />
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => onInput('0')}
      className="h-14 sm:h-16 text-2xl sm:text-3xl font-bold bg-white rounded-xl shadow-[0_2px_0_0_rgba(0,0,0,0.05)] border border-slate-200 text-slate-800 active:shadow-none active:translate-y-0.5 transition-all"
    >
      0
    </motion.button>
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onDelete}
      className="h-14 sm:h-16 flex items-center justify-center bg-red-50 rounded-xl shadow-[0_2px_0_#fee2e2] border border-red-100 text-red-500 active:shadow-none active:translate-y-0.5 transition-all text-xl sm:text-2xl"
    >
      ⌫
    </motion.button>
  </div>
);

interface PhoneVerificationStepProps {
  phone?: string;  // Optional: If provided (kiosk), skip phone input and auto-send SMS
  stationSlug: string | null;  // null for dashboard verification, string for kiosk
  onVerified: (phone: string, consent: boolean) => void;  // Return both phone and consent
  onBack: () => void;
  onActivity?: () => void;  // Optional: Call on user interaction to reset inactivity timer
}

export function PhoneVerificationStep({
  phone: phoneProp,
  stationSlug,
  onVerified,
  onBack,
  onActivity,
}: PhoneVerificationStepProps) {
  // Internal state for phone (if not provided as prop)
  // EXPECTED INPUT: 10 digits starting with 0 (e.g., "0729440132")
  // Kiosk now converts +40729440132 → 0729440132 before passing
  const [phone, setPhone] = useState(() => {
    if (!phoneProp) return '';

    // Remove all non-digits
    const digits = phoneProp.replace(/\D/g, '');

    // If already 10 digits with leading 0, use as-is
    if (digits.startsWith('0') && digits.length === 10) {
      return digits; // "0729440132" → "0729440132" ✅
    }

    // If 9 digits without leading 0, add it
    if (digits.length === 9 && !digits.startsWith('0')) {
      return '0' + digits; // "729440132" → "0729440132" ✅
    }

    // Fallback: assume it's already correct format
    return phoneProp;
  });
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
    // Extract only digits (state should be normalized to 10 digits: 0729440132)
    const digits = value.replace(/\D/g, '');

    // Must start with 0 and be exactly 10 digits
    if (!digits.startsWith('0') || digits.length !== 10) {
      return digits; // Return as-is if format unexpected
    }

    // Format as "0729 440 132"
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
    <div className="space-y-3 sm:space-y-6">
      {step === 'phone' ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 sm:space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Phone className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Verificare Telefon</h2>
            <p className="text-muted-foreground">Introdu numărul tău de telefon</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Număr de telefon</label>
            <div className="relative">
              <Input type="tel" placeholder="07XX XXX XXX" value={formatPhoneDisplay(phone)}
                onChange={handlePhoneChange} disabled={loading} className="text-lg h-14 text-center" autoFocus />
              {phone.length === 10 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-3 -top-3"
                >
                  <div className="bg-green-500 rounded-full p-2 shadow-lg">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                </motion.div>
              )}
            </div>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 sm:space-y-3">
          {/* Compact Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">Introdu Codul SMS</h2>
            </div>
            <p className="font-mono text-sm text-slate-500">{formatPhoneDisplay(phone)}</p>
          </div>

          {/* Code Display - Compact */}
          <div className={`w-full max-w-[320px] mx-auto bg-white rounded-xl border-3 px-3 py-2 shadow-md transition-all duration-300 ${code.length >= 6 ? 'border-green-500 shadow-green-100' : 'border-slate-200'}`}>
            <div className="text-xl sm:text-2xl font-mono font-bold text-slate-800 flex items-center justify-center h-8 gap-1">
              <LayoutGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.span
                    layoutId={`code-digit-${i}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    key={i}
                    className="inline-block w-7 text-center"
                  >
                    {code[i] || '_'}
                  </motion.span>
                ))}
              </LayoutGroup>
              {code.length < 6 && (
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-0.5 h-6 bg-blue-600 ml-1"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">

            {/* Numpad */}
            <div className="bg-white/80 backdrop-blur p-2 sm:p-3 rounded-2xl shadow-xl border border-white w-full max-w-[400px] mx-auto">
              <ResponsiveNumpad
                onInput={(d) => {
                  if (code.length < 6) {
                    setCode(code + d);
                    setError('');
                    onActivity?.();
                  }
                }}
                onDelete={() => {
                  if (code.length > 0) {
                    setCode(code.slice(0, -1));
                    onActivity?.();
                  }
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground text-center">Expiră în {formatTime(expiresIn)}</p>
          </div>

          {/* GDPR Consent - Compact */}
          <div className="bg-blue-50/50 p-2 sm:p-3 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => {
                  setConsent(checked as boolean);
                  onActivity?.();
                }}
                className="h-5 w-5"
              />
              <Label htmlFor="consent" className="text-xs leading-tight cursor-pointer flex-1">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-blue-600 shrink-0" />
                  <span className="text-gray-700">
                    Accept prelucrarea datelor (nume, telefon, nr. auto) pentru reminder-uri ITP. <span className="text-blue-600 font-medium">GDPR</span>
                  </span>
                </span>
              </Label>
            </div>
          </div>

          {error && (<div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-4 h-4" /><span className="text-xs">{error}</span></div>)}

          {/* Buttons - Compact */}
          <div className="flex gap-2">
            {canResend ? (
              <Button variant="outline" onClick={handleResendCode} disabled={loading} className="flex-1 h-11 text-sm">Retrimite</Button>
            ) : phoneProp ? (
              <Button variant="outline" onClick={onBack} disabled={loading} className="flex-1 h-11 text-sm">Înapoi</Button>
            ) : (
              <Button variant="outline" onClick={() => setStep('phone')} disabled={loading} className="flex-1 h-11 text-sm">Schimbă Nr.</Button>
            )}
            <Button onClick={handleVerifyCode} disabled={loading || code.length !== 6 || !consent} className="flex-[2] h-11 text-sm">
              {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Verificare...</> : 'Verifică →'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
