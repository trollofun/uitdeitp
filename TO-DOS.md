> **NOTĂ (2026-08-21):** listă din decembrie 2025, majoritar rezolvată între timp; unele căi de fișiere nu mai există. Sursa actuală de adevăr: planul de producție + docs/CERERE_*/RASPUNS_*.

# TO-DO List

## Fix Verification 500 Errors - 2025-12-10 14:50

- **Delete duplicate phone verification migration** - Remove conflicting migration file that defines RPC functions with different signatures. **Problem:** Two migration files (`005_phone_verifications.sql` and `20241104_phone_verifications.sql`) define same functions with different parameters, causing "Unknown error" 500s. **Files:** `/supabase/migrations/20241104_phone_verifications.sql` (delete), `/supabase/migrations/005_phone_verifications.sql` (keep). **Solution:** Keep the more complete version (005) and delete the newer conflicting one.

- **Fix verification/verify RPC function calls** - Correct function name and parameter usage in verification endpoint. **Problem:** Uses non-existent `increment_attempts` function and has column name inconsistencies. **Files:** `/src/app/api/verification/verify/route.ts:82,104`. **Solution:** Replace `supabase.rpc('increment_attempts')` with `supabase.rpc('increment_verification_attempts', {p_verification_id: record.id})` and ensure consistent column naming (`verification_code`).

- **Fix users/confirm-phone RPC errors** - Correct function call in phone confirmation endpoint. **Problem:** Uses non-existent `increment` function with wrong signature. **Files:** `/src/app/api/users/confirm-phone/route.ts:68`. **Solution:** Replace with proper `increment_verification_attempts` function call.

- **Test verification flows after fixes** - Verify both kiosk and registration flows work correctly. **Problem:** Need to ensure fixes don't break existing functionality. **Files:** `/src/app/api/verification/*`, `/src/app/api/users/*verify*`. **Solution:** Test SMS sending, code verification, and resend functionality for both flows.

## Production Bug Fixes - 2025-12-10 15:49

- **Verify migration 009 in production** - Confirm critical notification bug fix is deployed. **Problem:** Migration 009 fixes notification trigger bug where notifications scheduled for TODAY were skipped. **Files:** `/supabase/migrations/009_fix_notification_system_critical_bugs.sql:22`. **Solution:** Run SQL query to verify `>=` condition is active and test notifications due today.

- **Audit for exposed API keys** - Find and rotate any exposed secrets in codebase. **Problem:** API keys for NotifyHub, Resend, Supabase might be exposed in client code. **Files:** `/src/`, `/public/`, environment files. **Solution:** Use `grep -r "sk-\|re_\|supabase"` to find exposed keys and rotate them immediately.

- **Fix User Profile schema mismatch** - Ensure notification settings API works correctly. **Problem:** API expects columns that may not exist in production `user_profiles` table. **Files:** `/src/app/api/notifications/settings/route.ts`, `/supabase/migrations/009_fix_notification_system_critical_bugs.sql:50-103`. **Solution:** Verify columns `sms_enabled`, `email_enabled`, `quiet_hours_*` exist in production.

- **Optimize N+1 queries in reminders table** - Fix performance issues with multiple API calls. **Problem:** RemindersTable makes separate API call for each reminder. **Files:** `/src/components/dashboard/reminders/RemindersTable.tsx`. **Solution:** Implement batch API endpoint or use React Query with DataLoader pattern.

- **Fix memory leaks in RealtimeReminders hook** - Clean up subscriptions on unmount. **Problem:** Subscriptions persist causing memory leaks. **Files:** `/src/hooks/useRealtimeReminders.ts`. **Solution:** Ensure useEffect cleanup function properly unsubscribes.

- **Fix Kiosk mode timeout behavior** - Timer doesn't reset correctly on user interaction. **Problem:** Screen returns to idle too quickly. **Files:** `/src/components/kiosk/IdleTimeout.tsx`. **Solution:** Review event delegation and reset logic.

- **Implement persistent rate limiting** - Replace in-memory rate limiting with Redis/DB. **Problem:** Rate limiting can be bypassed by page reload. **Files:** `/src/app/api/verification/send/route.ts`. **Solution:** Use database or Redis-based rate limiting with IP/user tracking.