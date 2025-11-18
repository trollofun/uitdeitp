# Audit: Guest vs. Registered User Notification Intervals

## Request (Romanian)
"ia sa verifici te rog, utilizatorii guest (ce se inscriu in kiosk) au doar 1 singura notificare la 5 zile, cei inregistrati primesc mai multe notificari. as dori sa verificam si aceasta. folosete agenti in paralel sa faci un audit si sa verifci."

## Translation
"Please verify, guest users (who register in kiosk) have only 1 single notification at 5 days, registered users receive multiple notifications. I would like us to check this as well. Use agents in parallel to do an audit and verify."

## Audit Objectives

### 1. Guest Users (Kiosk Source)
**Expected Behavior:**
- Source: `kiosk`
- Notification intervals: `[5]` (single notification, 5 days before expiry)
- Notification channels: `{"sms": true, "email": false}` (SMS only, no email available)
- Rationale: Cost optimization - guest users get one critical reminder via SMS

### 2. Registered Users (Dashboard Source)
**Expected Behavior:**
- Source: `dashboard` or `manual`
- Notification intervals: User-selectable from `[1, 5, 14]` (max 3 selections)
- Default: `[5]` if user doesn't customize
- Notification channels: User-selectable `{"sms": boolean, "email": boolean}`
- Default: `{"sms": false, "email": true}` (email-first for cost optimization)
- Rationale: Registered users can customize, multi-channel support

## Parallel Agent Tasks

### Agent 1: Database Audit (debugger agent)
**Responsibilities:**
- Query database for all reminders grouped by `source`
- For each source, analyze:
  - `notification_intervals` distribution (count of [5] vs [1,5,14] vs other)
  - `notification_channels` distribution (email-only, SMS-only, both)
  - Verify kiosk reminders ALL have `[5]` intervals
  - Verify kiosk reminders ALL have `{"sms": true, "email": false}`
  - Find any anomalies (e.g., kiosk reminders with multiple intervals)

**SQL Queries:**
```sql
-- Guest users analysis
SELECT
  source,
  notification_intervals,
  notification_channels,
  COUNT(*) as count,
  ARRAY_AGG(plate_number ORDER BY created_at DESC) FILTER (WHERE deleted_at IS NULL) as sample_plates
FROM reminders
WHERE source = 'kiosk'
GROUP BY source, notification_intervals, notification_channels
ORDER BY count DESC;

-- Registered users analysis
SELECT
  source,
  notification_intervals,
  notification_channels,
  COUNT(*) as count,
  ARRAY_AGG(plate_number ORDER BY created_at DESC) FILTER (WHERE deleted_at IS NULL) as sample_plates
FROM reminders
WHERE source IN ('dashboard', 'manual')
GROUP BY source, notification_intervals, notification_channels
ORDER BY count DESC;

-- Find anomalies: kiosk reminders with wrong config
SELECT
  id,
  plate_number,
  source,
  notification_intervals,
  notification_channels,
  created_at
FROM reminders
WHERE source = 'kiosk'
  AND (
    notification_intervals != '[5]'::jsonb
    OR notification_channels != '{"sms": true, "email": false}'::jsonb
  )
  AND deleted_at IS NULL;
```

**Deliverables:**
- Count of kiosk reminders with correct vs. incorrect config
- Count of dashboard reminders by interval configuration
- List of any anomalies found
- Recommendations for data cleanup

### Agent 2: Code Verification (backend-architect agent)
**Responsibilities:**
- Review kiosk submission API route (`/api/kiosk/submit`)
- Verify hardcoded defaults for kiosk reminders:
  - `notification_intervals: [5]`
  - `notification_channels: {sms: true, email: false}`
- Review dashboard reminder creation API (`/api/reminders/create`)
- Verify user customization is respected
- Check NotificationIntervalPicker component
- Verify default intervals for registered users

