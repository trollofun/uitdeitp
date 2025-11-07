'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IdleTimeoutProps {
  onTimeout: () => void;
  timeoutMs?: number;
  warningMs?: number;
  children: React.ReactNode;
}

export function IdleTimeout({
  onTimeout,
  timeoutMs = 60000, // 60 seconds
  warningMs = 50000, // 50 seconds (10s warning)
  children,
}: IdleTimeoutProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    // Clear all timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setShowWarning(false);
    setCountdown(10);

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      let count = 10;
      countdownIntervalRef.current = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(countdownIntervalRef.current!);
        }
      }, 1000);
    }, warningMs);

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeoutMs);
  }, [onTimeout, timeoutMs, warningMs]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [resetTimer]);

  const handleContinue = () => {
    resetTimer();
  };

  return (
    <>
      {children}

      {showWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-12 text-center">
            <AlertTriangle className="w-24 h-24 text-orange-500 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Ești încă aici?
            </h2>
            <p className="text-2xl text-gray-600 mb-8">
              Sesiunea va expira în <span className="font-bold text-orange-600">{countdown}</span> secunde
            </p>
            <Button
              onClick={handleContinue}
              className="h-20 px-12 text-2xl font-bold rounded-2xl shadow-xl active:scale-95"
              size="lg"
            >
              Da, continuă
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
