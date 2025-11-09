'use client'

import * as React from 'react'
import { useQueryState, parseAsString } from 'nuqs'
import { X, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { DateRangePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { ReminderStatus, ReminderType } from '@/app/api/types'

// Station type for dropdown
interface Station {
  id: string
  name: string
}

interface RemindersFiltersProps {
  stations?: Station[]
  className?: string
}

export function RemindersFilters({ stations = [], className }: RemindersFiltersProps) {
  // URL state management with nuqs
  const [status, setStatus] = useQueryState('status', parseAsString.withDefault(''))
  const [type, setType] = useQueryState('type', parseAsString.withDefault(''))
  const [stationId, setStationId] = useQueryState('station', parseAsString.withDefault(''))
  const [fromDate, setFromDate] = useQueryState('from', parseAsString.withDefault(''))
  const [toDate, setToDate] = useQueryState('to', parseAsString.withDefault(''))

  // Show/hide filters
  const [showFilters, setShowFilters] = React.useState(false)

  // Convert string dates to Date objects
  const dateFrom = React.useMemo(() => {
    return fromDate ? new Date(fromDate) : undefined
  }, [fromDate])

  const dateTo = React.useMemo(() => {
    return toDate ? new Date(toDate) : undefined
  }, [toDate])

  // Check if any filters are active
  const hasActiveFilters = React.useMemo(() => {
    return !!(status || type || stationId || fromDate || toDate)
  }, [status, type, stationId, fromDate, toDate])

  // Handle date changes with debounce
  const handleFromDateChange = React.useCallback(
    (date: Date | undefined) => {
      setFromDate(date ? date.toISOString().split('T')[0] : '')
    },
    [setFromDate]
  )

  const handleToDateChange = React.useCallback(
    (date: Date | undefined) => {
      setToDate(date ? date.toISOString().split('T')[0] : '')
    },
    [setToDate]
  )

  // Reset all filters
  const handleResetFilters = React.useCallback(() => {
    setStatus('')
    setType('')
    setStationId('')
    setFromDate('')
    setToDate('')
  }, [setStatus, setType, setStationId, setFromDate, setToDate])

  // Toggle filters visibility
  const toggleFilters = React.useCallback(() => {
    setShowFilters((prev) => !prev)
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toggle button for mobile */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFilters}
          className="lg:hidden"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filtre
          {hasActiveFilters && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {[status, type, stationId, fromDate, toDate].filter(Boolean).length}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="mr-2 h-4 w-4" />
            Resetează filtre
          </Button>
        )}
      </div>

      {/* Filters grid - responsive */}
      <div
        className={cn(
          'grid gap-4 transition-all duration-200',
          showFilters ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] lg:grid-rows-[1fr]',
          'lg:grid-cols-2 xl:grid-cols-4'
        )}
      >
        <div className={cn('overflow-hidden', !showFilters && 'lg:overflow-visible')}>
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status-filter" className="text-sm font-medium">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value === 'all' ? '' : value)}
              >
                <SelectTrigger id="status-filter" className="w-full">
                  <SelectValue placeholder="Toate statusurile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                  <SelectItem value="warning">Atenție</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2 lg:hidden xl:block">
              <Label htmlFor="type-filter" className="text-sm font-medium">
                Tip Reminder
              </Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value === 'all' ? '' : value)}
              >
                <SelectTrigger id="type-filter" className="w-full">
                  <SelectValue placeholder="Toate tipurile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="itp">ITP</SelectItem>
                  <SelectItem value="rca">RCA</SelectItem>
                  <SelectItem value="rovinieta">Rovinieta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Type Filter - Desktop only (second column) */}
        <div className="hidden lg:block xl:hidden">
          <div className="space-y-2">
            <Label htmlFor="type-filter-desktop" className="text-sm font-medium">
              Tip Reminder
            </Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value === 'all' ? '' : value)}
            >
              <SelectTrigger id="type-filter-desktop" className="w-full">
                <SelectValue placeholder="Toate tipurile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="itp">ITP</SelectItem>
                <SelectItem value="rca">RCA</SelectItem>
                <SelectItem value="rovinieta">Rovinieta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Station Filter */}
        <div className={cn('overflow-hidden', !showFilters && 'lg:overflow-visible')}>
          <div className="space-y-2">
            <Label htmlFor="station-filter" className="text-sm font-medium">
              Stație ITP
            </Label>
            <Select
              value={stationId}
              onValueChange={(value) => setStationId(value === 'all' ? '' : value)}
            >
              <SelectTrigger id="station-filter" className="w-full">
                <SelectValue placeholder="Toate stațiile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                {stations.length === 0 ? (
                  <SelectLabel className="text-muted-foreground">
                    Nu există stații
                  </SelectLabel>
                ) : (
                  stations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className={cn('overflow-hidden', !showFilters && 'lg:overflow-visible')}>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Interval Date</Label>
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onFromChange={handleFromDateChange}
              onToChange={handleToDateChange}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Active filters summary - Mobile */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 lg:hidden">
          {status && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStatus('')}
              className="h-7 text-xs"
            >
              Status: {status}
              <X className="ml-1 h-3 w-3" />
            </Button>
          )}
          {type && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setType('')}
              className="h-7 text-xs"
            >
              Tip: {type}
              <X className="ml-1 h-3 w-3" />
            </Button>
          )}
          {stationId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStationId('')}
              className="h-7 text-xs"
            >
              Stație
              <X className="ml-1 h-3 w-3" />
            </Button>
          )}
          {(fromDate || toDate) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFromDate('')
                setToDate('')
              }}
              className="h-7 text-xs"
            >
              Date
              <X className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
