'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const MESSAGES = [
  {
    emoji: '🚗',
    title: 'ITP-ul tău expiră?',
    subtitle: 'Înregistrează-te ACUM și primești notificare',
  },
  {
    emoji: '✓',
    title: '500+ șoferi deja',
    subtitle: 'nu mai uită de ITP',
    footer: 'Alătură-te în 30 secunde',
  },
  {
    emoji: '📱',
    title: 'Primești SMS gratuit',
    subtitle: 'cu 5 zile înainte',
    footer: 'Fără aplicații, fără cont',
  },
  {
    emoji: '⚠️',
    title: 'Amendă 1.450 RON',
    subtitle: 'pentru ITP expirat',
    footer: 'Previi în 30 secunde',
  },
];

const MESSAGE_DURATION = 8000; // 8 seconds
const TRANSITION_DURATION = 1000; // 1 second crossfade

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

  const currentMessage = MESSAGES[currentMessageIndex];

  return (
    <div
      onClick={onStart}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center cursor-pointer select-none"
    >
      <div className="max-w-2xl w-full text-center px-10 py-16 space-y-20">
        {/* Rotating Messages */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMessageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="space-y-12"
          >
            {/* Emoji Icon */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.2,
                type: 'spring',
                stiffness: 200,
                damping: 15
              }}
              className="text-9xl"
            >
              {currentMessage.emoji}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-5xl font-bold text-gray-900 leading-tight"
            >
              {currentMessage.title}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-medium text-gray-700"
            >
              {currentMessage.subtitle}
            </motion.p>

            {/* Footer (if exists) */}
            {currentMessage.footer && (
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-2xl text-gray-600"
              >
                {currentMessage.footer}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* CTA - Atinge ecranul */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.6,
            duration: 0.8,
            repeat: Infinity,
            repeatType: 'reverse',
            repeatDelay: 1
          }}
          className="text-2xl font-semibold text-blue-600"
        >
          [ Atinge ecranul ]
        </motion.div>

        {/* Small station name at bottom */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-lg text-gray-500 absolute bottom-8 left-0 right-0 text-center"
        >
          {stationName}
        </motion.p>
      </div>
    </div>
  );
}
