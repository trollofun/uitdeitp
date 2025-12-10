"use client"

import * as React from "react"
import { format } from "date-fns"
import { ro } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selectează data",
  disabled = false,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP", { locale: ro }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          locale={ro}
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  from?: Date
  to?: Date
  onFromChange?: (date: Date | undefined) => void
  onToChange?: (date: Date | undefined) => void
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  disabled = false,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-2", className)}>
      <DatePicker
        value={from}
        onChange={onFromChange}
        placeholder="Data început"
        disabled={disabled}
        className="flex-1"
      />
      <DatePicker
        value={to}
        onChange={onToChange}
        placeholder="Data sfârșit"
        disabled={disabled}
        className="flex-1"
      />
    </div>
  )
}
