"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface KioskVerifyPageProps {
  phone: string;
  onNext: (code: string) => void;
  onBack: () => void;
  onResend: () => void;
}

export function KioskVerifyPage({ phone, onNext, onBack, onResend }: KioskVerifyPageProps) {
  const [code, setCode] = useState(["", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    // Focus first input on mount
    inputRefs[0].current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  useEffect(() => {
    // Auto-submit when all 4 digits are entered
    if (code.every((digit) => digit !== "")) {
      const fullCode = code.join("");
      setTimeout(() => onNext(fullCode), 300);
    }
  }, [code, onNext]);

  const handleChange = (index: number, value: string) => {
    // Only allow single digits
    const digit = value.replace(/\D/g, "").slice(-1);

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus next input
    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);

    if (pastedData.length === 4) {
      const newCode = pastedData.split("");
      setCode(newCode);
      inputRefs[3].current?.focus();
    }
  };

  const handleResend = () => {
    if (canResend) {
      setCode(["", "", "", ""]);
      setCountdown(60);
      setCanResend(false);
      inputRefs[0].current?.focus();
      onResend();
    }
  };

  const formatPhone = (phoneNum: string) => {
    // Format +40 712 345 678 for display
    return phoneNum.replace(/(\+40)\s?(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto p-8"
    >
      <div className="text-center mb-8">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Pas 3 din 3
        </p>
        <h1 className="text-3xl font-bold mb-2">Verificare SMS</h1>
        <p className="text-lg text-muted-foreground">
          Codul a fost trimis la {formatPhone(phone)}
        </p>
      </div>

      <Card className="p-8">
        <div className="space-y-8">
          {/* Code Input */}
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Introdu codul de 4 cifre
            </p>

            <div className="flex justify-center gap-4" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-20 h-20 text-5xl font-bold text-center p-0"
                  maxLength={1}
                />
              ))}
            </div>
          </div>

          {/* Resend Section */}
          <div className="text-center space-y-3">
            {!canResend ? (
              <p className="text-sm text-muted-foreground">
                Poți retrimite codul în{" "}
                <span className="font-bold text-foreground">{countdown}s</span>
              </p>
            ) : (
              <Button
                type="button"
                variant="link"
                onClick={handleResend}
                className="text-base font-semibold"
              >
                Retrimite codul
              </Button>
            )}
          </div>

          {/* Back Button */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            className="w-full h-16 text-xl font-semibold"
          >
            Înapoi
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
