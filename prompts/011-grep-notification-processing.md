<objective>
Use comprehensive grep searches to find ALL code related to notification processing, reminder scheduling, and SMS sending in the codebase.

This is a parallel investigation to god-cli and Vercel cron searches.
</objective>

<research>
**Search Pattern 1: Notification Processing**
```bash
# Find files that process reminders
grep -r "next_notification_date" --include="*.ts" --include="*.tsx" src/

# Find SMS sending code
grep -r "NotifyHub" --include="*.ts" --include="*.tsx" src/
grep -r "NOTIFYHUB" --include="*.ts" --include="*.tsx" src/

# Find notification logging
grep -r "notification_log" --include="*.ts" --include="*.tsx" src/
```

**Search Pattern 2: Scheduling/Cron**
```bash
# Find cron-related code
grep -r "cron" --include="*.ts" --include="*.tsx" --include="*.json" .

# Find scheduling code
grep -r "schedule" --include="*.ts" --include="*.tsx" src/

# Find interval/timeout code (background processing)
grep -r "setInterval\|setTimeout" --include="*.ts" --include="*.tsx" src/
```

**Search Pattern 3: Background Jobs**
```bash
# Find queue/worker implementations
grep -r "queue\|worker\|job" --include="*.ts" --include="*.tsx" src/

# Find third-party scheduling libraries
grep -r "inngest\|trigger\|bull\|agenda" package.json
```

**Search Pattern 4: API Routes**
```bash
# List all API routes
find src/app/api -name "route.ts" -o -name "route.tsx"

# Find routes that send notifications
grep -l "send.*notification\|process.*reminder" src/app/api/**/route.ts
```
</research>

<implementation>
Run all grep searches above and analyze results:

1. **Identify notification processing files**
2. **Find where NotifyHub API is called**
3. **Locate scheduling mechanism**
4. **Map complete notification pipeline**
5. **Cross-reference with database queries**
</implementation>

<output>
Create comprehensive grep results:
`./docs/GREP_NOTIFICATION_SEARCH_RESULTS.md`

Include:
- All grep command results
- File paths and line numbers
- Code snippets for key findings
- Analysis of what each file does
- Pipeline reconstruction
</output>

<verification>
Before completing:
1. ✓ Ran all grep searches
2. ✓ Found notification processing code
3. ✓ Located NotifyHub integration
4. ✓ Identified scheduling mechanism
5. ✓ Cross-referenced all findings
</verification>

<success_criteria>
- Comprehensive grep results documented
- All notification-related files identified
- NotifyHub integration points found
- Scheduling mechanism discovered
- Pipeline mapped end-to-end
</success_criteria>
