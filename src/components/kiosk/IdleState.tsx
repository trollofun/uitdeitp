'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const MESSAGES = [
  'Ai grijă de siguranța ta! Verifică-ți asigurarea RCA acum.',
  'Nu lăsa expirarea să te surprindă! Programează-te rapid.',
  'Fii responsabil – Asigurarea RCA este obligatorie.',
  'Un reminder la timp te poate salva de amenzi!',
];

const MESSAGE_DURATION = 8000; // 8 seconds

interface IdleStateProps {
  onStart: () => void;
  stationName: string;
}

export default function IdleState({ onStart, stationName }: IdleStateProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, MESSAGE_DURATION);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-12">
        {/* Station Logo/Name */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {stationName}
          </h1>
          <p className="text-xl text-gray-600">Sistem Reminder Asigurare RCA</p>
        </motion.div>

        {/* Rotating Messages */}
        <div className="relative h-32 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessageIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <p className="text-2xl font-semibold text-gray-800 px-4">
                {MESSAGES[currentMessageIndex]}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress Indicators */}
        <div className="flex justify-center gap-2">
          {MESSAGES.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentMessageIndex
                  ? 'w-12 bg-blue-600'
                  : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button
            onClick={onStart}
            size="lg"
            className="text-2xl px-16 py-8 h-auto rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 bg-blue-600 hover:bg-blue-700"
          >
            Începe acum
          </Button>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-sm text-gray-500 space-y-2"
        >
          <p>✓ Verificare gratuită</p>
          <p>✓ Notificări automate prin SMS</p>
          <p>✓ Fără obligații</p>
        </motion.div>
      </div>
    </div>
  );
}
