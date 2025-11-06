import { RemindersManager } from '@/components/dashboard/reminders/RemindersManager'

export const metadata = {
  title: 'Remindere ITP | uitdeitp',
  description: 'Gestionează reminder-ele tale pentru ITP, RCA și Rovinieta',
}

export default function RemindersPage() {
  return (
    <div className="container mx-auto py-8">
      <RemindersManager />
    </div>
  )
}
