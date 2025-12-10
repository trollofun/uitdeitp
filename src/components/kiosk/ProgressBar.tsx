'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface ProgressBarProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function ProgressBar({ steps, currentStep, className }: ProgressBarProps) {
  return (
    <div className={cn('w-full py-8', className)}>
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-200 -translate-y-1/2 -z-10">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-in-out"
            style={{
              width: `${(currentStep / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isFuture = index > currentStep;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center relative"
              style={{ width: `${100 / steps.length}%` }}
            >
              {/* Step Circle */}
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-300 shadow-lg',
                  {
                    'bg-blue-600 text-white': isCurrent,
                    'bg-green-600 text-white': isCompleted,
                    'bg-gray-200 text-gray-400': isFuture,
                  }
                )}
              >
                {isCompleted ? <Check className="w-8 h-8" /> : index + 1}
              </div>

              {/* Step Label */}
              <div className="mt-3 text-center">
                <p
                  className={cn('text-lg font-semibold', {
                    'text-blue-600': isCurrent,
                    'text-green-600': isCompleted,
                    'text-gray-400': isFuture,
                  })}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
