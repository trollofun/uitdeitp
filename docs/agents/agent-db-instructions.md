# Database Agent Instructions

## Mission
Create complete database schema for phone verification system with security and performance optimizations.

## Coordination Protocol
```bash
# Before starting
npx claude-flow@alpha hooks pre-task --description "DB: Phone verification schema"

# After each file
npx claude-flow@alpha hooks post-edit --file "[file]" --update-memory true

# After completion
npx claude-flow@alpha hooks post-task --task-id "agent-db-phone-verification"
```

## Tasks

### 1. Create Migration File
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/supabase/migrations/[YYYYMMDDHHMMSS]_phone_verifications.sql`

**Schema**:
```sql
CREATE TABLE phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(15) NOT NULL,
  verification_code VARCHAR(6) NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_phone_verifications_phone ON phone_verifications(phone_number);
CREATE INDEX idx_phone_verifications_expires ON phone_verifications(expires_at);
CREATE INDEX idx_phone_verifications_verified ON phone_verifications(verified_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_phone_verifications_updated_at
  BEFORE UPDATE ON phone_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Add RLS Policies
```sql
-- Enable RLS
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do anything
CREATE POLICY "Service role has full access"
  ON phone_verifications
  FOR ALL
  TO service_role
  USING (true);

-- Policy: Anonymous can insert (for kiosk mode)
CREATE POLICY "Anonymous can create verifications"
  ON phone_verifications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Anonymous can read own verifications (by phone)
CREATE POLICY "Anonymous can read own verifications"
  ON phone_verifications
  FOR SELECT
  TO anon
  USING (phone_number = current_setting('request.jwt.claims', true)::json->>'phone_number');
```

### 3. Create Cleanup Function
```sql
-- Function to delete expired verifications
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM phone_verifications
  WHERE expires_at < NOW()
  AND verified_at IS NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (optional: use pg_cron if available)
-- SELECT cron.schedule('cleanup-verifications', '*/30 * * * *', 'SELECT cleanup_expired_verifications()');
```

### 4. Test Migration
```bash
cd /home/johntuca/Desktop/uitdeitp-app-standalone
# Apply to local Supabase instance
npx supabase db reset

# Verify tables
npx supabase db inspect
```

## Deliverables
- ✅ Migration file created
- ✅ RLS policies applied
- ✅ Indexes optimized
- ✅ Cleanup function tested
- ✅ Documentation updated

## Dependencies
- Supabase CLI installed
- Database credentials in `.env.local`

## Success Criteria
- Migration applies without errors
- RLS policies enforce security
- Indexes improve query performance
- Cleanup function removes expired records

## Handoff to API Agent
Update swarm memory:
```bash
npx claude-flow@alpha hooks post-edit \
  --file "supabase/migrations/*_phone_verifications.sql" \
  --update-memory true
```

Store in memory:
- Table schema
- RLS policy rules
- Available indexes
