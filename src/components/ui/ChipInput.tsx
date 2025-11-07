'use client';

import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Badge } from './Badge';
import { cn } from '@/lib/utils';

interface ChipInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  maxValues?: number;
  validator?: (value: string) => boolean;
  formatter?: (value: string) => string;
}

export function ChipInput({
  values,
  onChange,
  placeholder = 'Adaugă valoare...',
  className,
  maxValues,
  validator,
  formatter,
}: ChipInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addValue = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Check max values
    if (maxValues && values.length >= maxValues) {
      setError(`Maximum ${maxValues} valori`);
      return;
    }

    // Validate
    if (validator && !validator(trimmed)) {
      setError('Valoare invalidă');
      return;
    }

    // Check duplicates
    if (values.includes(trimmed)) {
      setError('Valoarea există deja');
      return;
    }

    // Format and add
    const formatted = formatter ? formatter(trimmed) : trimmed;
    onChange([...values, formatted]);
    setInputValue('');
    setError(null);
  };

  const removeValue = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValue();
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      removeValue(values.length - 1);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] focus-within:ring-2 focus-within:ring-ring">
        {values.map((value, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="gap-1 pr-1 text-sm"
          >
            {value}
            <button
              type="button"
              onClick={() => removeValue(index)}
              className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label={`Șterge ${value}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={addValue}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] border-0 focus-visible:ring-0 p-0 h-6"
          disabled={maxValues ? values.length >= maxValues : false}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
