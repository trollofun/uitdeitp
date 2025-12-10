<objective>
Thoroughly diagnose the notification system to determine why notifications may not be sending. Use Vercel CLI and Supabase MCP tools to check:
- Cron job configuration and execution status
- Edge Function deployment and logs
- Database notification_log entries
- Service key vs anon key permissions
- Overall notification pipeline health

This matters because:
- Notifications are the core value proposition of uitdeITP
- User reported uncertainty about whether notifications are being sent
- May need service_role_key instead of anon_key for bypassing RLS
- Need to verify the entire notification pipeline end-to-end
</objective>

<context>
The notification system consists of:

1. **Supabase Cron Job** (scheduled task):
   - Should run daily at 9:00 AM Romanian time (7:00 UTC)
   - Name: `daily-itp-reminders`
   - Triggers Edge Function via HTTP POST

2. **Edge Function** (process-reminders):
   - Path: `supabase/functions/process-reminders/`
   - Processes reminders where next_notification_date <= today
   - Sends notifications via NotifyHub SMS API
   - Logs results to notification_log table

3. **NotifyHub Integration**:
   - External SMS gateway: https://ntf.uitdeitp.ro
   - Requires NOTIFYHUB_API_KEY for authentication
   - Handles actual SMS delivery

4. **Database Tables**:
   - `reminders` - Contains next_notification_date field
   - `notification_log` - Records sent notifications (type, status, timestamp)
   - `global_opt_outs` - Phone numbers that opted out

**Potential Issues**:
- Edge Function may not be deployed or may have errors
- Cron job may not be scheduled or may be failing silently
- Service key permissions may be needed (RLS bypass)
- No reminders may be due for notification yet (edge case)
- NotifyHub API key may be invalid or expired
</context>

<research>
**Phase 1: Check Cron Job Status**
Use Supabase MCP tool to:
1. List all scheduled cron jobs
2. Check execution history for `daily-itp-reminders`
3. Verify schedule configuration (should be '0 7 * * *')
4. Check last run timestamp and status

**Phase 2: Check Edge Function**
Use Vercel CLI and Supabase MCP:
1. List deployed Edge Functions
2. Check process-reminders deployment status
3. Review recent logs for errors or execution
4. Verify environment variables (NOTIFYHUB_URL, NOTIFYHUB_API_KEY)

**Phase 3: Check Database State**
Use Supabase MCP execute_sql:
1. Query reminders table for due notifications:
   ```sql
   SELECT id, type, expiry_date, next_notification_date,
          guest_phone, user_id, station_id, created_at
   FROM reminders
   WHERE next_notification_date <= CURRENT_DATE
   AND next_notification_date IS NOT NULL
   ORDER BY next_notification_date DESC
   LIMIT 10;
   ```

2. Check notification_log for recent sends:
   ```sql
   SELECT id, reminder_id, type, status, provider_message_id,
          sent_at, error_message
   FROM notification_log
   ORDER BY sent_at DESC
   LIMIT 20;
   ```

3. Count total reminders and their notification status:
   ```sql
   SELECT
     COUNT(*) as total_reminders,
     COUNT(CASE WHEN next_notification_date <= CURRENT_DATE THEN 1 END) as due_now,
     COUNT(CASE WHEN next_notification_date > CURRENT_DATE THEN 1 END) as scheduled_future
   FROM reminders;
   ```

**Phase 4: Service Key Analysis**
1. Check if Edge Function uses SUPABASE_SERVICE_ROLE_KEY
2. Verify RLS policies on reminders and notification_log tables
3. Test if anon_key can read/write notification_log (may need service key)

**Phase 5: Manual Trigger Test**
1. Manually trigger Edge Function via Vercel CLI or curl
2. Monitor logs in real-time
3. Check if notifications are sent and logged
4. Identify any errors or authentication issues
</research>

<tools_needed>
- Supabase MCP tools: execute_sql, get_logs, list_edge_functions, get_edge_function
- Vercel CLI: `vercel logs`, `vercel env ls`
- Bash: curl commands to manually trigger Edge Function
</tools_needed>

<output_format>
Create a comprehensive diagnostic report:
`./docs/notification-system-diagnostic-report.md`

Structure:
1. **Executive Summary** - Working or broken? Main issue identified?
2. **Cron Job Status** - Schedule, last run, execution history
3. **Edge Function Status** - Deployment, logs, errors
4. **Database Analysis** - Due reminders, sent notifications, statistics
5. **Permissions Analysis** - Service key vs anon key, RLS policies
6. **Root Cause** - What's preventing notifications from sending?
7. **Recommended Fixes** - Step-by-step resolution plan
8. **Test Plan** - How to verify the fix works

Include all SQL query results, log outputs, and error messages in the report.
</output_format>

<verification>
Before completing, ensure you've checked:
1. ✓ Cron job existence and schedule
2. ✓ Cron job execution history (last 5 runs)
3. ✓ Edge Function deployment status
4. ✓ Edge Function logs (errors, executions)
5. ✓ Environment variables (NOTIFYHUB_URL, NOTIFYHUB_API_KEY)
6. ✓ Database query: reminders due for notification
7. ✓ Database query: recent notification_log entries
8. ✓ Service key vs anon key permissions
9. ✓ Manual trigger test (if safe to do so)
10. ✓ Root cause identified with confidence

If you cannot determine root cause with high confidence, state what additional information is needed.
</verification>

<success_criteria>
- Comprehensive diagnostic report created
- Root cause of notification issues identified (or confirmed system is working)
- Clear evidence provided (logs, query results, error messages)
- Recommended fixes are specific and actionable
- Test plan provided to verify fixes
- No assumptions made - everything verified with actual data/logs
</success_criteria>
