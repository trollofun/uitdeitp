"use client";

import { useState } from "react";
import { RemindersTable } from "./RemindersTable";
import type { Database } from "@/types";

type Reminder = Database['public']['Tables']['reminders']['Row'];

/**
 * Example usage of RemindersTable component
 *
 * This shows how to integrate the table with your data fetching
 * and action handlers using database types.
 */
export function RemindersTableExample() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Example: Fetch reminders from API
  // useEffect(() => {
  //   async function fetchReminders() {
  //     setIsLoading(true);
  //     try {
  //       const response = await fetch('/api/reminders');
  //       const data = await response.json();
  //       setReminders(data);
  //     } catch (error) {
  //       console.error('Failed to fetch reminders:', error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }
  //   fetchReminders();
  // }, []);

  // Action handlers
  const handleEdit = (reminder: Reminder) => {
    // Open edit modal/dialog with reminder data
    // Example: setEditingReminder(reminder);
  };

  const handleDelete = async (reminder: Reminder) => {
    if (!confirm("Sigur doriți să ștergeți acest reminder?")) {
      return;
    }

    try {
      // Delete from database
      const response = await fetch(`/api/reminders/${reminder.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete reminder");
      }

      // Update local state
      setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
    } catch (error) {
      console.error("Failed to delete reminder:", error);
      alert("Eroare la ștergerea reminderului");
    }
  };

  const handleSendSMS = async (reminder: Reminder) => {
    try {
      // Send SMS via API
      const response = await fetch("/api/reminders/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reminderId: reminder.id,
          plateNumber: reminder.plate_number,
          expiryDate: reminder.expiry_date,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send SMS");
      }

      alert("SMS trimis cu succes!");
    } catch (error) {
      console.error("Failed to send SMS:", error);
      alert("Eroare la trimiterea SMS-ului");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Remindere ITP</h1>
        <p className="text-muted-foreground">
          Gestionați reminderele pentru expirarea ITP, RCA și rovinieta
        </p>
      </div>

      <RemindersTable
        data={reminders}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSendSMS={handleSendSMS}
        isLoading={isLoading}
      />
    </div>
  );
}
