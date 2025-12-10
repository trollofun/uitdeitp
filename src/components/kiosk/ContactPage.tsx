'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

interface ContactPageProps {
  onNext: (data: { name: string; phone: string }) => void;
  onBack: () => void;
}

const formatPhone = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  return clean.slice(0, 10);
};

const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  if (phone.length !== 10) return { valid: false, error: 'Trebuie 10 cifre' };
  if (!phone.startsWith('07')) return { valid: false, error: 'Trebuie să înceapă cu 07' };
  return { valid: true };
};

export default function ContactPage({ onNext, onBack }: ContactPageProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.length > 0 && value.length < 2) {
      setNameError('Nume prea scurt');
    } else {
      setNameError('');
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setPhone(formatted);

    if (formatted.length > 0) {
      const validation = validatePhone(formatted);
      setPhoneError(validation.error || '');
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async () => {
    if (name.length < 2) {
      setNameError('Introdu numele');
      return;
    }

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      setPhoneError(phoneValidation.error || 'Telefon invalid');
      return;
    }

    onNext({ name, phone });
  };

  const isFormValid = () => {
    return (
      name.length >= 2 &&
      validatePhone(phone).valid &&
      !nameError &&
      !phoneError
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-10"
    >
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-16 space-y-12">
        {/* Progress */}
        <div className="text-gray-500 text-sm font-medium">Pas 2 din 3</div>

        {/* Title */}
        <h1 className="text-5xl font-bold text-gray-900 leading-tight">
          Unde trimitem notificarea?
        </h1>

        {/* Name */}
        <div className="space-y-4">
          <label className="block text-2xl font-medium text-gray-700">
            Numele tău
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ion Popescu"
            className="h-20 text-3xl px-6 border-2 focus:border-blue-600 rounded-2xl"
            autoFocus
          />
          {nameError && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-lg">{nameError}</span>
            </div>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-4">
          <label className="block text-2xl font-medium text-gray-700">
            Telefon
          </label>
          <div className="relative">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl text-gray-400">
              +40
            </div>
            <Input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="712 345 678"
              className="h-20 text-3xl pl-24 pr-6 border-2 focus:border-blue-600 rounded-2xl"
              maxLength={10}
            />
          </div>
          {phoneError && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-lg">{phoneError}</span>
            </div>
          )}
        </div>

        {/* Info Message */}
        <div className="flex items-center gap-3 p-6 bg-blue-50 rounded-2xl">
          <span className="text-4xl">💬</span>
          <p className="text-xl text-gray-700">
            Primești SMS în 5 secunde
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 h-20 rounded-2xl text-2xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
          >
            Înapoi
          </motion.button>
          <motion.button
            onClick={handleSubmit}
            disabled={!isFormValid()}
            whileHover={{ scale: isFormValid() ? 1.02 : 1 }}
            whileTap={{ scale: isFormValid() ? 0.98 : 1 }}
            className={`flex-[2] h-20 rounded-2xl text-2xl font-bold transition-all ${
              isFormValid()
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Trimite codul
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
