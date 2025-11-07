'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TouchKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onEnter?: () => void;
  type?: 'alphanumeric' | 'numeric' | 'plate';
  className?: string;
}

export function TouchKeyboard({
  onKeyPress,
  onBackspace,
  onClear,
  onEnter,
  type = 'alphanumeric',
  className,
}: TouchKeyboardProps) {
  const plateLayout = [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
    ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
    ['V', 'W', 'X', 'Y', 'Z', '0', '1'],
    ['2', '3', '4', '5', '6', '7', '8', '9'],
  ];

  const numericLayout = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['0'],
  ];

  const layout = type === 'numeric' ? numericLayout : plateLayout;

  return (
    <div className={cn('bg-white rounded-2xl shadow-xl p-6', className)}>
      <div className="space-y-3">
        {layout.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-3 justify-center">
            {row.map((key) => (
              <Button
                key={key}
                onClick={() => onKeyPress(key)}
                className="h-16 min-w-[64px] text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-transform"
                variant="outline"
              >
                {key}
              </Button>
            ))}
          </div>
        ))}

        <div className="flex gap-3 justify-center mt-6">
          <Button
            onClick={onClear}
            className="h-16 px-8 text-xl font-semibold rounded-xl shadow-md active:scale-95 transition-transform"
            variant="destructive"
          >
            Șterge Tot
          </Button>
          <Button
            onClick={onBackspace}
            className="h-16 px-8 text-xl font-semibold rounded-xl shadow-md active:scale-95 transition-transform"
            variant="secondary"
          >
            ← Șterge
          </Button>
          {onEnter && (
            <Button
              onClick={onEnter}
              className="h-16 px-8 text-xl font-semibold rounded-xl shadow-md active:scale-95 transition-transform"
            >
              Continuă →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
