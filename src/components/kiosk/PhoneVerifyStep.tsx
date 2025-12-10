'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Smartphone, AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface PhoneVerifyStepProps {
  phone: string;
  onVerify: (code: string) => Promise<boolean>;
  onBack: () => void;
  onResend: () => Promise<void>;
}

export default function PhoneVerifyStep({
  phone,
  onVerify,
  onBack,
  onResend,
}: PhoneVerifyStepProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = code.split('');
    newCode[index] = value;
    const updatedCode = newCode.join('');
    setCode(updatedCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (updatedCode.length === 6) {
      handleVerify(updatedCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verifyCode: string = code) => {
    if (verifyCode.length !== 6) {
      setError('Codul trebuie să aibă 6 cifre');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const isValid = await onVerify(verifyCode);
      if (!isValid) {
        setError('Cod incorect. Te rugăm să încerci din nou.');
        setCode('');
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('A apărut o eroare. Te rugăm să încerci din nou.');
      setCode('');
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    setCode('');

    try {
      await onResend();
      setTimeLeft(180);
      setCanResend(false);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError('Nu am putut retrimite codul. Te rugăm să încerci din nou.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-8"
    >
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-12">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-block p-4 bg-blue-100 rounded-full mb-4"
          >
            <Smartphone className="w-12 h-12 text-blue-600" />
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Verificare Număr Telefon
          </h2>
          <p className="text-gray-600 mb-4">
            Am trimis un cod de verificare la numărul
          </p>
          <p className="text-xl font-semibold text-blue-600">{phone}</p>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Clock className={`w-5 h-5 ${timeLeft < 30 ? 'text-red-600' : 'text-gray-400'}`} />
          <span className={`text-lg font-medium ${timeLeft < 30 ? 'text-red-600' : 'text-gray-600'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Code Input */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">
            Introdu codul de verificare
          </label>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileFocus={{ scale: 1.05 }}
              >
                <Input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code[index] || ''}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-14 h-16 text-center text-2xl font-bold border-2 focus:border-blue-600 transition-all"
                  disabled={isVerifying}
                  autoFocus={index === 0}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-6 text-red-600"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}

        {/* Resend Button */}
        <div className="text-center mb-8">
          {canResend ? (
            <Button
              onClick={handleResend}
              disabled={isResending}
              variant="link"
              className="text-blue-600 hover:text-blue-700"
            >
              {isResending ? 'Se retrimite...' : 'Retrimite codul'}
            </Button>
          ) : (
            <p className="text-sm text-gray-500">
              Poți retrimite codul peste {formatTime(timeLeft)}
            </p>
          )}
        </div>

        {/* Psychological Trigger */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Nu pierde această oportunitate!</p>
              <p>
                Verifică acum și primești reminder automat pentru expirarea asigurării.
                Evită amenzile și drumurile inutile.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="flex-1 py-6 text-lg"
            disabled={isVerifying}
          >
            Înapoi
          </Button>
          <Button
            onClick={() => handleVerify()}
            disabled={code.length !== 6 || isVerifying}
            size="lg"
            className="flex-1 py-6 text-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? 'Se verifică...' : 'Verifică'}
            {!isVerifying && code.length === 6 && (
              <CheckCircle className="ml-2 w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Progress */}
        <div className="mt-8 flex justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600" />
          <div className="w-3 h-3 rounded-full bg-blue-600" />
          <div className="w-3 h-3 rounded-full bg-gray-300" />
        </div>
      </div>
    </motion.div>
  );
}
