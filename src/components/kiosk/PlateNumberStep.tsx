'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Car, AlertCircle } from 'lucide-react';

interface PlateNumberStepProps {
  onNext: (plateNumber: string) => void;
  onBack: () => void;
}

export function PlateNumberStep({ onNext, onBack }: PlateNumberStepProps) {
  const [plate, setPlate] = useState('');
  const [error, setError] = useState('');

  const formatPlate = (value: string): string => {
    // Remove all non-alphanumeric characters
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Format as XX-123-ABC or similar Romanian formats
    if (clean.length <= 2) return clean;
    if (clean.length <= 5) return `${clean.slice(0, 2)}-${clean.slice(2)}`;
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 8)}`;
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlate(e.target.value);
    setPlate(formatted);
    setError('');
  };

  const validatePlate = (plateNumber: string): boolean => {
    // Romanian plate format: XX-123-ABC (2 letters, 2-3 digits, 3 letters)
    const plateRegex = /^[A-Z]{1,2}-\d{2,3}-[A-Z]{3}$/;
    return plateRegex.test(plateNumber);
  };

  const handleSubmit = () => {
    if (!validatePlate(plate)) {
      setError('Format invalid. Exemplu: B-123-ABC sau BV-12-XYZ');
      return;
    }
    onNext(plate);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && validatePlate(plate)) {
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Car className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Număr de Înmatriculare</h2>
        <p className="text-muted-foreground">
          Introdu numărul de înmatriculare al vehiculului tău
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="plate" className="text-sm font-medium">
          Număr de înmatriculare
        </label>
        <Input
          id="plate"
          type="text"
          placeholder="B-123-ABC"
          value={plate}
          onChange={handlePlateChange}
          onKeyPress={handleKeyPress}
          className="text-2xl h-16 text-center font-mono uppercase"
          maxLength={11}
          autoFocus
        />
        <p className="text-xs text-muted-foreground text-center">
          Format: B-123-ABC sau BV-12-XYZ
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
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
          disabled={!validatePlate(plate)}
          className="flex-1 h-14"
        >
          Continuă
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Pasul 2 din 5</p>
      </div>
    </motion.div>
  );
}
