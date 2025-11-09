'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SuccessPageProps {
  plateNumber: string;
  expiryDate: { day: string; month: string; year: string };
  onComplete: () => void;
}

export default function SuccessPage({ plateNumber, expiryDate, onComplete }: SuccessPageProps) {
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [countdown, onComplete]);

  const formatDate = (date: { day: string; month: string; year: string }): string => {
    const months = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ];
    const monthIndex = parseInt(date.month, 10) - 1;
    return `${date.day} ${months[monthIndex]} ${date.year}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-10"
    >
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-16 text-center space-y-12">
        {/* Animated Checkmark */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 10,
            delay: 0.2
          }}
          className="text-9xl text-green-600"
        >
          ✓
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-5xl font-bold text-gray-900"
        >
          Ești înregistrat!
        </motion.h1>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6 text-2xl text-gray-700"
        >
          <p>Vei primi notificare SMS</p>
          <p>cu 5 zile înainte de</p>

          {/* ITP Date - highlighted */}
          <motion.p
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 150 }}
            className="text-4xl font-bold text-blue-600 py-4"
          >
            {formatDate(expiryDate)}
          </motion.p>

          <p>pentru mașina</p>

          {/* Plate Number - highlighted */}
          <motion.p
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9, type: 'spring', stiffness: 150 }}
            className="text-4xl font-bold text-gray-900 tracking-wider py-4"
          >
            {plateNumber}
          </motion.p>
        </motion.div>

        {/* Auto-close countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="space-y-4"
        >
          <p className="text-xl text-gray-500">
            Auto-închidere în {countdown}s
          </p>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 8, ease: 'linear' }}
              className="h-full bg-blue-600"
            />
          </div>
        </motion.div>

        {/* Optional: Touch to restart immediately */}
        <motion.button
          onClick={onComplete}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-lg text-gray-400 hover:text-gray-600 underline"
        >
          Sau atinge pentru următorul client
        </motion.button>
      </div>
    </motion.div>
  );
}
