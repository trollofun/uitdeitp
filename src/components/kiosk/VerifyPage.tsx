'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

interface VerifyPageProps {
  phone: string;
  onVerify: (code: string) => Promise<boolean>;
  onResend: () => Promise<void>;
}

export default function VerifyPage({ phone, onVerify, onResend }: VerifyPageProps) {
  const [code, setCode] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds for resend
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only last digit
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits are entered
    if (index === 3 && value && newCode.every(d => d)) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verifyCode: string) => {
    setIsVerifying(true);
    setError('');

    try {
      const isValid = await onVerify(verifyCode);
      if (!isValid) {
        setError('Cod incorect');
        setCode(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('Eroare la verificare');
      setCode(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setCode(['', '', '', '']);
    setCanResend(false);
    setTimeLeft(60);

    try {
      await onResend();
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError('Eroare la retrimitrere');
    }
  };

  const formatPhone = (phone: string): string => {
    if (phone.length === 10) {
      return `+40 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ***`;
    }
    return phone;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-10"
    >
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-16 space-y-12">
        {/* Progress */}
        <div className="text-gray-500 text-sm font-medium">Pas 3 din 3</div>

        {/* Title */}
        <h1 className="text-5xl font-bold text-gray-900 leading-tight">
          Verifică telefonul
        </h1>

        {/* Info */}
        <div className="space-y-2">
          <p className="text-2xl text-gray-700">
            Am trimis un cod SMS la
          </p>
          <p className="text-2xl font-bold text-blue-600">
            {formatPhone(phone)}
          </p>
        </div>

        {/* Code Input */}
        <div className="space-y-6">
          <label className="block text-2xl font-medium text-gray-700">
            Introdu codul:
          </label>
          <div className="flex justify-center gap-4">
            {[0, 1, 2, 3].map((index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code[index]}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-20 h-20 text-center text-5xl font-bold border-2 focus:border-blue-600 transition-all rounded-2xl"
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
            className="flex items-center justify-center gap-2 text-red-600"
          >
            <AlertCircle className="w-6 h-6" />
            <span className="text-xl font-medium">{error}</span>
          </motion.div>
        )}

        {/* Resend Timer */}
        <div className="text-center space-y-4">
          {canResend ? (
            <motion.button
              onClick={handleResend}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-xl text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Nu ai primit? Retrimite
            </motion.button>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl text-gray-500">⏱</span>
              <p className="text-xl text-gray-500">
                Retrimitere în {timeLeft}s
              </p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isVerifying && (
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
