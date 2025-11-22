'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface SimpleDatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function SimpleDatePicker({ value, onChange, minDate, maxDate }: SimpleDatePickerProps) {
  const currentDate = value || new Date();
  const [day, setDay] = useState(currentDate.getDate()); // 1-31 (FIRST - Romanian order)
  const [month, setMonth] = useState(currentDate.getMonth() + 1); // 1-12 (SECOND - as number)
  const [year, setYear] = useState(currentDate.getFullYear()); // (THIRD)

  const daysInMonth = new Date(year, month, 0).getDate();

  const handleDateChange = (newDay: number, newMonth: number, newYear: number) => {
    // Validate day doesn't exceed days in month
    const maxDay = new Date(newYear, newMonth, 0).getDate();
    const validDay = Math.min(newDay, maxDay);

    // JavaScript Date uses 0-indexed months, so subtract 1
    const newDate = new Date(newYear, newMonth - 1, validDay);
    onChange(newDate);
  };

  const incrementDay = () => {
    const newDay = day >= daysInMonth ? 1 : day + 1;
    setDay(newDay);
    handleDateChange(newDay, month, year);
  };

  const decrementDay = () => {
    const newDay = day <= 1 ? daysInMonth : day - 1;
    setDay(newDay);
    handleDateChange(newDay, month, year);
  };

  const incrementMonth = () => {
    const newMonth = month === 12 ? 1 : month + 1;
    setMonth(newMonth);
    handleDateChange(day, newMonth, year);
  };

  const decrementMonth = () => {
    const newMonth = month === 1 ? 12 : month - 1;
    setMonth(newMonth);
    handleDateChange(day, newMonth, year);
  };

  const incrementYear = () => {
    const newYear = year + 1;
    setYear(newYear);
    handleDateChange(day, month, newYear);
  };

  const decrementYear = () => {
    const newYear = year - 1;
    setYear(newYear);
    handleDateChange(day, month, newYear);
  };

  const setDateToMonthsFromNow = (months: number) => {
    const today = new Date();
    const futureDate = new Date(today);

    // Add months to current date
    futureDate.setMonth(futureDate.getMonth() + months);

    const newDay = futureDate.getDate();
    const newMonth = futureDate.getMonth() + 1; // Convert to 1-12
    const newYear = futureDate.getFullYear();

    setDay(newDay);
    setMonth(newMonth);
    setYear(newYear);
    handleDateChange(newDay, newMonth, newYear);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Preview Display */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-3xl border-4 border-blue-100 shadow-lg"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-2xl">⏰</span>
          <p className="text-sm font-bold text-blue-900 uppercase tracking-wider">
            Când îți expiră următorul ITP?
          </p>
        </div>
        <p className="text-3xl font-black text-center text-slate-900">
          {format(new Date(year, month - 1, day), 'dd MMMM yyyy', { locale: ro })}
        </p>
      </motion.div>

      {/* Date Picker Grid - Romanian Order: Ziua → Luna → Anul */}
      <div className="grid grid-cols-3 gap-4">
        {/* DAY Column (FIRST - Romanian order) */}
        <div className="flex flex-col gap-2">
          {/* Label */}
          <div className="bg-slate-100 rounded-xl px-3 py-2 border-2 border-slate-200">
            <p className="text-xs font-bold text-slate-600 uppercase text-center tracking-wider">Ziua</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={incrementDay}
            className="h-14 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronUp className="w-6 h-6 text-slate-600" />
          </motion.button>

          <div className="h-28 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-xl flex items-center justify-center border-4 border-blue-800 relative">
            <motion.span
              key={day}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl font-black text-white"
            >
              {day.toString().padStart(2, '0')}
            </motion.span>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={decrementDay}
            className="h-14 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronDown className="w-6 h-6 text-slate-600" />
          </motion.button>

          <p className="text-xs text-center text-slate-500 font-medium">
            1 - {daysInMonth}
          </p>
        </div>

        {/* MONTH Column (SECOND - as number 1-12) */}
        <div className="flex flex-col gap-2">
          {/* Label */}
          <div className="bg-slate-100 rounded-xl px-3 py-2 border-2 border-slate-200">
            <p className="text-xs font-bold text-slate-600 uppercase text-center tracking-wider">Luna</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={incrementMonth}
            className="h-14 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronUp className="w-6 h-6 text-slate-600" />
          </motion.button>

          <div className="h-28 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-xl flex items-center justify-center border-4 border-blue-800">
            <motion.span
              key={month}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl font-black text-white"
            >
              {month.toString().padStart(2, '0')}
            </motion.span>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={decrementMonth}
            className="h-14 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronDown className="w-6 h-6 text-slate-600" />
          </motion.button>

          <p className="text-xs text-center text-slate-500 font-medium">
            1 - 12
          </p>
        </div>

        {/* YEAR Column (THIRD) */}
        <div className="flex flex-col gap-2">
          {/* Label */}
          <div className="bg-slate-100 rounded-xl px-3 py-2 border-2 border-slate-200">
            <p className="text-xs font-bold text-slate-600 uppercase text-center tracking-wider">Anul</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={incrementYear}
            className="h-14 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronUp className="w-6 h-6 text-slate-600" />
          </motion.button>

          <div className="h-28 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-xl flex items-center justify-center border-4 border-blue-800">
            <motion.span
              key={year}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl font-black text-white"
            >
              {year}
            </motion.span>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={decrementYear}
            className="h-14 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronDown className="w-6 h-6 text-slate-600" />
          </motion.button>

          <p className="text-xs text-center text-slate-500 font-medium">
            2025+
          </p>
        </div>
      </div>

      {/* Preset Date Buttons */}
      <div className="space-y-3">
        <p className="text-center text-sm text-gray-600 font-medium">
          sau alege rapid:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Button 1: 6 months - Taxi/Uber */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setDateToMonthsFromNow(6)}
            className="min-h-[44px] bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span className="text-2xl">🚕</span>
            <div className="text-left">
              <div className="text-sm leading-tight">Taxi/Uber</div>
              <div className="text-xs opacity-90">6 luni</div>
            </div>
          </motion.button>

          {/* Button 2: 1 year - Old vehicles */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setDateToMonthsFromNow(12)}
            className="min-h-[44px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span className="text-2xl">🚙</span>
            <div className="text-left">
              <div className="text-sm leading-tight">Vechicul vechi</div>
              <div className="text-xs opacity-90">1 an</div>
            </div>
          </motion.button>

          {/* Button 3: 2 years - New vehicles */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setDateToMonthsFromNow(24)}
            className="min-h-[44px] bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span className="text-2xl">🚗✨</span>
            <div className="text-left">
              <div className="text-sm leading-tight">Mașină nouă</div>
              <div className="text-xs opacity-90">2 ani</div>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-center text-xs text-slate-500 mt-4">
        Apasă săgețile pentru a ajusta manual
      </p>
    </div>
  );
}
