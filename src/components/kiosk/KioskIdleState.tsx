'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: number;
  emoji: string;
  title: string;
  body: string;
  color: string; // Accent color for this message
}

const messages: Message[] = [
  {
    id: 1,
    emoji: '🚗',
    title: 'ITP-ul tău expiră?',
    body: 'Înregistrează-te ACUM și nu mai uita niciodată!',
    color: '#3B82F6' // Blue
  },
  {
    id: 2,
    emoji: '✅',
    title: '500+ șoferi',
    body: 'deja nu mai uită de ITP',
    color: '#10B981' // Green
  },
  {
    id: 3,
    emoji: '📱',
    title: 'SMS gratuit',
    body: 'cu 5 zile înainte de expirare',
    color: '#8B5CF6' // Purple
  },
  {
    id: 4,
    emoji: '⚡',
    title: 'Rapid și simplu',
    body: 'configurare în 30 de secunde',
    color: '#F59E0B' // Orange/Amber
  }
];

// Floating feature cards that scroll horizontally
const features = [
  { emoji: '⏰', text: 'Reminder-e la timp' },
  { emoji: '🎯', text: 'Zero griji' },
  { emoji: '🔔', text: 'Notificări SMS' },
  { emoji: '✓', text: 'Gratuit' },
];

interface KioskIdleStateProps {
  onStart: () => void;
  primaryColor?: string;
}

export default function KioskIdleState({ onStart, primaryColor = '#3B82F6' }: KioskIdleStateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
      setProgress(0);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Progress timer
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
      className="relative flex h-screen w-full cursor-pointer items-center justify-center overflow-hidden"
      onClick={onStart}
      style={{
        background: `linear-gradient(135deg, #f9fafb 0%, ${primaryColor}08 50%, #f9fafb 100%)`
      }}
    >
      {/* Animated Background - Multiple Layers for Depth */}
      <div className="absolute inset-0">
        {/* Primary gradient orbs */}
        <motion.div
          className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: primaryColor }}
          animate={{
            x: [0, 80, -80, 0],
            y: [0, -50, 50, 0],
            scale: [1, 1.3, 0.7, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 h-[450px] w-[450px] rounded-full bg-green-400 blur-3xl opacity-15"
          animate={{
            x: [0, -70, 70, 0],
            y: [0, 40, -40, 0],
            scale: [1, 0.7, 1.3, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 h-[350px] w-[350px] rounded-full bg-purple-400 blur-3xl opacity-10"
          animate={{
            x: [-40, 40, -40],
            y: [-40, 40, -40],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white opacity-60"
            style={{
              width: Math.random() * 8 + 4,
              height: Math.random() * 8 + 4,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-16 px-12 text-center">

        {/* Brand/Logo Area with Animated Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="space-y-2"
        >
          <motion.h2
            className="text-2xl font-semibold text-gray-600"
            animate={{
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Bine ai venit la
          </motion.h2>
          <motion.h1
            className="text-6xl font-black tracking-tight"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${currentMessage.color} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            uitdeITP
          </motion.h1>
        </motion.div>

        {/* Rotating Message Cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMessage.id}
            initial={{ opacity: 0, scale: 0.8, rotateX: -20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: 20 }}
            transition={{
              duration: 0.7,
              ease: [0.43, 0.13, 0.23, 0.96]
            }}
            className="flex flex-col items-center space-y-10"
          >
            {/* Emoji with Advanced Animation */}
            <div className="relative">
              {/* Glow ring behind emoji */}
              <motion.div
                className="absolute inset-0 -m-8 rounded-full blur-2xl"
                style={{
                  backgroundColor: currentMessage.color,
                  opacity: 0.2
                }}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              {/* Emoji */}
              <motion.div
                className="relative text-[140px] leading-none"
                animate={{
                  scale: [1, 1.12, 1],
                  rotate: [0, 5, -5, 0],
                  y: [0, -10, 0]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {currentMessage.emoji}
              </motion.div>
            </div>

            {/* Title with Gradient */}
            <motion.h2
              className="text-[52px] font-black leading-tight max-w-3xl"
              style={{
                background: `linear-gradient(135deg, #1F2937 0%, ${currentMessage.color} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {currentMessage.title}
            </motion.h2>

            {/* Body */}
            <motion.p
              className="text-[36px] leading-relaxed text-gray-700 font-medium max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {currentMessage.body}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Horizontal Scrolling Feature Cards */}
        <motion.div
          className="overflow-hidden w-full max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="flex gap-6"
            animate={{
              x: ['0%', '-50%']
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            {/* Duplicate features array for seamless loop */}
            {[...features, ...features].map((feature, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-lg border border-gray-100 flex-shrink-0"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-4xl">{feature.emoji}</span>
                <span className="text-xl font-semibold text-gray-800 whitespace-nowrap">
                  {feature.text}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Enhanced CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative mt-12"
        >
          {/* Pulsing glow behind button */}
          <motion.div
            className="absolute inset-0 rounded-3xl blur-2xl"
            style={{
              backgroundColor: primaryColor,
              opacity: 0.3
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Button */}
          <motion.div
            className="relative rounded-3xl bg-white px-14 py-10 shadow-2xl border-2"
            style={{
              borderColor: primaryColor
            }}
            animate={{
              boxShadow: [
                `0 10px 40px ${primaryColor}30`,
                `0 20px 60px ${primaryColor}50`,
                `0 10px 40px ${primaryColor}30`,
              ]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            whileHover={{
              scale: 1.03,
              y: -5
            }}
            whileTap={{
              scale: 0.97
            }}
          >
            <p className="text-[32px] font-bold text-gray-900 flex items-center gap-4 justify-center">
              <motion.span
                className="text-5xl"
                animate={{
                  y: [0, -12, 0],
                  rotate: [0, 15, -15, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                👆
              </motion.span>
              <span
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${currentMessage.color} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Atinge ecranul pentru a începe
              </span>
            </p>

            {/* Subtitle with shimmer effect */}
            <motion.p
              className="mt-4 text-[22px] text-gray-600 font-medium"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Înregistrarea durează doar <strong className="text-gray-900">2 minute</strong>
            </motion.p>

            {/* Decorative shimmer line */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl overflow-hidden"
            >
              <motion.div
                className="h-full"
                style={{
                  background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`
                }}
                animate={{
                  x: ['-100%', '200%']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Enhanced Progress Dots */}
        <motion.div
          className="flex items-center space-x-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              className="relative"
            >
              {/* Active indicator glow */}
              {index === currentIndex && (
                <motion.div
                  className="absolute inset-0 -m-2 rounded-full blur-md"
                  style={{
                    backgroundColor: msg.color,
                    opacity: 0.4
                  }}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.5, 0.3]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}

              {/* Progress bar */}
              <div
                className="relative h-5 rounded-full overflow-hidden shadow-lg"
                style={{
                  width: index === currentIndex ? '80px' : '20px',
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: index === currentIndex ? '#E5E7EB' : '#D1D5DB'
                }}
              >
                {/* Fill */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: index === currentIndex ? msg.color : '#9CA3AF'
                  }}
                  initial={{ width: '0%' }}
                  animate={{
                    width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%'
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Subtle hint text */}
        <motion.p
          className="text-gray-400 text-lg font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatDelay: 2
          }}
        >
          Simplu. Rapid. Gratuit.
        </motion.p>
      </div>
    </div>
  );
}
