'use client';

/**
 * Kiosk Step Indicator
 *
 * Visual progress dots for 7-step workflow
 */

import { motion } from 'framer-motion';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  primaryColor?: string;
}

export function StepIndicator({
  currentStep,
  totalSteps,
  primaryColor = '#2563eb'
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <motion.div
            key={step}
            className="relative"
            initial={false}
            animate={{
              scale: isActive ? 1.2 : 1
            }}
            transition={{ duration: 0.3 }}
          >
            <div
              className={`
                w-3 h-3 rounded-full transition-all duration-300
                ${isActive ? 'ring-4 ring-opacity-30' : ''}
                ${isCompleted ? 'opacity-60' : ''}
              `}
              style={{
                backgroundColor: isActive || isCompleted ? primaryColor : '#d1d5db',
                ...(isActive && {
                  boxShadow: `0 0 0 4px ${primaryColor}30`
                })
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
