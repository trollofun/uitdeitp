# uitdeITP Database Documentation

**Complete database schema, queries, and migration guide.**

---

## Database Information

- **Provider**: Supabase (PostgreSQL 15)
- **Project ID**: dnowyodhffqqhmakjupo
- **URL**: https://dnowyodhffqqhmakjupo.supabase.co

---

## Schema Overview

### Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `user_profiles` | Registered user data | RLS enabled, matches auth.users |
| `reminders` | ITP/RCA/Rovinieta reminders | Supports both registered & guest users |
| `kiosk_stations` | Service station configurations | Public read, white-label branding |
| `notification_log` | Sent notification audit trail | Tracks email & SMS delivery |
| `global_opt_outs` | SMS opt-out tracking | GDPR compliance |

---

## Table Definitions

### user_profiles

Stores registered user information.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);
```

**Columns:**
- `id`: UUID matching auth.users.id
- `email`: User email (unique, indexed)
- `name`: Full name
- `phone`: Romanian phone (+40XXXXXXXXX format)
- `email_notifications`: Email notification preference
- `sms_notifications`: SMS notification preference (default false to reduce costs)
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update timestamp

---

### reminders

Stores ITP/RCA/Rovinieta reminders for both registered and guest users.

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  station_id UUID REFERENCES kiosk_stations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('ITP', 'RCA', 'Rovinieta')),
  plate TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  next_notification_date DATE,
  guest_phone TEXT,
  guest_name TEXT,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  consent_given BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (
    (user_id IS NOT NULL) OR
    (guest_phone IS NOT NULL)
  ),
  CHECK (expiry_date > CURRENT_DATE)
);

-- Indexes
CREATE INDEX idx_reminders_user_id ON reminders(user_id, created_at DESC);
CREATE INDEX idx_reminders_next_notification ON reminders(next_notification_date) WHERE next_notification_date IS NOT NULL;
CREATE INDEX idx_reminders_guest_phone ON reminders(guest_phone) WHERE guest_phone IS NOT NULL;
CREATE INDEX idx_reminders_station_id ON reminders(station_id);
CREATE INDEX idx_reminders_plate ON reminders(plate);

-- RLS Policies
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON reminders FOR DELETE
  USING (auth.uid() = user_id);
```

**Columns:**
- `id`: Primary key
- `user_id`: FK to user_profiles (NULL for guest reminders)
- `station_id`: FK to kiosk_stations (for guest reminders from kiosk)
- `type`: Reminder type ('ITP', 'RCA', 'Rovinieta')
- `plate`: License plate (e.g., 'B-123-ABC')
- `expiry_date`: Document expiration date
- `next_notification_date`: Next scheduled notification (calculated by trigger)
- `guest_phone`: Phone for guest users (E.164 format)
- `guest_name`: Name for guest users
- `email_notifications`: Enable email notifications (for registered users)
- `sms_notifications`: Enable SMS notifications
- `consent_given`: GDPR consent flag
- `consent_timestamp`: When consent was given

**Trigger: Auto-calculate next_notification_date**

```sql
CREATE OR REPLACE FUNCTION update_next_notification_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate 7 days before expiry for first notification
  NEW.next_notification_date := NEW.expiry_date - INTERVAL '7 days';

  -- Ensure notification date is in the future
  IF NEW.next_notification_date < CURRENT_DATE THEN
    NEW.next_notification_date := CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_next_notification_date
  BEFORE INSERT OR UPDATE OF expiry_date
  ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_next_notification_date();
```

---

### kiosk_stations

Service station configurations for kiosk mode and white-label branding.

```sql
CREATE TABLE kiosk_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#10B981',
  contact_phone TEXT,
  station_address TEXT,
  sms_template TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_kiosk_stations_slug ON kiosk_stations(slug);
CREATE INDEX idx_kiosk_stations_active ON kiosk_stations(active);

-- RLS Policies
ALTER TABLE kiosk_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON kiosk_stations FOR SELECT
  USING (active = true);

-- Only admins can INSERT/UPDATE/DELETE (handled via service role key)
```

