/**
 * EUR-117 Dry-Run Endpoint (Faza 3)
 *
 * Preview import without making changes (REGULA 7)
 * Returns: new vehicles, updates, contacts added, conflicts
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DryRunReminder {
  plate_number: string;
  expiry_date: string;
  contacts: string[]; // phone numbers
}

export async function POST(req: Request) {
  try {
    const { reminders } = (await req.json()) as { reminders: DryRunReminder[] };

    if (!reminders || !Array.isArray(reminders)) {
      return NextResponse.json({ error: 'Invalid reminders array' }, { status: 400 });
    }

    const report = {
      summary: {
        total: reminders.length,
        new_vehicles: 0,
        updates: 0,
        contacts_added: 0,
        conflicts: 0,
      },
      new_vehicles: [] as string[],
      updates: [] as Array<{
        plate: string;
        existing_expiry: string;
        new_expiry: string;
        contacts_added: number;
      }>,
      conflicts: [] as Array<{
        plate: string;
        existing_expiry: string;
        new_expiry: string;
        diff_months: number;
      }>,
    };

    for (const incoming of reminders) {
      // Normalize plate
      const normalizedPlate = incoming.plate_number
        .replace(/[^A-Z0-9]/gi, '')
        .toUpperCase();

      // Check for existing reminder
      const { data: existing } = await supabase
        .from('reminders')
        .select('id, plate_number, expiry_date')
        .eq('plate_number', normalizedPlate)
        .is('deleted_at', null)
        .maybeSingle();

      if (!existing) {
        // New vehicle
        report.summary.new_vehicles++;
        report.new_vehicles.push(normalizedPlate);
        report.summary.contacts_added += incoming.contacts.length;
      } else {
        // Existing vehicle - check for conflicts
        const existingDate = new Date(existing.expiry_date);
        const incomingDate = new Date(incoming.expiry_date);
        const diffMonths = Math.abs(
          (incomingDate.getFullYear() - existingDate.getFullYear()) * 12 +
            (incomingDate.getMonth() - existingDate.getMonth())
        );

        if (diffMonths > 6) {
          // Conflict: difference > 6 months
          report.summary.conflicts++;
          report.conflicts.push({
            plate: normalizedPlate,
            existing_expiry: existing.expiry_date,
            new_expiry: incoming.expiry_date,
            diff_months: diffMonths,
          });
        } else if (incomingDate > existingDate) {
          // Update: newer expiry date
          // Count new contacts that would be added
          const { data: existingContacts } = await supabase
            .from('reminder_contacts')
            .select('phone_number')
            .eq('reminder_id', existing.id);

          const existingPhones = new Set(
            (existingContacts || []).map((c: any) => c.phone_number)
          );

          const newContactsCount = incoming.contacts.filter((phone) => {
            // Normalize phone
            let normalized = phone;
            if (/^0[7-9]\d{8}$/.test(normalized)) {
              normalized = '+4' + normalized;
            }
            return !existingPhones.has(normalized);
          }).length;

          report.summary.updates++;
          report.summary.contacts_added += newContactsCount;
          report.updates.push({
            plate: normalizedPlate,
            existing_expiry: existing.expiry_date,
            new_expiry: incoming.expiry_date,
            contacts_added: newContactsCount,
          });
        }
        // else: existing date is newer or equal → no action
      }
    }

    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    console.error('[Dry-Run] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