**Files to Review:**
1. `/src/app/api/kiosk/submit/route.ts` - Kiosk submission logic
2. `/src/app/api/reminders/create/route.ts` - Dashboard reminder creation
3. `/src/components/dashboard/NotificationIntervalPicker.tsx` - UI component
4. `/src/lib/validation/index.ts` - Zod schemas

**Deliverables:**
- Confirmation that kiosk API hardcodes `[5]` and SMS-only
- Confirmation that dashboard API respects user selections
- Identification of any bugs or inconsistencies

### Agent 3: Edge Function Verification (devops-troubleshooter agent)
**Responsibilities:**
- Review Edge Function processing logic
- Verify it respects `notification_intervals` correctly
- Verify it respects `notification_channels` correctly
- Check email vs. SMS logic for guest vs. registered users
- Verify cost optimization logic (email-first for registered users)

**Files to Review:**
1. `/supabase/functions/process-reminders/index.ts` - Main processing logic

**Key Logic to Verify:**
```typescript
// Lines 287-293: Channel selection logic
const isRegisteredUser = !!reminder.user_id;
const channels = reminder.notification_channels || { email: true, sms: false };

// For guest users, only SMS is available
const shouldSendEmail = isRegisteredUser && (channels.email === true);
const shouldSendSMS = channels.sms === true || !isRegisteredUser;
```

**Deliverables:**
- Confirmation that Edge Function correctly differentiates guest vs. registered
- Confirmation that guest users ONLY get SMS (no email attempts)
- Confirmation that registered users respect channel preferences

## Success Criteria

### ✅ Pass Conditions
1. **100% of kiosk reminders** have `notification_intervals: [5]`
2. **100% of kiosk reminders** have `notification_channels: {"sms": true, "email": false}`
3. **Kiosk API** hardcodes these values (not user-editable)
4. **Dashboard API** respects user selections
5. **Edge Function** correctly sends SMS to guests, respects channels for registered users
6. **No anomalies** found in database

### ⚠️ Fail Conditions (Require Fixes)
1. Any kiosk reminder with multiple intervals (e.g., [1, 5, 14])
2. Any kiosk reminder with email enabled
3. Kiosk API allows user customization
4. Edge Function sends email to guest users
5. Database has inconsistent data

## Expected Timeline
- **Phase 1**: Parallel agent execution (5-10 minutes)
- **Phase 2**: Consolidate findings (2 minutes)
- **Phase 3**: Report generation (2 minutes)
- **Total**: ~15 minutes

## Output Format

### Final Report Structure
```markdown
# Guest vs. Registered User Notification Audit Report

## Executive Summary
[Pass/Fail status, key findings]

## Database Analysis (Agent 1)
- Total kiosk reminders: X
- Kiosk reminders with correct config: Y (Z%)
- Total registered reminders: A
- Registered reminder interval distribution: [...]
- Anomalies found: N

## Code Verification (Agent 2)
- Kiosk API hardcodes: ✅/❌
- Dashboard API respects preferences: ✅/❌
- Default intervals correct: ✅/❌

## Edge Function Verification (Agent 3)
- Guest user SMS-only logic: ✅/❌
- Registered user channel logic: ✅/❌
- Cost optimization working: ✅/❌

## Recommendations
[If any fixes needed]

## Data Cleanup SQL (if needed)
[SQL commands to fix anomalies]
```

## Agent Execution Plan

**Step 1**: Spawn 3 agents in parallel
```bash
# Agent 1: Database audit
Task agent (debugger) - SQL queries + analysis

# Agent 2: Code verification
Task agent (backend-architect) - Code review

# Agent 3: Edge Function verification
Task agent (devops-troubleshooter) - Logic review
```

**Step 2**: Wait for all agents to complete

**Step 3**: Consolidate findings into final report

**Step 4**: Present recommendations to user

---

**Priority**: HIGH (User explicitly requested)
**Complexity**: MEDIUM (parallel agents, multiple data sources)
**Estimated Effort**: 15 minutes
