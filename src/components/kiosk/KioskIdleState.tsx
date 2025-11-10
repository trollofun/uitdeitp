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
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
      setProgress(0); // Reset progress when message changes
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Progress timer for visual countdown
  useEffect(() => {
    setProgress(0);
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / 8000) * 100, 100);
      setProgress(newProgress);
    }, 50);

    return () => clearInterval(progressInterval);
  }, [currentIndex]);

  const currentMessage = messages[currentIndex];

  return (
    <div
      className="relative flex h-screen w-full cursor-pointer items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 overflow-hidden"
      onClick={onStart}
    >
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 opacity-30">
        <motion.div
          className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-blue-500 blur-3xl"
          animate={{
            x: [0, 50, -50, 0],
            y: [0, -30, 30, 0],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-green-500 blur-3xl"
          animate={{
            x: [0, -50, 50, 0],
            y: [0, 30, -30, 0],
            scale: [1, 0.8, 1.2, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 h-64 w-64 rounded-full bg-purple-400 blur-3xl"
          animate={{
            x: [-32, 32, -32],
            y: [-32, 32, -32],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-12 px-12 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMessage.id}
            initial={{ opacity: 0, scale: 0.85, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -50 }}
            transition={{
              duration: 0.6,
              ease: [0.43, 0.13, 0.23, 0.96]
            }}
            className="flex flex-col items-center space-y-8"
          >
            {/* Emoji Icon - Animated with bounce and rotation */}
            <motion.div
              className="text-[120px] leading-none"
              animate={{
                scale: [1, 1.15, 1],
                rotate: [0, 8, -8, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {currentMessage.emoji}
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-[48px] font-bold leading-tight text-gray-900"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {currentMessage.title}
            </motion.h1>

            {/* Body */}
            <motion.p
              className="text-[32px] leading-relaxed text-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {currentMessage.body}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* CTA - Pulsing Glow Effect */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16"
        >
          <motion.div
            className="rounded-3xl bg-white px-12 py-8 relative"
            animate={{
              boxShadow: [
                "0 10px 40px rgba(59, 130, 246, 0.25)",
                "0 20px 60px rgba(59, 130, 246, 0.45)",
                "0 10px 40px rgba(59, 130, 246, 0.25)",
              ]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <p className="text-[28px] font-bold text-gray-900 flex items-center gap-3 justify-center">
              <motion.span
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                👆
              </motion.span>
              Atinge ecranul pentru a începe
            </p>
            <motion.p
              className="mt-3 text-[20px] text-gray-600"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Înregistrarea durează doar 2 minute
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Progress Dots with Animated Fill */}
        <motion.div
          className="flex items-center space-x-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {messages.map((_, index) => (
            <div
              key={index}
              className="relative h-4 rounded-full overflow-hidden bg-gray-200"
              style={{
                width: index === currentIndex ? '64px' : '16px',
                transition: 'width 0.5s ease'
              }}
            >
              {/* Static background */}
              <div
                className={`absolute inset-0 ${
                  index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
              {/* Animated progress fill */}
              {index === currentIndex && (
                <motion.div
                  className="absolute top-0 left-0 h-full bg-blue-600"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
