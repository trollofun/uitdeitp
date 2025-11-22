<objective>
Analyze package.json to identify what scheduling, background job, or notification libraries are actually installed in the project.

This helps narrow down the implementation approach.
</objective>

<research>
Read `@package.json` and look for:

**Scheduling Libraries:**
- `node-cron` - Node.js cron scheduler
- `cron` - Simple cron library
- `agenda` - MongoDB-backed job scheduler
- `bull` / `bullmq` - Redis-based queue
- `bree` - Job scheduler

**Background Job Platforms:**
- `inngest` - Durable workflow engine
- `@trigger.dev/sdk` - Background jobs platform
- `quirrel` - Job queue for Next.js
- `graphile-worker` - PostgreSQL-based jobs

**Notification/Email Libraries:**
- `resend` - Email API (already know this exists)
- `twilio` - SMS (might be used instead of NotifyHub)
- `@sendgrid/mail` - Email
- `nodemailer` - Email

**HTTP/Fetch Libraries:**
- `axios` - HTTP client (for calling NotifyHub)
- `got` - HTTP client
- `node-fetch` - Fetch polyfill

**Database Libraries:**
- `@supabase/supabase-js` - Supabase client
- `pg` - PostgreSQL client (direct queries)
</research>

<implementation>
1. Read package.json dependencies
2. Identify all scheduling/background job libraries
3. Search codebase for usage of identified libraries
4. Determine which library is actually used for notifications
5. Find implementation files
</implementation>

<output>
Create analysis:
`./docs/PACKAGE_DEPENDENCIES_ANALYSIS.md`

Include:
- All relevant dependencies found
- Where each is used (file paths)
- Likely notification implementation approach
- Missing dependencies (what's NOT installed)
</output>

<verification>
Before completing:
1. ✓ Read package.json completely
2. ✓ Identified all relevant libraries
3. ✓ Searched for usage in codebase
4. ✓ Determined actual implementation
</verification>

<success_criteria>
- All scheduling/job libraries identified
- Usage locations found
- Implementation approach determined
- No assumptions - verified with code
</success_criteria>
