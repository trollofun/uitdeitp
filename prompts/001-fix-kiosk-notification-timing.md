<objective>
Fix notification timing for kiosk guest users to send reminders 5 days before ITP expiry (instead of the current 7-day schedule used for registered users).

This is critical because:
- Kiosk guests only receive SMS notifications (no email fallback)
- SMS costs money, so we need precise timing
- 5 days provides urgency while giving enough time to schedule ITP inspection
- Registered users keep their 7-3-1 day multi-channel schedule (email + SMS)
</objective>

<context>
The uitdeITP kiosk collects guest data at service stations. These guests:
- Do NOT have registered accounts
- Only receive SMS notifications (no email)
- Are identified by having a `station_id` in the reminders table (kiosk submissions)
- Currently receive notifications on the same 7-3-1 schedule as registered users

Registered users:
- Have user_id in reminders table
- Receive email (primary) + SMS (critical reminders only)
- Should keep existing 7-3-1 day notification schedule

You need to implement differential notification timing based on user type.
</context>

<requirements>
1. **Identify the notification scheduling logic**:
   - Find where `next_notification_date` is calculated
   - Check if this happens in database trigger, Edge Function, or API route
   - Examine the current 7-day calculation

2. **Implement differential timing**:
   - Kiosk guests (has station_id): First notification at expiry_date - 5 days
   - Registered users (has user_id): Keep existing expiry_date - 7 days
   - Ensure this logic is consistent across all relevant code paths

3. **Verify the implementation**:
   - Check database trigger: `update_next_notification_date`
   - Check API route: `/api/kiosk/submit`
   - Check any Edge Functions that process reminders
   - Update notification processing logic to respect the 5-day window for kiosk users

4. **Test the changes**:
   - Create a test kiosk reminder with expiry date in 10 days
   - Verify next_notification_date = expiry_date - 5 days (not 7)
   - Verify registered user reminders still use 7-day schedule
</requirements>

<implementation>
**Step 1: Read existing notification logic**
@src/app/api/kiosk/submit/route.ts
@supabase/migrations/ (look for update_next_notification_date trigger)

**Step 2: Identify where to implement the change**
- If trigger: Modify SQL trigger to check for station_id vs user_id
- If API: Update the date calculation in the kiosk submit handler
- If Edge Function: Update the reminder processing logic

**Step 3: Implement differential timing**
Example logic pattern:
```typescript
const daysBeforeExpiry = reminder.station_id ? 5 : 7; // Kiosk guests: 5 days, Registered: 7 days
const nextNotificationDate = new Date(expiryDate);
nextNotificationDate.setDate(nextNotificationDate.getDate() - daysBeforeExpiry);
```

**Step 4: Update all relevant locations**
- Database trigger (if exists)
- API route handler
- Any Edge Functions that calculate next_notification_date

**What to avoid and WHY:**
- Do NOT change registered user timing (7-3-1 schedule is working well for multi-channel notifications)
- Do NOT hardcode dates (use calculation based on expiry_date for flexibility)
- Do NOT break existing reminders (apply change only to new kiosk submissions)
</implementation>

<output>
Modify files as needed:
- `./src/app/api/kiosk/submit/route.ts` - Update notification date calculation
- `./supabase/migrations/[timestamp]_update_notification_trigger.sql` - If trigger needs modification
- Any other files where next_notification_date is calculated

Create a test file if needed:
- `./tests/kiosk-notification-timing.test.ts` - Verify 5-day vs 7-day logic
</output>

<verification>
Before declaring complete, verify:
1. Read the current implementation and identify exactly where next_notification_date is set
2. Confirm the change differentiates between kiosk guests (station_id) and registered users (user_id)
3. Test with a sample calculation:
   - Kiosk guest with expiry 2025-12-31 → next_notification should be 2025-12-26 (5 days before)
   - Registered user with expiry 2025-12-31 → next_notification should be 2025-12-24 (7 days before)
4. Ensure no breaking changes to existing registered user notification schedule
</verification>

<success_criteria>
- Kiosk guest reminders calculate next_notification_date as expiry_date - 5 days
- Registered user reminders still calculate next_notification_date as expiry_date - 7 days
- Logic is clear and maintainable (uses conditional based on station_id presence)
- No existing reminders are broken by the change
- Code includes comments explaining the 5-day vs 7-day difference
</success_criteria>
