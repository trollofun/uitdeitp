'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { format, addMonths, addDays, addYears } from 'date-fns';
import { ro } from 'date-fns/locale';

interface SimpleDatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

const MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

export function SimpleDatePicker({ value, onChange, minDate, maxDate }: SimpleDatePickerProps) {
  const currentDate = value || new Date();
  const [month, setMonth] = useState(currentDate.getMonth()); // 0-11
  const [day, setDay] = useState(currentDate.getDate()); // 1-31
  const [year, setYear] = useState(currentDate.getFullYear());

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handleDateChange = (newMonth: number, newDay: number, newYear: number) => {
    // Validate day doesn't exceed days in month
    const maxDay = new Date(newYear, newMonth + 1, 0).getDate();
    const validDay = Math.min(newDay, maxDay);

    const newDate = new Date(newYear, newMonth, validDay);
    onChange(newDate);
  };

  const incrementMonth = () => {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    handleDateChange(newMonth, day, newYear);
  };

  const decrementMonth = () => {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    handleDateChange(newMonth, day, newYear);
  };

  const incrementDay = () => {
    const newDay = day >= daysInMonth ? 1 : day + 1;
    setDay(newDay);
    handleDateChange(month, newDay, year);
  };

  const decrementDay = () => {
    const newDay = day <= 1 ? daysInMonth : day - 1;
    setDay(newDay);
    handleDateChange(month, newDay, year);
  };

  const incrementYear = () => {
    const newYear = year + 1;
    setYear(newYear);
    handleDateChange(month, day, newYear);
  };

  const decrementYear = () => {
    const newYear = year - 1;
    setYear(newYear);
    handleDateChange(month, day, newYear);
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
          <Calendar className="w-6 h-6 text-blue-600" />
          <p className="text-sm font-bold text-blue-900 uppercase tracking-wider">
            Data Expirării ITP
          </p>
        </div>
        <p className="text-3xl font-black text-center text-slate-900">
          {format(new Date(year, month, day), 'dd MMMM yyyy', { locale: ro })}
        </p>
      </motion.div>

      {/* Date Picker Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Month Column */}
        <div className="flex flex-col gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={incrementMonth}
            className="h-16 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronUp className="w-6 h-6 text-slate-600" />
          </motion.button>

          <div className="h-32 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl flex items-center justify-center border-4 border-blue-800">
            <motion.span
              key={month}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-2xl font-black text-white text-center px-2"
            >
              {MONTHS[month]}
            </motion.span>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={decrementMonth}
            className="h-16 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronDown className="w-6 h-6 text-slate-600" />
          </motion.button>
        </div>

        {/* Day Column */}
        <div className="flex flex-col gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={incrementDay}
            className="h-16 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronUp className="w-6 h-6 text-slate-600" />
          </motion.button>

          <div className="h-32 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl flex items-center justify-center border-4 border-blue-800">
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
            className="h-16 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronDown className="w-6 h-6 text-slate-600" />
          </motion.button>

          <p className="text-xs text-center text-slate-500 mt-1">
            (1 - {daysInMonth})
          </p>
        </div>

        {/* Year Column */}
        <div className="flex flex-col gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={incrementYear}
            className="h-16 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronUp className="w-6 h-6 text-slate-600" />
          </motion.button>

          <div className="h-32 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl flex items-center justify-center border-4 border-blue-800">
            <motion.span
              key={year}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-4xl font-black text-white"
            >
              {year}
            </motion.span>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={decrementYear}
            className="h-16 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center"
          >
            <ChevronDown className="w-6 h-6 text-slate-600" />
          </motion.button>
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-center text-sm text-slate-500">
        Apasă săgețile pentru a ajusta data
      </p>
    </div>
  );
}
