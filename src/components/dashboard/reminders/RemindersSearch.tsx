'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';

interface RemindersSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RemindersSearch({
  value,
  onChange,
  placeholder = 'Caută după număr înmatriculare...',
}: RemindersSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
