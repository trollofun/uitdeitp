<objective>
Fix critical errors in the admin panel and implement missing notification customization feature for white-label stations.

**Current Issues:**
1. Reminders page shows "Eroare la încărcarea reminder-urilor" at `/admin/reminders`
2. Station update fails with 400 Bad Request: `PATCH /api/stations/c0000000-0000-0000-0000-000000000001`
3. Station creation fails with 400 Bad Request: `POST /api/stations`
4. Missing feature: Stations cannot customize SMS/email notification messages for their clients (manual or kiosk)

**End Goal:**
- Admin panel fully functional for managing reminders and stations
- White-label stations can personalize notification templates with their branding
- All CRUD operations working correctly (Create, Read, Update for stations and reminders)

**Why This Matters:**
This is a revenue-critical feature. White-label stations (€49/month each) need to customize notifications with their branding. Currently broken admin panel blocks station onboarding and management.
</objective>

<context>
**Project**: uitdeITP - Multi-modal ITP reminder platform
**Tech Stack**: Next.js 14 (App Router), Supabase, TypeScript, React Hook Form, Zod validation

**Database Tables:**
- `kiosk_stations`: Station configurations with branding (logo_url, primary_color, etc.)
- `reminders`: ITP reminders (user_id, guest_phone for kiosk users)
- `notification_log`: Sent notification history

**White-Label System:**
Stations pay €49/month for custom branding including:
- Custom logo in kiosk UI
- Custom colors (primary, secondary)
- **Custom SMS/email templates** (THIS IS MISSING)

Read @CLAUDE.md for project conventions and database schema.

**Relevant Files to Examine:**
@src/app/admin/reminders/page.tsx
@src/app/admin/stations/
@src/app/api/stations/
@src/app/api/reminders/
@supabase/migrations/ (check kiosk_stations schema)
</context>

<requirements>
**Phase 1: Diagnostic (Use Parallel Agents for Speed)**
For maximum efficiency, launch multiple investigation agents in parallel:

1. **Agent 1 - Reminders API Investigation:**
   - Examine `/api/reminders` endpoint (GET request)
   - Check authentication/authorization requirements
   - Verify RLS policies for admin access
   - Test endpoint response format
   - Check for missing error handling

2. **Agent 2 - Stations API Investigation:**
   - Examine `/api/stations` POST endpoint
   - Examine `/api/stations/[id]` PATCH endpoint
   - Check request body validation (Zod schemas)
   - Verify required fields match database schema
   - Check for foreign key constraints or missing columns

3. **Agent 3 - Database Schema Audit:**
   - Use Supabase MCP to query `kiosk_stations` table schema
   - Check if notification template columns exist (e.g., `sms_template`, `email_template`)
   - Verify constraint definitions
   - Check RLS policies for admin role

**Phase 2: Fix API Errors**
Based on diagnostic findings:

1. Fix validation schemas (Zod) to match database requirements
2. Add proper error handling with descriptive messages
3. Ensure admin authentication bypass for RLS (use service client if needed)
4. Fix any missing required fields in request bodies
5. Add console.log debugging for 400 errors to identify exact validation failures

**Phase 3: Add Notification Customization**
Implement white-label notification template system:

1. **Database Schema:**
   - Add columns to `kiosk_stations` if missing:
     - `sms_template` (TEXT): Custom SMS message with placeholders
     - `email_template` (TEXT): Custom email HTML/text with placeholders
   - Example template placeholders: `{plate}`, `{expiry_date}`, `{station_name}`, `{station_phone}`

2. **Admin UI:**
   - Add form fields in station edit page (`/admin/stations/[id]`)
   - Textarea for SMS template with placeholder guide
   - Rich text editor or textarea for email template
   - Preview functionality showing rendered template with sample data

3. **Notification Service Integration:**
   - Modify `src/lib/services/notification.ts` (or similar) to:
     - Fetch station's custom templates from database
     - Replace placeholders with actual reminder data
     - Fall back to default templates if station hasn't customized

4. **Example Templates:**
   ```
   Default SMS:
   "ITP pentru {plate} expiră pe {expiry_date}. Programează inspecția! uitdeitp.ro"

   Custom SMS (station):
   "Bună! ITP pentru {plate} expiră pe {expiry_date}.
   Vino la {station_name} - {station_phone}.
   Dezabonare: {opt_out_link}"
   ```

**Be explicit about all changes:**
- List all files created/modified
- Show exact SQL migrations needed
- Provide complete form validation schemas
</requirements>

