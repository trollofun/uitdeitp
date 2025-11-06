'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Search } from 'lucide-react';
import { useCallback } from 'react';

export function RemindersFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page'); // Reset to page 1
      router.push(`/dashboard/reminders?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex gap-4">
      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Caută după număr..."
          defaultValue={searchParams.get('search') || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type Filter */}
      <Select
        defaultValue={searchParams.get('type') || 'all'}
        onValueChange={(value) => updateFilter('type', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tip" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toate tipurile</SelectItem>
          <SelectItem value="itp">ITP</SelectItem>
          <SelectItem value="rca">RCA</SelectItem>
          <SelectItem value="rovinieta">Rovinieta</SelectItem>
        </SelectContent>
      </Select>

      {/* Urgency Filter */}
      <Select
        defaultValue={searchParams.get('urgency') || 'all'}
        onValueChange={(value) => updateFilter('urgency', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Urgență" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toate</SelectItem>
          <SelectItem value="expired">Expirate</SelectItem>
          <SelectItem value="urgent">Urgente (1-3 zile)</SelectItem>
          <SelectItem value="warning">Atenție (4-7 zile)</SelectItem>
          <SelectItem value="normal">Normale</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
