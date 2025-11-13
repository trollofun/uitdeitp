'use client'

import { useState } from 'react'
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RemindersFilters } from './RemindersFilters'
import { RemindersSearch } from './RemindersSearch'
import { RemindersTable } from './RemindersTable'
import { RemindersTablePagination } from './RemindersTablePagination'
import { AddReminderDialog } from './AddReminderDialog'
import { EditReminderDialog } from './EditReminderDialog'
import { DeleteReminderDialog } from './DeleteReminderDialog'
import { useReminders } from '@/hooks/reminders/useReminders'
import { useRealtimeReminders } from '@/hooks/reminders/useRealtimeReminders'
import { useToast } from '@/hooks/use-toast'
import type { Database } from '@/types'

type Reminder = Database['public']['Tables']['reminders']['Row']

export function RemindersManager() {
  const { toast } = useToast()

  // State for dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)

  // URL state management for filters (synced with RemindersFilters component)
  const [status] = useQueryState('status', parseAsString.withDefault(''))
  const [type] = useQueryState('type', parseAsString.withDefault(''))
  const [stationId] = useQueryState('station', parseAsString.withDefault(''))
  const [fromDate] = useQueryState('from', parseAsString.withDefault(''))
  const [toDate] = useQueryState('to', parseAsString.withDefault(''))
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Build filters object for the hook
  const filters = {
    status: status ? (status as 'active' | 'expired' | 'opted_out' | 'deleted') : undefined,
    type: type ? (type as 'itp' | 'rca' | 'rovinieta') : undefined,
    station_id: stationId || undefined,
    date_range: fromDate || toDate ? {
      start: fromDate,
      end: toDate,
    } : undefined,
    search: searchQuery || undefined,
  }

  // Fetch reminders with filters
  const { data, isLoading, error, refetch } = useReminders({
    filters,
    pagination: {
      page: currentPage,
      limit: pageSize,
    },
  })

  // Extract data from React Query result
  const reminders = data?.data || []
  const totalCount = data?.pagination.total || 0

  // Subscribe to realtime updates
  useRealtimeReminders({
    onInsert: () => {
      refetch()
      toast({
        title: 'Reminder nou',
        description: 'Un reminder nou a fost adăugat',
      })
    },
    onUpdate: () => {
      refetch()
      toast({
        title: 'Reminder actualizat',
        description: 'Un reminder a fost modificat',
      })
    },
    onDelete: () => {
      refetch()
      toast({
        title: 'Reminder șters',
        description: 'Un reminder a fost eliminat',
        variant: 'destructive',
      })
    },
  })

  // Dialog handlers
  const handleOpenAddDialog = () => {
    setAddDialogOpen(true)
  }

  const handleAddDialogChange = (open: boolean) => {
    setAddDialogOpen(open)
    if (!open) refetch()
  }

  const handleOpenEditDialog = (reminder: Reminder) => {
    setSelectedReminder(reminder)
    setEditDialogOpen(true)
  }

  const handleEditDialogChange = (open: boolean) => {
    setEditDialogOpen(open)
    if (!open) {
      setSelectedReminder(null)
      refetch()
    }
  }

  const handleOpenDeleteDialog = (reminder: Reminder) => {
    setSelectedReminder(reminder)
    setDeleteDialogOpen(true)
  }

  const handleDeleteDialogChange = (open: boolean) => {
    setDeleteDialogOpen(open)
    if (!open) {
      setSelectedReminder(null)
      refetch()
    }
  }

  // SMS handler
  const handleSendSMS = async (reminder: Reminder) => {
    try {
      toast({
        title: 'Trimitere SMS',
        description: 'Se trimite SMS-ul...',
      })

      // TODO: Implement SMS sending logic
      // This would call a Supabase Edge Function or external SMS API

      toast({
        title: 'SMS trimis',
        description: `SMS trimis cu succes pentru ${reminder.plate_number}`,
      })
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut trimite SMS-ul',
        variant: 'destructive',
      })
    }
  }

  // Search handler
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // Reset to first page when search changes
  }

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Remindere</h1>
          <p className="text-muted-foreground">
            Gestionează toate reminder-ele tale
          </p>
        </div>
        <Button
          onClick={handleOpenAddDialog}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adaugă Reminder
        </Button>
      </div>

      {/* Filters Bar */}
      <RemindersFilters />

      {/* Search */}
      <RemindersSearch
        value={searchQuery}
        onChange={handleSearchChange}
      />

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error.message || 'A apărut o eroare la încărcarea reminder-elor'}
          </p>
        </div>
      )}

      {/* Table */}
      <RemindersTable
        data={reminders}
        isLoading={isLoading}
        onEdit={handleOpenEditDialog}
        onDelete={handleOpenDeleteDialog}
        onSendSMS={handleSendSMS}
      />

      {/* Pagination */}
      {!isLoading && reminders.length > 0 && (
        <RemindersTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={handlePageChange}
        />
      )}

      {/* Dialogs */}
      <AddReminderDialog
        open={addDialogOpen}
        onOpenChange={handleAddDialogChange}
      />

      {selectedReminder && (
        <>
          <EditReminderDialog
            open={editDialogOpen}
            reminder={selectedReminder}
            onOpenChange={handleEditDialogChange}
          />

          <DeleteReminderDialog
            open={deleteDialogOpen}
            reminder={selectedReminder}
            onOpenChange={handleDeleteDialogChange}
          />
        </>
      )}
    </div>
  )
}
