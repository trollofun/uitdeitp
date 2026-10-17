import { describe, it, expect, vi } from 'vitest';
import { isExpired, processReminder } from '@/lib/services/reminder-processor';

describe('oprirea pentru ITP expirat', () => {
  it('compară pe zi: azi nu e expirat, ieri da', () => {
    expect(isExpired('2026-10-17', '2026-10-17')).toBe(false);
    expect(isExpired('2026-10-16', '2026-10-17')).toBe(true);
    expect(isExpired('2026-09-02', '2026-10-17')).toBe(true);
    expect(isExpired('2026-10-18T00:00:00Z', '2026-10-17')).toBe(false);
  });

  it('processReminder nu atinge baza și nu trimite nimic pentru un reminder expirat', async () => {
    const supabase = { from: vi.fn(), auth: { admin: { getUserById: vi.fn() } } };
    const result = await processReminder(
      {
        id: 'r1',
        plate_number: 'CT24ZIG',
        expiry_date: '2020-01-01',
        next_notification_date: '2020-01-01',
        guest_phone: '+40712000000',
      } as never,
      supabase as never
    );
    expect(result.skipped).toBe('expired');
    expect(result.success).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
