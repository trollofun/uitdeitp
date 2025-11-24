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
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Pause animations when tab is hidden (performance optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const currentMessage = messages[currentIndex];

  return (
    <div
      className="relative flex h-screen w-full cursor-pointer items-center justify-center overflow-hidden"
      onClick={onStart}
      style={{
        background: `linear-gradient(135deg, #f9fafb 0%, ${primaryColor}08 50%, #f9fafb 100%)`
      }}
    >
      {/* Animated Background - SVG-optimized orbs for iPad performance */}
      <div className="absolute inset-0">
        {/* SVG with optimized blur filters - much faster on iPad than CSS blur */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <defs>
            {/* Optimized blur filter - lighter than CSS blur-3xl */}
            <filter id="softBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
            </filter>
          </defs>

          {/* Orb 1 - Primary color */}
          <motion.circle
            cx="25%"
            cy="25%"
            r="250"
            fill={primaryColor}
            opacity="0.3"
            filter="url(#softBlur)"
            animate={{
              cx: ['25%', '27%', '23%', '25%'],
              cy: ['25%', '23%', '27%', '25%'],
              r: [250, 325, 175, 250],
            }}
            transition={{
              duration: 20,
              repeat: isVisible ? Infinity : 0,
              ease: "easeInOut"
            }}
            style={{ willChange: 'transform' }}
          />

          {/* Orb 2 - Green */}
          <motion.circle
            cx="75%"
            cy="75%"
            r="225"
            fill="#10B981"
            opacity="0.25"
            filter="url(#softBlur)"
            animate={{
              cx: ['75%', '73%', '77%', '75%'],
              cy: ['75%', '77%', '73%', '75%'],
              r: [225, 157, 292, 225],
            }}
            transition={{
              duration: 18,
              repeat: isVisible ? Infinity : 0,
              ease: "easeInOut"
            }}
            style={{ willChange: 'transform' }}
          />

          {/* Orb 3 - Purple */}
          <motion.circle
            cx="50%"
            cy="50%"
            r="175"
            fill="#8B5CF6"
            opacity="0.2"
            filter="url(#softBlur)"
            animate={{
              cx: ['50%', '52%', '48%'],
              cy: ['50%', '52%', '48%'],
              r: [140, 210, 140],
            }}
            transition={{
              duration: 22,
              repeat: isVisible ? Infinity : 0,
              ease: "easeInOut"
            }}
            style={{ willChange: 'transform' }}
          />
        </svg>

        {/* Floating particles - reduced count on iPad for performance */}
        {[...Array(typeof navigator !== 'undefined' && /iPad/.test(navigator.userAgent) ? 3 : 8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white opacity-60"
            style={{
              width: Math.random() * 8 + 4,
              height: Math.random() * 8 + 4,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              willChange: 'transform, opacity',
              transform: 'translate3d(0, 0, 0)', // Force GPU layer
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: isVisible ? Infinity : 0,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 sm:space-y-12 md:space-y-16 px-4 sm:px-8 md:px-12 text-center">

        {/* Brand/Logo Area with Animated Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="space-y-2"
        >
          <motion.h2
            className="text-base sm:text-xl md:text-2xl font-semibold text-gray-600"
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
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight"
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
                className="relative text-7xl sm:text-8xl md:text-9xl leading-none"
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
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-black leading-tight max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-3xl px-2"
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
              className="text-lg sm:text-xl md:text-2xl lg:text-[36px] leading-relaxed text-gray-700 font-medium max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl px-2"
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
          className="overflow-hidden w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="flex gap-3 sm:gap-4 md:gap-6"
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
                className="flex items-center gap-2 sm:gap-3 bg-white/80 backdrop-blur-sm px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 flex-shrink-0"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-2xl sm:text-3xl md:text-4xl">{feature.emoji}</span>
                <span className="text-sm sm:text-base md:text-xl font-semibold text-gray-800 whitespace-nowrap">
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
          className="relative mt-6 sm:mt-8 md:mt-12"
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
            className="relative rounded-2xl sm:rounded-3xl bg-white px-6 sm:px-10 md:px-14 py-6 sm:py-8 md:py-10 shadow-2xl border-2"
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
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-bold text-gray-900 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 justify-center">
              <motion.span
                className="text-3xl sm:text-4xl md:text-5xl"
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
                className="text-center sm:text-left"
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
              className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl lg:text-[22px] text-gray-600 font-medium"
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
          className="flex items-center space-x-2 sm:space-x-3 md:space-x-5"
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

              {/* Progress bar - CSS transition for 60fps performance */}
              <div
                className="relative h-3 sm:h-4 md:h-5 rounded-full overflow-hidden shadow-lg"
                style={{
                  width: index === currentIndex ? '60px' : '16px',
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: index === currentIndex ? '#E5E7EB' : '#D1D5DB'
                }}
              >
                {/* Fill - CSS animation for native 60fps */}
                <div
                  key={`progress-${currentIndex}-${index}`}
                  className="absolute inset-0"
                  style={{
                    backgroundColor: index === currentIndex ? msg.color : '#9CA3AF',
                    width: index === currentIndex ? '100%' : index < currentIndex ? '100%' : '0%',
                    transition: index === currentIndex ? 'width 8000ms linear' : 'width 0.3s ease',
                    willChange: 'width'
                  }}
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
