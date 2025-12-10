'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Car, Calendar, Phone, AlertCircle, ChevronRight } from 'lucide-react';

interface VehicleDataStepProps {
  onNext: (data: {
    plateNumber: string;
    expiryDate: string;
    phone: string;
    smsConsent: boolean;
    gdprConsent: boolean;
  }) => void;
  onBack: () => void;
}

const formatPlateNumber = (value: string): string => {
  // Accept both formats: with dashes (B-123-ABC) or without (CT90BTC)
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
};

const formatDate = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 4)}.${clean.slice(4, 8)}`;
};

const formatPhone = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  return clean.slice(0, 10);
};

const validatePlate = (plate: string): boolean => {
  // Format with dashes: B-123-ABC, CT-90-BTC
  const plateWithDashes = /^[A-Z]{1,2}-\d{2,3}-[A-Z]{2,3}$/;
  // Format without dashes: CT90BTC, B123ABC
  const plateWithoutDashes = /^[A-Z]{1,2}\d{2,3}[A-Z]{2,3}$/;

  return plateWithDashes.test(plate) || plateWithoutDashes.test(plate);
};

const validateDate = (date: string): { valid: boolean; error?: string } => {
  const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  const match = date.match(dateRegex);

  if (!match) return { valid: false, error: 'Format invalid (DD.MM.YYYY)' };

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return { valid: false, error: 'Luna invalidă' };
  if (day < 1 || day > 31) return { valid: false, error: 'Zi invalidă' };

  const inputDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inputDate <= today) return { valid: false, error: 'Data trebuie să fie în viitor' };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 5);
  if (inputDate > maxDate) return { valid: false, error: 'Data prea departe (max 5 ani)' };

  return { valid: true };
};

const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  if (phone.length !== 10) return { valid: false, error: 'Trebuie să aibă 10 cifre' };
  if (!phone.startsWith('07')) return { valid: false, error: 'Trebuie să înceapă cu 07' };
  return { valid: true };
};

export default function VehicleDataStep({ onNext, onBack }: VehicleDataStepProps) {
  const [plateNumber, setPlateNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [phone, setPhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);

  const [plateError, setPlateError] = useState('');
  const [dateError, setDateError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handlePlateChange = (value: string) => {
    const formatted = formatPlateNumber(value);
    setPlateNumber(formatted);

    if (formatted.length > 0) {
      if (!validatePlate(formatted) && formatted.length >= 5) {
        setPlateError('Format invalid (ex: B-123-ABC sau CT90BTC)');
      } else {
        setPlateError('');
      }
    } else {
      setPlateError('');
    }
  };

  const handleDateChange = (value: string) => {
    const formatted = formatDate(value);
    setExpiryDate(formatted);

    if (formatted.length === 10) {
      const validation = validateDate(formatted);
      setDateError(validation.error || '');
    } else {
      setDateError('');
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

  const isFormValid = () => {
    return (
      validatePlate(plateNumber) &&
      validateDate(expiryDate).valid &&
      validatePhone(phone).valid &&
      smsConsent &&
      gdprConsent &&
      !plateError &&
      !dateError &&
      !phoneError
    );
  };

  const handleSubmit = () => {
    if (isFormValid()) {
      onNext({
        plateNumber,
        expiryDate,
        phone,
        smsConsent,
        gdprConsent,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-8"
    >
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-12">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-block p-4 bg-blue-100 rounded-full mb-4"
          >
            <Car className="w-12 h-12 text-blue-600" />
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Date Vehicul și Contact
          </h2>
          <p className="text-gray-600">
            Completează informațiile pentru a primi notificări
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Plate Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Număr de Înmatriculare
            </label>
            <Input
              type="text"
              value={plateNumber}
              onChange={(e) => handlePlateChange(e.target.value)}
              placeholder="B-123-ABC sau CT90BTC"
              className={`text-xl py-6 text-center tracking-wider ${
                plateError ? 'border-red-500' : ''
              }`}
              maxLength={10}
            />
            {plateError && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{plateError}</span>
              </div>
            )}
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Data Expirării Asigurării
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                value={expiryDate}
                onChange={(e) => handleDateChange(e.target.value)}
                placeholder="DD.MM.YYYY"
                className={`text-xl py-6 pl-12 ${
                  dateError ? 'border-red-500' : ''
                }`}
                maxLength={10}
              />
            </div>
            {dateError && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{dateError}</span>
              </div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Număr de Telefon
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="0712345678"
                className={`text-xl py-6 pl-12 ${
                  phoneError ? 'border-red-500' : ''
                }`}
                maxLength={10}
              />
            </div>
            {phoneError && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{phoneError}</span>
              </div>
            )}
          </div>

          {/* Consents */}
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="sms-consent"
                checked={smsConsent}
                onCheckedChange={(checked) => setSmsConsent(checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="sms-consent" className="text-sm text-gray-700 cursor-pointer">
                Accept primirea de notificări SMS pentru expirarea asigurării RCA
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="gdpr-consent"
                checked={gdprConsent}
                onCheckedChange={(checked) => setGdprConsent(checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="gdpr-consent" className="text-sm text-gray-700 cursor-pointer">
                Am citit și accept{' '}
                <a href="/terms" className="text-blue-600 hover:underline">
                  Termenii și Condițiile
                </a>{' '}
                și{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Politica de Confidențialitate
                </a>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-10">
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="flex-1 py-6 text-lg"
          >
            Înapoi
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid()}
            size="lg"
            className="flex-1 py-6 text-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuă
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* Progress */}
        <div className="mt-8 flex justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600" />
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <div className="w-3 h-3 rounded-full bg-gray-300" />
        </div>
      </div>
    </motion.div>
  );
}
