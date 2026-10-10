# Customer Match Export Script

## Purpose

Export customer phone numbers from uitdeitp database for Google Ads Customer Match.

This script extracts phone numbers from existing customers (with GDPR consent), normalizes them to E.164 format, hashes them with SHA-256, and generates a CSV file ready for Google Ads upload.

## Usage

### Basic Export (Hashed CSV Only)

```bash
node scripts/customer-match-export.js
```

### Dry Run (Test Without Writing Files)

```bash
node scripts/customer-match-export.js --dry-run
```

### Include Unhashed CSV (For Verification)

```bash
node scripts/customer-match-export.js --include-unhashed
```

**⚠️ SECURITY WARNING:** The unhashed CSV contains sensitive customer data. It is:
- Written with `600` permissions (owner-only read/write)
- Stored locally ONLY (not uploaded to Paperclip or cloud)
- Intended for local verification purposes only

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin access)

Optional:
- `CUSTOMER_MATCH_OUTPUT_DIR` - Custom output directory (default: `/srv/eas/customer-match`)

## Output

### File Locations

**Default:** `/srv/eas/customer-match/clienti-itp-YYYY-MM-DD.csv`

**Fallback (if no /srv permissions):** `./data/customer-match/clienti-itp-YYYY-MM-DD.csv`

### File Format

CSV with single column:
```
Phone
<sha256_hash_of_phone_1>
<sha256_hash_of_phone_2>
...
```

Example:
```
Phone
661c3746419d49965a4a2e8ecd312f3448bdbb5c605974d9298cfac77ac92ca5
b0f26627781e1e058309c0a5f95c5530c2c52ed75e93af331f9c6ad50994e164
```

## Data Sources

The script extracts phone numbers from:

1. **reminder_contacts** table (many-to-many, if populated)
2. **user_profiles** table (registered users with phone numbers)
3. **reminders** table (legacy guest_phone field)

## Data Processing

### Normalization

All phone numbers are normalized to E.164 format (`+40XXXXXXXXX`):

- `0712345678` → `+40712345678`
- `0040712345678` → `+40712345678`
- `40712345678` → `+40712345678`
- `+40712345678` → `+40712345678` (already normalized)

### Validation

Phone numbers are validated for:
- **Length:** Must be 12 characters (`+40` + 9 digits)
- **Prefix:** Must start with valid Romanian prefixes:
  - `+407` (mobile)
  - `+402` (landline)
  - `+403` (landline)

### Exclusions

Phone numbers are excluded if:
- Invalid format (not E.164)
- Not Romanian (doesn't match prefix rules)
- Present in `global_opt_outs` table (user opted out)

### Deduplication

Duplicate phone numbers are automatically removed. Only unique phone numbers are included in the final CSV.

## Google Ads Customer Match Requirements

### Account Eligibility

Customer Match is available for this account (786-977-5567) but with limitations:

- **Lifetime Spend:** ~$16,9k USD (< $50k threshold)
- **Permitted Uses:** Observation, Exclusion, Performance Max signals
- **NOT Permitted:** Direct targeting/segmentation

### List Size Requirements

- **Minimum for activation:** 100 members
- **Current export:** 97 members (see EUR-123)
- **Status:** List can be uploaded but won't activate until threshold is met

### Upload Process

1. Navigate to Google Ads → Tools → Audience Manager
2. Click "Customer List" under "Data Sources"
3. Upload the hashed CSV file (`clienti-itp-YYYY-MM-DD.csv`)
4. Match: Phone numbers only
5. Wait for Google to process and match against their user database

### Expected Match Rate

Typical match rates for Romanian phone numbers: 40-60%

With 97 hashed phones:
- Expected matches: ~40-60 users
- This is below the 100 member minimum for active use
- List will be created but status will be "Below minimum"

## GDPR Compliance

✅ **All data exported meets GDPR requirements:**

1. **Consent:** All customers signed ITP request forms containing data processing consent clause
2. **Purpose Limitation:** Data used only for ITP reminder service and related marketing (Google Ads)
3. **Opt-Out Honored:** Phone numbers in `global_opt_outs` table are excluded
4. **Data Minimization:** Only phone numbers exported (no names, addresses, etc.)
5. **Security:** Phone numbers hashed with SHA-256 before upload to Google

## Monitoring

### Statistics Logged

Each run logs:
- Total source rows processed
- Valid distinct phone numbers found
- Invalid format count (with sample errors)
- Opted-out count
- Duplicate count
- Final CSV file path
- File SHA-256 hash (for integrity verification)

### Error Handling

Errors logged and reported:
- Database connection failures
- Invalid phone number formats (logged but processing continues)
- File write permissions (script exits)

## Automation

### Monthly Refresh (Recommended)

Add to cron:

```bash
# Monthly on 1st at 02:00
0 2 1 * * cd /home/john/.hermes/profiles/beba/uitdeitp && node scripts/customer-match-export.js
```

### Vercel Cron (Alternative)

Create API endpoint at `/api/cron/customer-match-export`:

```typescript
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run export
  const { spawn } = require('child_process');
  const export_process = spawn('node', ['scripts/customer-match-export.js']);

  return NextResponse.json({ success: true });
}
```

## Security Notes

1. **Never commit unhashed files** to git
2. **Service role key** gives full database access - guard carefully
3. **Hashed files are safe** to upload (SHA-256 is one-way)
4. **Google doesn't receive plain text** phone numbers (only hashes)
5. **Match happens on Google's side** (they hash their user database and compare)

## Troubleshooting

### "Permission denied" creating /srv/eas/customer-match

**Solution:** Script automatically falls back to `./data/customer-match/`. To use /srv:

```bash
sudo mkdir -p /srv/eas/customer-match
sudo chown john:john /srv/eas/customer-match
```

### "Less than 100 valid phone numbers" warning

**Expected behavior** for current database size. Options:
- Continue growing customer base organically
- Still upload list (Google will activate when threshold is reached)
- Use for observation/exclusion (doesn't require minimum)

### Database connection errors

**Check:**
1. Environment variables set correctly (`.env.local`)
2. Supabase project online (https://app.supabase.com)
3. Network connectivity

### Invalid phone number formats

**Review errors** in script output. Common issues:
- International format (non-Romanian)
- Incomplete numbers (missing digits)
- Special characters not removed

## Version History

- **2026-10-10:** Initial version (EUR-123)
  - Extract from reminder_contacts, user_profiles, and legacy guest_phone
  - SHA-256 hashing for Customer Match
  - GDPR-compliant data handling
  - Automatic directory fallback

## Related Issues

- **EUR-123:** Export customer phones for Google Ads Customer Match
- **EUR-113:** Google Ads + bază clienți ITP (task comun)
- **EUR-117:** Reminder contacts many-to-many + deduplication

## Owner

**Agent:** Uitdeitp (87aba536-e353-4e7c-9582-5d3983e76dee)  
**Company:** ea2c02e1-c278-4c8b-b5e7-d502a5276975  
**Created:** 2026-10-10
