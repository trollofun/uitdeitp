'use client';

import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

interface PlateKeyboardProps {
  onInput: (value: string) => void;
  onDelete: () => void;
}

/**
 * Custom Plate Keyboard Component
 *
 * QWERTY-style keyboard for license plate input in kiosk mode.
 * Optimized for Romanian plate format (e.g., B-123-ABC).
 *
 * Features:
 * - 4-row QWERTY layout (numbers + letters)
 * - Physics-based tap animations
 * - Touch-optimized button sizes
 * - Glassmorphism design
 */
export function PlateKeyboard({ onInput, onDelete }: PlateKeyboardProps) {
  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ];

  return (
    <div className="flex flex-col gap-2 w-full max-w-[600px] mx-auto">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-2">
          {row.map((key) => (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.85, backgroundColor: '#d1d5db' }}
              onClick={() => onInput(key)}
              className="w-10 h-12 sm:w-12 sm:h-14 text-xl font-semibold bg-white shadow-md rounded-lg hover:bg-gray-50 transition-colors active:shadow-inner"
              aria-label={`Key ${key}`}
            >
              {key}
            </motion.button>
          ))}

          {/* Add delete button on last row */}
          {rowIndex === rows.length - 1 && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.85, backgroundColor: '#fecaca' }}
              onClick={onDelete}
              className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-red-50 shadow-md rounded-lg hover:bg-red-100 transition-colors active:shadow-inner"
              aria-label="Delete"
            >
              <Delete className="w-5 h-5 text-red-600" />
            </motion.button>
          )}
        </div>
      ))}
    </div>
  );
}