**Columns:**
- `id`: Primary key
- `slug`: URL-friendly identifier (e.g., 'euro-auto-service')
- `name`: Station display name
- `logo_url`: Station logo URL
- `primary_color`: Brand color (hex format)
- `secondary_color`: Secondary brand color
- `contact_phone`: Station contact phone
- `station_address`: Physical address
- `sms_template`: Custom SMS template with placeholders
- `active`: Station active status

**Example SMS Template:**
```
ITP pentru {plate} expira pe {date}.

Programeaza inspectia la {station_name}!
Telefon: {station_phone}

Pentru a gestiona remindere, viziteaza: {app_url}

Dezabonare: {opt_out_link}
```

---

### notification_log

Audit trail for all sent notifications (email and SMS).

```sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  recipient TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  provider TEXT CHECK (provider IN ('notifyhub', 'calisero', 'twilio')),
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notification_log_reminder_id ON notification_log(reminder_id, created_at DESC);
CREATE INDEX idx_notification_log_status ON notification_log(status, created_at DESC);
CREATE INDEX idx_notification_log_provider_id ON notification_log(provider_message_id);

-- RLS Policies
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
  ON notification_log FOR SELECT
  USING (
    reminder_id IN (
      SELECT id FROM reminders WHERE user_id = auth.uid()
    )
  );
```

**Columns:**
- `id`: Primary key
- `reminder_id`: FK to reminders
- `type`: Notification type ('email' or 'sms')
- `recipient`: Email address or phone number
- `message_body`: Full message content (for audit)
- `status`: Delivery status
- `provider`: SMS provider used (for SMS)
- `provider_message_id`: Provider's message ID (for tracking)
- `error_message`: Error details if failed
- `sent_at`: When notification was sent
- `delivered_at`: When notification was delivered (for SMS with DLR)

---

### global_opt_outs

Tracks phone numbers that opted out of SMS notifications (GDPR compliance).

```sql
CREATE TABLE global_opt_outs (
  phone TEXT PRIMARY KEY,
  opted_out_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

-- Indexes
CREATE INDEX idx_global_opt_outs_phone ON global_opt_outs(phone);

-- RLS Policies
ALTER TABLE global_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for opt-out check"
  ON global_opt_outs FOR SELECT
  USING (true);

-- Only system can INSERT (via service role key)
```

**Columns:**
- `phone`: Phone number (E.164 format, primary key)
- `opted_out_at`: Opt-out timestamp
- `reason`: Opt-out reason (optional)

---

## Common Queries

### Get User's Reminders

```sql
-- Ordered by expiry date (soonest first)
SELECT
  id,
  type,
  plate,
  expiry_date,
  next_notification_date,
  email_notifications,
  sms_notifications,
  created_at
FROM reminders
WHERE user_id = auth.uid()
ORDER BY expiry_date ASC;
```

### Get Reminders Due for Notification Today

```sql
-- Used by daily cron job
SELECT
  r.*,
  u.email,
  u.phone,
  u.name,
  u.sms_notifications AS user_sms_pref,
  s.name AS station_name,
  s.contact_phone AS station_phone
FROM reminders r
LEFT JOIN user_profiles u ON r.user_id = u.id
LEFT JOIN kiosk_stations s ON r.station_id = s.id
WHERE r.next_notification_date <= CURRENT_DATE
AND NOT EXISTS (
  SELECT 1 FROM global_opt_outs
  WHERE phone = COALESCE(u.phone, r.guest_phone)
)
ORDER BY r.expiry_date ASC;
```

### Check if Phone Number Opted Out

```sql
SELECT EXISTS (
  SELECT 1 FROM global_opt_outs
  WHERE phone = '+40712345678'
) AS is_opted_out;
```

### Get Notification History for Reminder

