'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: number;
  emoji: string;
  title: string;
  body: string;
}

const messages: Message[] = [
  {
    id: 1,
    emoji: '🚗',
    title: 'ITP-ul tău expiră?',
    body: 'Înregistrează-te ACUM și nu mai uita niciodată!'
  },
  {
    id: 2,
    emoji: '✓',
    title: '500+ șoferi',
    body: 'deja nu mai uită de ITP'
  },
  {
    id: 3,
    emoji: '📱',
    title: 'SMS gratuit',
    body: 'cu 5 zile înainte de expirare'
  },
  {
    id: 4,
    emoji: '⚠️',
    title: 'Amendă 1.450 RON',
    body: 'pentru ITP expirat'
  }
];

interface KioskIdleStateProps {
  onStart: () => void;
}

export default function KioskIdleState({ onStart }: KioskIdleStateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const currentMessage = messages[currentIndex];

  return (
    <div
      className="relative flex h-screen w-full cursor-pointer items-center justify-center bg-[#F9FAFB]"
      onClick={onStart}
    >
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-12 px-12 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMessage.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 1,
              ease: 'easeInOut'
            }}
            className="flex flex-col items-center space-y-8"
          >
            {/* Emoji Icon */}
            <motion.div
              className="text-[64px] leading-none"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 0.5,
                ease: 'easeOut',
                delay: 0.2
              }}
            >
              {currentMessage.emoji}
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-[32px] font-bold leading-tight text-gray-900"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {currentMessage.title}
            </motion.h1>

            {/* Body */}
            <motion.p
              className="text-[24px] leading-relaxed text-gray-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {currentMessage.body}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-16"
        >
          <div className="rounded-2xl bg-white px-8 py-6 shadow-lg">
            <p className="text-[20px] font-semibold text-gray-900">
              Atinge ecranul pentru a începe
            </p>
            <p className="mt-2 text-[16px] text-gray-600">
              Înregistrarea durează doar 2 minute
            </p>
          </div>
        </motion.div>

        {/* Progress Dots */}
        <motion.div
          className="flex items-center space-x-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          {messages.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-500 ${
                index === currentIndex
                  ? 'w-8 bg-blue-600'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </motion.div>
      </div>

      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-blue-500 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-green-500 blur-3xl" />
      </div>
    </div>
  );
}