<implementation>
**Debugging Strategy:**
1. Add detailed console.error logging in API routes to capture 400 error details
2. Log request body, validation errors, and database responses
3. Use try-catch blocks with specific error messages (not generic "Eroare")

**Why Avoid Generic Errors:**
Generic error messages like "Eroare la încărcarea reminder-urilor" hide root causes. Use specific errors:
- "Failed to authenticate admin user"
- "Missing required field: logo_url"
- "Database constraint violation: invalid station_id format"

**Template System Constraints:**
- Templates must remain SQL-injection safe (use parameterized queries)
- Placeholders must be clearly documented for station admins
- Default templates required (never null/empty)
- Validation: Templates must include minimum required info (plate, expiry_date)

**Parallel Tool Calling:**
For maximum efficiency, whenever you need to perform multiple independent operations (e.g., reading different API routes, checking database schema, examining UI components), invoke all relevant tools simultaneously rather than sequentially.
</implementation>

<output>
**Create/Modify Files:**

1. **Database Migration (if schema changes needed):**
   - `./supabase/migrations/011_add_notification_templates_to_stations.sql`

2. **API Routes (fix existing or create):**
   - `./src/app/api/reminders/route.ts` (fix GET endpoint)
   - `./src/app/api/stations/route.ts` (fix POST endpoint)
   - `./src/app/api/stations/[id]/route.ts` (fix PATCH endpoint)

3. **Admin UI Components:**
   - `./src/app/admin/stations/[id]/page.tsx` (add template editor)
   - `./src/components/admin/NotificationTemplateEditor.tsx` (new component)

4. **Notification Service:**
   - `./src/lib/services/notification.ts` (add template rendering)

5. **Documentation:**
   - `./docs/ADMIN_NOTIFICATION_TEMPLATES.md` (guide for station admins)

**Use relative paths starting with `./` for all file operations.**
</output>

<verification>
**Before declaring complete, verify:**

1. **API Tests:**
   ```bash
   # Test GET reminders (should return 200)
   curl -X GET https://uitdeitp.vercel.app/api/reminders \
     -H "Cookie: <admin-session-cookie>"

   # Test POST station (should return 201)
   curl -X POST https://uitdeitp.vercel.app/api/stations \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Station","slug":"test-station",...}'

   # Test PATCH station (should return 200)
   curl -X PATCH https://uitdeitp.vercel.app/api/stations/c0000000-0000-0000-0000-000000000001 \
     -H "Content-Type: application/json" \
     -d '{"name":"Updated Name"}'
   ```

2. **Database Schema:**
   - Verify columns exist: `SELECT column_name FROM information_schema.columns WHERE table_name = 'kiosk_stations'`
   - Check for `sms_template` and `email_template` columns

3. **UI Functionality:**
   - Navigate to `/admin/reminders` → No error message
   - Navigate to `/admin/stations/[id]` → Can see template editor
   - Edit templates → Preview shows rendered output
   - Save templates → PATCH succeeds, database updated

4. **Template Rendering:**
   - Create test reminder for station with custom template
   - Verify notification uses custom template (not default)
   - Check placeholders replaced correctly: `{plate}` → "B-123-ABC"

5. **Build Success:**
   ```bash
   npm run build
   # Should complete without TypeScript errors
   ```
</verification>

<success_criteria>
✅ **All these must pass:**
1. `/admin/reminders` loads without errors (displays reminder list or empty state)
2. POST `/api/stations` creates new station successfully (201 response)
3. PATCH `/api/stations/[id]` updates station successfully (200 response)
4. Admin can edit SMS/email templates in station settings
5. Templates preview shows correct placeholder replacement
6. Saved templates are used in actual notifications (verify in NotifyHub logs)
7. Default templates apply for stations without customization
8. No TypeScript errors, no console errors
9. Documentation explains available placeholders and template syntax
</success_criteria>

<research>
**If API endpoints don't exist:**
1. Check if reminders API uses different path (e.g., `/api/admin/reminders`)
2. Verify authentication middleware requirements (admin role check)
3. Examine existing working API routes for patterns to follow

**If template system needs design:**
1. Research best practices for safe template rendering (avoid XSS, SQL injection)
2. Consider using template library (e.g., Handlebars) vs simple string replacement
3. Check if NotifyHub API supports template variables or requires pre-rendered text
</research>

<reflection_guidance>
After receiving tool results from parallel investigations, carefully reflect on:
- Are all 400 errors caused by the same root issue (e.g., missing auth) or different problems?
- Does the database schema already have template columns, or do we need migration?
- Are there existing notification sending functions to hook into, or do we build from scratch?

Determine optimal next steps before proceeding with fixes.
</reflection_guidance>