```sql
SELECT
  nl.type,
  nl.recipient,
  nl.status,
  nl.provider,
  nl.sent_at,
  nl.delivered_at,
  nl.error_message
FROM notification_log nl
WHERE nl.reminder_id = 'reminder-uuid-here'
ORDER BY nl.created_at DESC;
```

### Get Station Reminder Statistics

```sql
SELECT
  s.id,
  s.name,
  s.slug,
  COUNT(r.id) AS total_reminders,
  COUNT(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS reminders_last_30d
FROM kiosk_stations s
LEFT JOIN reminders r ON r.station_id = s.id
GROUP BY s.id, s.name, s.slug
ORDER BY total_reminders DESC;
```

---

## Migrations

### Apply Migrations (Development)

```bash
# Using Supabase CLI
cd /home/johntuca/Desktop/uitdeitp-app-standalone
supabase db push
```

### Apply Migrations (Production)

```sql
-- Connect to production Supabase via SQL Editor
-- https://app.supabase.com/project/dnowyodhffqqhmakjupo/editor

-- Run migrations in order:
-- 001_create_user_profiles.sql
-- 002_create_kiosk_stations.sql
-- 003_create_reminders.sql
-- 004_create_notification_log.sql
-- 005_create_global_opt_outs.sql
```

### Rollback Strategy

**Option 1: Create Rollback Migration**
```sql
-- Example: 006_rollback_reminders_trigger.sql
DROP TRIGGER IF EXISTS trigger_update_next_notification_date ON reminders;
DROP FUNCTION IF EXISTS update_next_notification_date();
```

**Option 2: Restore from Backup**
```bash
# Supabase provides daily backups
# Restore via Supabase Dashboard → Database → Backups
```

---

## Database Maintenance

### Vacuum and Analyze

```sql
-- Run weekly to optimize query performance
VACUUM ANALYZE user_profiles;
VACUUM ANALYZE reminders;
VACUUM ANALYZE notification_log;
```

### Index Maintenance

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- Drop unused indexes (idx_scan = 0 and table is large)
```

### Archive Old Notification Logs

```sql
-- Keep only last 90 days
DELETE FROM notification_log
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
```

---

## Performance Monitoring

### Slow Query Detection

```sql
-- Queries taking > 1 second
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Table Sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY bytes DESC;
```

---

## Backup and Recovery

### Automated Backups

Supabase provides:
- **Daily backups**: Automatic, retained for 7 days (free tier)
- **Point-in-time recovery**: Available on Pro plan

### Manual Backup

```bash
# Export specific tables
pg_dump -h db.dnowyodhffqqhmakjupo.supabase.co \
  -U postgres \
  -t reminders \
  -t user_profiles \
  -F c \
  -f backup-$(date +%Y%m%d).dump
```

### Restore from Backup

```bash
# Restore specific table
pg_restore -h db.dnowyodhffqqhmakjupo.supabase.co \
  -U postgres \
  -d postgres \
  -t reminders \
  backup-20251104.dump
```

---

## Security Best Practices

1. **Row Level Security (RLS)**: Enabled on all user-facing tables
2. **Service Role Key**: Only used server-side, never exposed to browser
3. **Anon Key**: Safe for browser, limited by RLS policies
4. **Parameterized Queries**: Supabase client prevents SQL injection
5. **Audit Logging**: All notifications logged for compliance

---

## Troubleshooting

### Common Issues

**Issue**: User can't see their reminders
**Solution**: Check RLS policies, verify `auth.uid()` matches `user_id`

**Issue**: Trigger not firing
**Solution**: Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_next_notification_date';`

**Issue**: Slow queries
**Solution**: Check missing indexes, run `EXPLAIN ANALYZE` on slow queries

**Issue**: Storage quota exceeded
**Solution**: Archive old notification_log entries, check table sizes

---

**Last Updated**: 2025-11-04
**Version**: 2.0.0
