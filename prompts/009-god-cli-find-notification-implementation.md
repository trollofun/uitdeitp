<objective>
Use god-cli to analyze the ENTIRE codebase and find the ACTUAL implementation of the notification system. User believes the implementation is NOT on Supabase Edge Functions, but somewhere else in the codebase.

This is critical because:
- Previous analysis may have focused on wrong implementation path
- Need large context window to scan entire project
- Must find where cron jobs, scheduled tasks, or background workers actually run
- Need to understand the complete notification pipeline end-to-end
</objective>

<context>
The user suspects notifications are implemented differently than Supabase Edge Functions. Possible alternatives:
- Vercel Cron Jobs (vercel.json configuration)
- Next.js API routes with external cron service (cron-job.org, etc.)
- GitHub Actions scheduled workflows
- Custom background worker service
- Third-party scheduling service (Inngest, Trigger.dev, etc.)

You need to use god-cli's large context window to scan the entire codebase and find ALL notification-related implementations.
</context>

<research>
Use god-cli to search for:

1. **Cron job configurations**:
   - `vercel.json` - Vercel Cron configuration
   - `.github/workflows/` - GitHub Actions scheduled jobs
   - `package.json` scripts with "cron" or "schedule"
   - Any scheduling libraries (node-cron, cron, etc.)

2. **Notification processing code**:
   - Files containing "process" + "reminder"
   - Files containing "send" + "notification"
   - Files containing "cron" or "schedule"
   - API routes in `/src/app/api/` that handle notifications

3. **Background job implementations**:
   - Inngest functions
   - Trigger.dev workflows
   - BullMQ/Redis queue workers
   - Custom worker scripts

4. **NotifyHub integration points**:
   - Where NOTIFYHUB_API_KEY is used
   - Where SMS sending actually happens
   - API routes that call NotifyHub

5. **Database query patterns**:
   - Code that queries `next_notification_date`
   - Code that updates notification_log
   - Code that filters reminders by date
</research>

<god_cli_usage>
Use god-cli with large context to analyze:

```bash
# Search entire codebase for notification implementation
god-cli --all_files -p "Find all code related to notification processing, cron jobs, scheduled tasks, and reminder sending. Show me:
1. Where cron jobs are configured
2. Where reminders are processed on schedule
3. Where SMS notifications are sent via NotifyHub
4. Any background workers or scheduled tasks
5. The complete notification pipeline from trigger to SMS delivery

Include file paths and line numbers for all findings."
```

Then analyze specific areas:

```bash
# Check Vercel configuration
god-cli -p "@vercel.json @package.json Does this project use Vercel Cron? Show me the configuration."

# Check API routes
god-cli -p "@src/app/api/ Find all API routes that process reminders or send notifications. Show complete implementation."

# Check for scheduling libraries
god-cli -p "@package.json @src/ What scheduling or background job libraries are installed? Show where they're used."
```
</god_cli_usage>

<output_format>
Create comprehensive analysis:
`./docs/ACTUAL_NOTIFICATION_IMPLEMENTATION.md`

Structure:
1. **Executive Summary** - Where is it actually implemented?
2. **Cron/Scheduling Configuration** - How are jobs scheduled?
3. **Notification Processing Code** - Where does processing happen?
4. **NotifyHub Integration** - How are SMS sent?
5. **Complete Pipeline** - End-to-end flow diagram
6. **Why Previous Analysis Was Wrong** - What we missed
7. **Next Steps** - How to verify and test the real implementation

Include:
- File paths with line numbers
- Code snippets showing key implementations
- Configuration files (vercel.json, etc.)
- Environment variables used
- Actual execution flow
</output_format>

<verification>
Before completing:
1. ✓ Used god-cli with --all_files for comprehensive scan
2. ✓ Found actual cron job configuration
3. ✓ Located notification processing code
4. ✓ Identified NotifyHub integration points
5. ✓ Traced complete pipeline from schedule → process → send
6. ✓ Verified with actual file reads (not assumptions)
7. ✓ Explained why Supabase Edge Function path was wrong (if it was)
</verification>

<success_criteria>
- Found the ACTUAL notification implementation (not assumptions)
- Provided file paths and line numbers for all key components
- Documented complete notification pipeline
- Explained how scheduling/cron actually works in this project
- Ready to verify and test the real implementation
</success_criteria>
