/**
 * Contact management service for many-to-many reminder ↔ phones (EUR-117)
 *
 * REGULA 4 (varianta C extinsă): SMS la TOATE telefoanele mașinii
 * REGULA 5: Importul ADAUGĂ contacte, nu înlocuiește
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ReminderContact {
  id: string;
  reminder_id: string;
  phone_number: string;
  source: 'web' | 'kiosk' | 'whatsapp' | 'voice' | 'import';
  added_at: string;
  added_by_user_id: string | null;
}

/**
 * Add a contact to a reminder (idempotent)
 * Normalizes phone to E.164 format (+407...)
 *
 * @returns Contact ID or null if error
 */
export async function addContactToReminder(params: {
  supabase: SupabaseClient;
  reminderId: string;
  phoneNumber: string;
  source?: 'web' | 'kiosk' | 'import';
  addedByUserId?: string | null;
}): Promise<{ data: string | null; error: any }> {
  // Normalize phone to E.164
  let normalized = params.phoneNumber;
  if (/^0[7-9]\d{8}$/.test(normalized)) {
    normalized = '+4' + normalized; // 0712345678 → +40712345678
  }

  const { data, error } = await params.supabase
    .rpc('add_reminder_contact', {
      p_reminder_id: params.reminderId,
      p_phone_number: normalized,
      p_source: params.source || 'web',
      p_added_by_user_id: params.addedByUserId || null,
    })
    .single();

  return { data: data as string | null, error };
}

/**
 * Get all contacts for a reminder
 */
export async function getContactsForReminder(
  supabase: SupabaseClient,
  reminderId: string
): Promise<{ data: ReminderContact[]; error: any }> {
  const { data, error } = await supabase
    .from('reminder_contacts')
    .select('*')
    .eq('reminder_id', reminderId)
    .order('added_at', { ascending: true });

  return { data: data || [], error };
}

/**
 * Remove a contact from a reminder
 */
export async function removeContactFromReminder(
  supabase: SupabaseClient,
  reminderId: string,
  phoneNumber: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('reminder_contacts')
    .delete()
    .eq('reminder_id', reminderId)
    .eq('phone_number', phoneNumber);

  return { error };
}

/**
 * Get reminders for a specific phone number
 * Used for opt-out lookup and notification targeting
 */
export async function getRemindersForPhone(
  supabase: SupabaseClient,
  phoneNumber: string
): Promise<{ data: Array<{ reminder_id: string; plate_number: string }>; error: any }> {
  const { data, error } = await supabase
    .from('reminder_contacts')
    .select(`
      reminder_id,
      reminders!inner (
        plate_number,
        expiry_date
      )
    `)
    .eq('phone_number', phoneNumber);

  if (error) return { data: [], error };

  const mapped = (data || []).map((row: any) => ({
    reminder_id: row.reminder_id,
    plate_number: row.reminders.plate_number,
    expiry_date: row.reminders.expiry_date,
  }));

  return { data: mapped, error: null };
}
