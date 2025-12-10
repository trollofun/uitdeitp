'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Calendar, AlertCircle } from 'lucide-react';
import { format, parse, isAfter, isBefore, addYears } from 'date-fns';
import { ro } from 'date-fns/locale';

interface ExpiryDateStepProps {
  onNext: (expiryDate: Date) => void;
  onBack: () => void;
}

export function ExpiryDateStep({ onNext, onBack }: ExpiryDateStepProps) {
  const [dateInput, setDateInput] = useState('');
  const [error, setError] = useState('');

  const formatDateInput = (value: string): string => {
    // Remove all non-numeric characters
    const clean = value.replace(/\D/g, '');

    // Format as DD.MM.YYYY
    if (clean.length <= 2) return clean;
    if (clean.length <= 4) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
    return `${clean.slice(0, 2)}.${clean.slice(2, 4)}.${clean.slice(4, 8)}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setDateInput(formatted);
    setError('');
  };

  const validateDate = (dateStr: string): Date | null => {
    if (dateStr.length !== 10) return null;

    try {
      const date = parse(dateStr, 'dd.MM.yyyy', new Date());

      // Check if date is valid
      if (isNaN(date.getTime())) {
        setError('Data invalidă');
        return null;
      }

      const today = new Date();
      const maxDate = addYears(today, 5);

      // Date must be in the future
      if (!isAfter(date, today)) {
        setError('Data expirării trebuie să fie în viitor');
        return null;
      }

      // Date should not be more than 5 years in the future
      if (isAfter(date, maxDate)) {
        setError('Data nu poate fi mai mult de 5 ani în viitor');
        return null;
      }

      return date;
    } catch (err) {
      setError('Format invalid. Folosește DD.MM.YYYY');
      return null;
    }
  };

  const handleSubmit = () => {
    const validDate = validateDate(dateInput);
    if (validDate) {
      onNext(validDate);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && dateInput.length === 10) {
      handleSubmit();
    }
  };

  const isValidInput = dateInput.length === 10 && validateDate(dateInput) !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Data Expirării ITP</h2>
        <p className="text-muted-foreground">
          Când expiră ITP-ul actual al vehiculului?
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="expiry-date" className="text-sm font-medium">
          Data expirării
        </label>
        <Input
          id="expiry-date"
          type="text"
          placeholder="DD.MM.YYYY"
          value={dateInput}
          onChange={handleDateChange}
          onKeyPress={handleKeyPress}
          className="text-2xl h-16 text-center font-mono"
          maxLength={10}
          autoFocus
        />
        <p className="text-xs text-muted-foreground text-center">
          Format: ZZ.LL.AAAA (exemplu: 15.06.2025)
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {isValidInput && (
        <div className="p-4 bg-primary/10 text-primary rounded-lg">
          <p className="text-sm text-center">
            Vei primi un reminder cu{' '}
            <strong>30 de zile</strong> înainte de expirare
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 h-14"
        >
          Înapoi
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValidInput}
          className="flex-1 h-14"
        >
          Continuă
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Pasul 3 din 5</p>
      </div>
    </motion.div>
  );
}
