'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

interface VehiclePageProps {
  onNext: (data: { plateNumber: string; expiryDate: { day: string; month: string; year: string } }) => void;
}

const formatPlateNumber = (value: string): string => {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
};

const validatePlate = (plate: string): boolean => {
  const plateWithDashes = /^[A-Z]{1,2}-\d{2,3}-[A-Z]{2,3}$/;
  const plateWithoutDashes = /^[A-Z]{1,2}\d{2,3}[A-Z]{2,3}$/;
  return plateWithDashes.test(plate) || plateWithoutDashes.test(plate);
};

export default function VehiclePage({ onNext }: VehiclePageProps) {
  const [plateNumber, setPlateNumber] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [plateError, setPlateError] = useState('');
  const [dateError, setDateError] = useState('');

  const handlePlateChange = (value: string) => {
    const formatted = formatPlateNumber(value);
    setPlateNumber(formatted);
    if (formatted.length > 0 && !validatePlate(formatted) && formatted.length >= 5) {
      setPlateError('Format invalid');
    } else {
      setPlateError('');
    }
  };

  const handleDayChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 2);
    setDay(clean);
    setDateError('');
  };

  const handleMonthChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 2);
    setMonth(clean);
    setDateError('');
  };

  const handleYearChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    setYear(clean);
    setDateError('');
  };

  const validateDate = (): boolean => {
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!dayNum || !monthNum || !yearNum) {
      setDateError('Completează data');
      return false;
    }

    if (monthNum < 1 || monthNum > 12) {
      setDateError('Luna invalidă');
      return false;
    }

    if (dayNum < 1 || dayNum > 31) {
      setDateError('Zi invalidă');
      return false;
    }

    const inputDate = new Date(yearNum, monthNum - 1, dayNum);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (inputDate <= today) {
      setDateError('Data trebuie în viitor');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validatePlate(plateNumber)) {
      setPlateError('Format invalid');
      return;
    }

    if (!validateDate()) {
      return;
    }

    onNext({
      plateNumber,
      expiryDate: { day, month, year },
    });
  };

  const isFormValid = () => {
    return (
      validatePlate(plateNumber) &&
      day.length === 2 &&
      month.length === 2 &&
      year.length === 4 &&
      !plateError &&
      !dateError
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-10"
    >
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-16 space-y-12">
        {/* Progress */}
        <div className="text-gray-500 text-sm font-medium">Pas 1 din 3</div>

        {/* Title */}
        <h1 className="text-5xl font-bold text-gray-900 leading-tight">
          Începem cu mașina ta
        </h1>

        {/* Plate Number */}
        <div className="space-y-4">
          <label className="block text-2xl font-medium text-gray-700">
            Număr înmatriculare
          </label>
          <Input
            type="text"
            value={plateNumber}
            onChange={(e) => handlePlateChange(e.target.value)}
            placeholder="B 123 ABC"
            className="h-20 text-3xl text-center font-bold tracking-widest border-2 focus:border-blue-600 rounded-2xl"
            maxLength={10}
            autoFocus
          />
          {plateError && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-lg">{plateError}</span>
            </div>
          )}
        </div>

        {/* Expiry Date */}
        <div className="space-y-4">
          <label className="block text-2xl font-medium text-gray-700">
            Când expiră ITP-ul?
          </label>
          <div className="flex gap-4">
            <Input
              type="text"
              inputMode="numeric"
              value={day}
              onChange={(e) => handleDayChange(e.target.value)}
              placeholder="DD"
              className="h-20 text-3xl text-center font-bold border-2 focus:border-blue-600 rounded-2xl flex-1"
              maxLength={2}
            />
            <Input
              type="text"
              inputMode="numeric"
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              placeholder="MM"
              className="h-20 text-3xl text-center font-bold border-2 focus:border-blue-600 rounded-2xl flex-1"
              maxLength={2}
            />
            <Input
              type="text"
              inputMode="numeric"
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              placeholder="YYYY"
              className="h-20 text-3xl text-center font-bold border-2 focus:border-blue-600 rounded-2xl flex-[2]"
              maxLength={4}
            />
          </div>
          {dateError && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-lg">{dateError}</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <motion.button
          onClick={handleSubmit}
          disabled={!isFormValid()}
          whileHover={{ scale: isFormValid() ? 1.02 : 1 }}
          whileTap={{ scale: isFormValid() ? 0.98 : 1 }}
          className={`w-full h-20 rounded-2xl text-2xl font-bold transition-all ${
            isFormValid()
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continuă
        </motion.button>
      </div>
    </motion.div>
  );
}
