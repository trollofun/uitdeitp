'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Car, Calendar, Phone, Hash, Users, TrendingUp, Shield } from 'lucide-react';

interface SuccessStepProps {
  confirmationCode: string;
  plateNumber: string;
  expiryDate: string;
  phone: string;
  onAddAnother: () => void;
}

export default function SuccessStep({
  confirmationCode,
  plateNumber,
  expiryDate,
  phone,
  onAddAnother,
}: SuccessStepProps) {
  const [autoResetTime, setAutoResetTime] = useState(45);

  useEffect(() => {
    // Auto-reset countdown
    if (autoResetTime > 0) {
      const timer = setTimeout(() => setAutoResetTime(autoResetTime - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onAddAnother();
    }
  }, [autoResetTime, onAddAnother]);

  // Confetti animation
  const confettiColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-8 relative overflow-hidden"
    >
      {/* Confetti Animation */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * window.innerWidth,
            y: -20,
            rotate: 0,
          }}
          animate={{
            y: window.innerHeight + 20,
            rotate: 360,
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            ease: 'linear',
          }}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: confettiColors[i % confettiColors.length],
          }}
        />
      ))}

      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-12 relative z-10">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="p-6 bg-green-100 rounded-full">
            <CheckCircle className="w-20 h-20 text-green-600" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Înregistrare Finalizată!
          </h2>
          <p className="text-xl text-gray-600">
            Vei primi notificare SMS cu 30 de zile înainte de expirare
          </p>
        </motion.div>

        {/* Confirmation Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-50 rounded-2xl p-6 mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Hash className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-semibold text-blue-900">Cod Confirmare</p>
          </div>
          <p className="text-3xl font-bold text-blue-600 tracking-wider">
            {confirmationCode}
          </p>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4 mb-8"
        >
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Număr Înmatriculare</p>
              <p className="text-lg font-semibold text-gray-900">{plateNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Data Expirării</p>
              <p className="text-lg font-semibold text-gray-900">{expiryDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Număr Telefon</p>
              <p className="text-lg font-semibold text-gray-900">{phone}</p>
            </div>
          </div>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8"
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">25.000+</p>
              <p className="text-sm text-gray-600">Utilizatori activi</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">98%</p>
              <p className="text-sm text-gray-600">Rată de succes</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">100%</p>
              <p className="text-sm text-gray-600">Securitate date</p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            onClick={onAddAnother}
            size="lg"
            className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700"
          >
            Adaugă Alt Vehicul
          </Button>
        </motion.div>

        {/* Auto-reset Timer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-6"
        >
          <p className="text-sm text-gray-500">
            Revenire automată în{' '}
            <span className="font-semibold text-gray-700">{autoResetTime}s</span>
          </p>
          <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 45, ease: 'linear' }}
              className="h-full bg-blue-600"
            />
          </div>
        </motion.div>

        {/* Progress */}
        <div className="mt-8 flex justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600" />
          <div className="w-3 h-3 rounded-full bg-blue-600" />
          <div className="w-3 h-3 rounded-full bg-blue-600" />
        </div>
      </div>
    </motion.div>
  );
}
