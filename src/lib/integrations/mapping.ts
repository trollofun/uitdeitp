/**
 * Contract A payload -> reminders row.
 *
 * Mirrors the kiosk insert shape (src/app/api/kiosk/submit/route.ts) so both
 * ingress paths produce identical rows; next_notification_date is left to the
 * DB trigger.
 */

import { addMonths } from 'date-fns';
import { plateNumberSchema } from '@/lib/validation';
import type { ContractAPayload } from './contract-a';

export interface MappingStation {
  id: string;
  default_intervals: unknown;
}

export interface ReminderInsert {
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  plate_number: string;
  reminder_type: 'itp';
  expiry_date: string;
  notification_intervals: number[];
  notification_channels: { sms: boolean; email: boolean };
  source: 'import';
  source_detail: 'import_full' | 'import_lite';
  station_id: string;
  external_ref: string;
  consent_given: boolean;
  consent_timestamp: string | null;
  consent_version: string | null;
  inspected_at: string | null;
}

function toDateOnly(value: Date): string {
  return value.toISOString().split('T')[0];
}

function intervalsOf(station: MappingStation): number[] {
  const raw = station.default_intervals;
  if (Array.isArray(raw) && raw.every((n) => typeof n === 'number') && raw.length > 0) {
    return raw as number[];
  }
  return [5];
}

/** Returns null when the payload carries no recipient (visit data only). */
export function toReminderInsert(
  payload: ContractAPayload,
  station: MappingStation,
  externalRef: string
): ReminderInsert | null {
  const destinatar = payload.destinatar;
  if (!destinatar) return null;

  let plateNumber: string;
  let expiryDate: Date;
  let inspectedAt: Date | null = null;
  let sourceDetail: ReminderInsert['source_detail'];

  if (payload.payload_variant === 'full') {
    plateNumber = plateNumberSchema.parse(
      payload.vehicul.numar_inmatriculare ?? payload.vehicul.placa
    );
    expiryDate = payload.inspectie.expirare;
    inspectedAt = payload.inspectie.data ?? new Date();
    sourceDetail = 'import_full';
  } else {
    plateNumber = payload.plate_number;
    inspectedAt = payload.data_inspectie ?? new Date();
    expiryDate =
      payload.expiry_date ?? addMonths(inspectedAt, payload.valabilitate_luni ?? 12);
    sourceDetail = 'import_lite';
  }

  return {
    // Attaching to an existing verified account is decided by the route, which
    // reuses the kiosk's phone_verified lookup.
    user_id: null,
    guest_name: destinatar.nume ?? null,
    guest_phone: destinatar.telefon,
    plate_number: plateNumber,
    reminder_type: 'itp',
    expiry_date: toDateOnly(expiryDate),
    notification_intervals: intervalsOf(station),
    notification_channels: { sms: true, email: false },
    source: 'import',
    source_detail: sourceDetail,
    station_id: station.id,
    external_ref: externalRef,
    consent_given: true,
    consent_timestamp: destinatar.consimtamant_la
      ? new Date(destinatar.consimtamant_la).toISOString()
      : new Date().toISOString(),
    consent_version: destinatar.consimtamant_versiune ?? 'v1',
    // consent_ip is intentionally null: the caller is an agent, not the data
    // subject. The agent's IP is recorded in integration_request_log.
    inspected_at: inspectedAt ? toDateOnly(inspectedAt) : null,
  };
}
