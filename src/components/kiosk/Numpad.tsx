'use client';

import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

interface NumpadProps {
  onInput: (value: string) => void;
  onDelete: () => void;
}

/**
 * Custom Numpad Component
 *
 * iOS-style numeric keyboard for phone input in kiosk mode.
 * Eliminates native keyboard to maximize viewport usage in landscape mode.
 *
 * Features:
 * - 3x4 grid layout (numbers 1-9, 0, delete)
 * - Physics-based tap animations (scale + background color)
 * - Glassmorphism design (backdrop blur)
 * - Touch-optimized (44x44px minimum)
 */
export function Numpad({ onInput, onDelete }: NumpadProps) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[320px] mx-auto">
      {/* Numbers 1-9 */}
      {numbers.map((num) => (
        <motion.button
          key={num}
          type="button"
          whileTap={{ scale: 0.9, backgroundColor: '#e5e7eb' }}
          onClick={() => onInput(num.toString())}
          className="h-20 text-2xl font-medium bg-white/80 backdrop-blur shadow-sm rounded-xl hover:bg-white/90 transition-colors active:shadow-inner"
          aria-label={`Number ${num}`}
        >
          {num}
        </motion.button>
      ))}

      {/* Bottom row: Empty, 0, Delete */}
      <div className="col-span-1" /> {/* Empty space */}

      <motion.button
        type="button"
        whileTap={{ scale: 0.9, backgroundColor: '#e5e7eb' }}
        onClick={() => onInput('0')}
        className="h-20 text-2xl font-medium bg-white/80 backdrop-blur shadow-sm rounded-xl hover:bg-white/90 transition-colors active:shadow-inner"
        aria-label="Number 0"
      >
        0
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.9, backgroundColor: '#fee2e2' }}
        onClick={onDelete}
        className="h-20 flex items-center justify-center bg-red-50/80 backdrop-blur shadow-sm rounded-xl hover:bg-red-100/90 transition-colors active:shadow-inner"
        aria-label="Delete"
      >
        <Delete className="w-7 h-7 text-red-600" />
      </motion.button>
    </div>
  );
}
