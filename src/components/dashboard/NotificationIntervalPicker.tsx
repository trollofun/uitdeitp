'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/Card';
import { Bell, AlertCircle } from 'lucide-react';

/**
 * NotificationIntervalPicker Component
 *
 * Allows users to select notification intervals (1, 5, 14 days before expiry)
 * with max 3 selections constraint.
 *
 * Gestalt Principles Applied:
 * - Similarity: Consistent checkbox design
 * - Proximity: Related checkboxes grouped together
 * - Figure-ground: Selected items highlighted
 * - Feedback: Visual indication of selection limit (X/3 notificări)
 *
 * Props:
 * - selectedIntervals: number[] - Currently selected intervals
 * - onChange: (intervals: number[]) => void - Callback when selection changes
 * - maxSelections: number - Maximum allowed selections (default: 3)
 * - disabled: boolean - Disable all checkboxes
 */

interface NotificationIntervalPickerProps {
  selectedIntervals: number[];
  onChange: (intervals: number[]) => void;
  maxSelections?: number;
  disabled?: boolean;
}

const AVAILABLE_INTERVALS = [
  {
    days: 1,
    label: '1 zi înainte',
    description: 'URGENT: Notification pe ultima zi',
    color: 'text-red-600',
    icon: '🚨',
  },
  {
    days: 5,
    label: '5 zile înainte',
    description: 'RECOMANDAT: Timp suficient să programezi',
    color: 'text-orange-600',
    icon: '⚠️',
  },
  {
    days: 14,
    label: '14 zile înainte',
    description: 'EARLY: Reminder timpuriu pentru planificare',
    color: 'text-blue-600',
    icon: '📅',
  },
];

export function NotificationIntervalPicker({
  selectedIntervals = [5], // Default: 5 days
  onChange,
  maxSelections = 3,
  disabled = false,
}: NotificationIntervalPickerProps) {
  const [selected, setSelected] = useState<number[]>(selectedIntervals);

  // Sync with parent component
  useEffect(() => {
    setSelected(selectedIntervals);
  }, [selectedIntervals]);

  /**
   * Handle checkbox toggle
   */
  function handleToggle(days: number) {
    let newSelection: number[];

    if (selected.includes(days)) {
      // Uncheck: Remove from selection
      newSelection = selected.filter((d) => d !== days);

      // Ensure at least 1 interval is selected
      if (newSelection.length === 0) {
        return; // Don't allow unchecking last item
      }
    } else {
      // Check: Add to selection
      if (selected.length >= maxSelections) {
        return; // Max limit reached
      }
      newSelection = [...selected, days].sort((a, b) => b - a); // Sort descending
    }

    setSelected(newSelection);
    onChange(newSelection);
  }

  /**
   * Check if interval can be selected
   */
  function canSelect(days: number): boolean {
    if (selected.includes(days)) {
      return true; // Already selected, can uncheck (unless it's the last one)
    }
    return selected.length < maxSelections; // Can select if under limit
  }

  const selectionCount = selected.length;
  const limitReached = selectionCount >= maxSelections;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Intervale de Notificare
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Când vrei să primești reminder-e înainte de expirare?
            </p>
          </div>

          {/* Selection Counter */}
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
            limitReached
              ? 'bg-orange-100 text-orange-700'
              : 'bg-primary/10 text-primary'
          }`}>
            <Bell className="w-4 h-4" />
            <span>{selectionCount}/{maxSelections}</span>
          </div>
        </div>

        {/* Interval Options */}
        <div className="space-y-3">
          {AVAILABLE_INTERVALS.map((interval) => {
            const isSelected = selected.includes(interval.days);
            const isDisabled = disabled || (!isSelected && !canSelect(interval.days));
            const isLastSelected = isSelected && selected.length === 1;

            return (
              <label
                key={interval.days}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${
                  isDisabled && !isSelected
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                } ${
                  isLastSelected
                    ? 'ring-2 ring-orange-200'
                    : ''
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(interval.days)}
                  disabled={isDisabled || isLastSelected}
                  className="mt-0.5"
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{interval.icon}</span>
                    <span className="font-medium">{interval.label}</span>
                    {interval.days === 5 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${interval.color} mt-1`}>
                    {interval.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Info Messages */}
        <div className="space-y-2 pt-2">
          {limitReached && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="text-sm text-orange-900">
                <strong>Limită atinsă:</strong> Maxim {maxSelections} notificări per vehicul.
                Debifează o opțiune pentru a selecta alta.
              </div>
            </div>
          )}

          {selected.length === 1 && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                Trebuie să ai cel puțin 1 interval selectat. Nu poți dezactiva toate notificările.
              </div>
            </div>
          )}

          {selected.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <strong>Vei primi {selected.length} notificări:</strong>{' '}
              {selected
                .sort((a, b) => b - a)
                .map((d) => `${d} ${d === 1 ? 'zi' : 'zile'}`)
                .join(', ')}{' '}
              înainte de expirare.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
