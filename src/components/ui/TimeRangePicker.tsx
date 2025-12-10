'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { cn } from '@/lib/utils';

interface TimeRangePickerProps {
  startTime: string;
  endTime: string;
  onChange: (start: string, end: string) => void;
  className?: string;
}

const hours = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

export function TimeRangePicker({
  startTime,
  endTime,
  onChange,
  className,
}: TimeRangePickerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select
        value={startTime}
        onValueChange={(value) => onChange(value, endTime)}
      >
        <SelectTrigger aria-label="Ora de început">
          <SelectValue placeholder="Ora start" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((hour) => (
            <SelectItem key={hour.value} value={hour.value}>
              {hour.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">până la</span>
      <Select
        value={endTime}
        onValueChange={(value) => onChange(startTime, value)}
      >
        <SelectTrigger aria-label="Ora de final">
          <SelectValue placeholder="Ora final" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((hour) => (
            <SelectItem key={hour.value} value={hour.value}>
              {hour.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
