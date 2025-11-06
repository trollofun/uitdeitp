# Kiosk Mode - Usage Guide

## Quick Start

### Accessing the Kiosk

**URL Format:**
```
https://your-domain.com/kiosk/[station-slug]
```

**Example:**
```
https://uitdeitp.ro/kiosk/itp-cluj-napoca
https://uitdeitp.ro/kiosk/service-auto-bucuresti
```

### Prerequisites

1. **Station must be configured in database** with:
   - `kiosk_enabled = true`
   - Valid `station_slug` (URL-friendly identifier)
   - Optional: `logo_url`, `primary_color`, `station_phone`

2. **Database table:** `kiosk_registrations` (see schema below)

## User Flow (7 Steps)

### Step 1: Idle Screen
- Large button: "Setează Reminder ITP"
- Station logo displayed (if configured)
- Clean, minimal UI to attract attention

### Step 2: Name Input
- User enters full name (minimum 2 characters)
- Accepts Romanian diacritics (ă, â, î, ș, ț)
- Real-time validation feedback
- Press Enter or click "Continuă"

### Step 3: Phone Number
- Auto-prefixed with `+40`
- User enters 9 digits (7XXXXXXXX)
- Validates Romanian mobile format
- Normalizes to international format (+407XXXXXXXX)

### Step 4: License Plate
- Format: XX-XXX-ABC (e.g., B-123-ABC)
- Auto-converts to uppercase
- Auto-inserts hyphens if missing
- Validates Romanian plate format

### Step 5: Expiry Date
- Visual calendar component
- Past dates disabled
- Maximum 5 years in future
- Click date to select

### Step 6: GDPR Consent
- Checkbox with explicit consent text:
  > "Accept prelucrarea datelor mele personale (nume, telefon, număr auto) în scopul trimiterii de reminder-uri SMS/Email despre expirarea ITP..."
- Must be checked to proceed
- IP address captured for GDPR compliance

### Step 7: Success
- Confirmation message: "Reminder Salvat!"
- Displays station contact phone
- CTA to create account on uitdeITP.ro
- Auto-resets to Step 1 after 30 seconds

## Station Configuration

### Database: `stations` Table

Required fields for kiosk mode:
```sql
CREATE TABLE stations (
  id UUID PRIMARY KEY,
  station_name TEXT NOT NULL,
  station_slug TEXT UNIQUE NOT NULL,
  station_phone TEXT,
  station_email TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  city TEXT,
  address TEXT,
  kiosk_enabled BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Example Configuration:**
```json
{
  "station_name": "ITP Cluj-Napoca",
  "station_slug": "itp-cluj-napoca",
  "station_phone": "+40744123456",
  "logo_url": "https://storage.supabase.co/logos/itp-cluj.png",
  "primary_color": "#3b82f6",
  "city": "Cluj-Napoca",
  "kiosk_enabled": true
}
```

### Branding Customization

**Primary Color:**
Applied to:
- Header border (bottom 4px)
- Buttons (background)
- Progress indicator dots
- Step indicator rings
- Success icon

**Logo:**
- Displayed in header (16x16 size)
- Also shown on idle screen (32x32 size)
- Recommended: PNG with transparency, square aspect ratio

## Database Schema

### `kiosk_registrations` Table

```sql
CREATE TABLE kiosk_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id) NOT NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_ip TEXT,
  consent_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_phone CHECK (guest_phone ~ '^\+40[0-9]{9}$'),
  CONSTRAINT valid_plate CHECK (plate_number ~ '^[A-Z]{1,2}-[0-9]{2,3}-[A-Z]{3}$')
);

-- Indexes for performance
CREATE INDEX idx_kiosk_station ON kiosk_registrations(station_id);
CREATE INDEX idx_kiosk_phone ON kiosk_registrations(guest_phone);
CREATE INDEX idx_kiosk_plate ON kiosk_registrations(plate_number);
CREATE INDEX idx_kiosk_expiry ON kiosk_registrations(expiry_date);
```

### `reminders` Table (existing)

Kiosk registrations create reminder records with:
```json
{
  "user_id": null,
  "vehicle_id": null,
  "reminder_type": "itp",
  "expiry_date": "2025-12-31",
  "notification_offset_days": 30,
  "is_active": true,
  "source": "kiosk",
  "metadata": {
    "kiosk_registration_id": "uuid",
    "station_slug": "itp-cluj-napoca",
    "guest_name": "Ion Popescu",
    "guest_phone": "+40744123456",
    "plate_number": "B-123-ABC"
  }
}
```

## API Endpoints

### GET `/api/kiosk/station/[station_slug]`

**Purpose:** Fetch station configuration for branding

**Response:**
```json
{
  "id": "uuid",
  "station_name": "ITP Cluj-Napoca",
  "station_slug": "itp-cluj-napoca",
  "station_phone": "+40744123456",
  "logo_url": "https://...",
  "primary_color": "#3b82f6",
  "city": "Cluj-Napoca",
  "kiosk_enabled": true,
  "owner_id": "uuid"
}
```

**Error Cases:**
- `404`: Station not found or kiosk disabled

### POST `/api/kiosk/submit`

**Purpose:** Submit guest registration

**Request Body:**
```json
{
  "station_id": "uuid",
  "station_slug": "itp-cluj-napoca",
  "guest_name": "Ion Popescu",
  "guest_phone": "+40744123456",
  "plate_number": "B-123-ABC",
  "expiry_date": "2025-12-31T00:00:00.000Z",
  "consent_given": true
}
```

**Response (Success):**
```json
{
  "success": true,
  "registration_id": "uuid",
  "message": "Reminder salvat cu succes!"
}
```

**Response (Validation Error):**
```json
{
  "error": "Validation failed",
  "errors": {
    "phone": "Număr invalid. Format: +407XXXXXXXX sau 07XXXXXXXX",
    "plateNumber": "Număr invalid. Format: XX-XXX-ABC (ex: B-123-ABC)"
  }
}
```

## Validation Rules

### Phone Number
- **Accepted Formats:**
  - `+407XXXXXXXX` (10 digits after +40)
  - `07XXXXXXXX` (starts with 07, 10 digits)
- **Auto-normalization:** Converts `07...` → `+407...`
- **Regex:** `/^\+40[0-9]{9}$/` or `/^07[0-9]{8}$/`

### License Plate
- **Format:** `XX-XXX-ABC`
  - 1-2 letters (county code)
  - 2-3 digits
  - 3 letters
- **Examples:** B-123-ABC, CJ-45-XYZ, IF-678-DEF
- **Auto-normalization:** Uppercase + hyphen insertion
- **Regex:** `/^[A-Z]{1,2}-[0-9]{2,3}-[A-Z]{3}$/`

### Name
- **Min Length:** 2 characters
- **Allowed:** Letters, spaces, Romanian diacritics (ă, â, î, ș, ț)
- **Regex:** `/^[a-zA-ZăâîșțĂÂÎȘȚ\s-]+$/`

### Expiry Date
- **Must be:** Future date (today or later)
- **Max:** 5 years from today
- **Format:** ISO 8601 (YYYY-MM-DD)

### GDPR Consent
- **Required:** `true` (checkbox must be checked)
- **Captured:** IP address from request headers (`x-forwarded-for` or `x-real-ip`)

## Hardware Recommendations

### Kiosk Tablet/Device
- **Screen Size:** 10-15 inches
- **Touch:** Capacitive touch screen (10-point multi-touch)
- **Resolution:** Minimum 1920x1080 for clarity
- **OS:** Android 10+ or iOS 14+ (for browser support)
- **Browser:** Chrome/Safari latest version
- **Network:** Stable WiFi or Ethernet connection

### Mounting
- **Height:** 120-140cm from floor (average standing height)
- **Angle:** Slight tilt (10-15°) for ergonomics
- **Accessibility:** Consider wheelchair users (adjustable height recommended)

### Security
- **Kiosk Mode:** Enable browser kiosk/fullscreen mode
- **Disable:** Home button, app switching, notifications
- **Auto-refresh:** Daily at 3AM to clear cache
- **Monitoring:** Remote management for updates and troubleshooting

## Customization Guide

### Changing Primary Color

1. **Via Database:**
```sql
UPDATE stations
SET primary_color = '#10b981' -- Green
WHERE station_slug = 'itp-cluj-napoca';
```

2. **CSS Variables (optional):**
The layout applies color via inline styles, but you can extend with CSS variables in `globals.css`:
```css
:root {
  --station-primary: #2563eb; /* Default blue */
}
```

### Uploading Station Logo

1. **Upload to Supabase Storage:**
```bash
supabase storage upload logos station-logo.png
```

2. **Update Database:**
```sql
UPDATE stations
SET logo_url = 'https://your-supabase.co/storage/v1/object/public/logos/station-logo.png'
WHERE station_slug = 'itp-cluj-napoca';
```

3. **Recommended Logo:**
   - Format: PNG with transparency
   - Size: 500x500px (square)
   - Max file size: 500KB
   - Simple design (recognizable at small sizes)

## Analytics & Tracking

### Metrics Captured

**`analytics_events` Table:**
```json
{
  "event_type": "kiosk_registration",
  "event_data": {
    "station_id": "uuid",
    "station_slug": "itp-cluj-napoca",
    "registration_id": "uuid"
  },
  "timestamp": "2025-11-05T12:34:56.789Z"
}
```

**Useful Queries:**

**Daily Registrations per Station:**
```sql
SELECT
  e.event_data->>'station_slug' AS station,
  DATE(e.timestamp) AS date,
  COUNT(*) AS registrations
FROM analytics_events e
WHERE e.event_type = 'kiosk_registration'
GROUP BY station, date
ORDER BY date DESC;
```

**Conversion Rate (Started vs Completed):**
```sql
-- Add events for step 2 (started) and step 7 (completed) to track dropout
```

## Troubleshooting

### Issue: Station Not Found (404)

**Causes:**
1. `kiosk_enabled = false` in database
2. Invalid `station_slug` in URL
3. Station deleted or archived

**Fix:**
```sql
UPDATE stations
SET kiosk_enabled = true
WHERE station_slug = 'your-slug';
```

### Issue: Logo Not Displaying

**Causes:**
1. Invalid `logo_url` (404)
2. CORS issue with image host
3. Next.js Image domain not configured

**Fix:**
Add domain to `next.config.js`:
```javascript
module.exports = {
  images: {
    domains: ['your-supabase.co', 'storage.supabase.co'],
  },
};
```

### Issue: Validation Failing

**Common Mistakes:**
- Phone: Missing `+40` prefix or wrong length
- Plate: Missing hyphens or lowercase letters
- Date: Past date selected or more than 5 years ahead

**Debug:**
Check browser console for validation error messages.

### Issue: Auto-Reset Not Working

**Cause:** User interaction preventing timeout

**Fix:**
Ensure no hover states or animations are active. The 30-second timer starts immediately when Step 7 is reached.

## Security Considerations

### GDPR Compliance
- Explicit consent required before data collection
- IP address logged for audit trail
- Users informed about data usage (SMS/Email reminders)
- Data can be deleted on request (implement GDPR erasure)

### Rate Limiting
**Recommended:** Add rate limiting to prevent abuse
```typescript
// Example: Max 10 registrations per IP per hour
const RATE_LIMIT = 10;
const RATE_WINDOW = 3600; // 1 hour in seconds
```

### Data Validation
- Server-side validation (never trust client)
- SQL injection prevention (Supabase parameterized queries)
- XSS prevention (React auto-escapes)

### Network Security
- HTTPS required (no plain HTTP)
- CORS configured for API routes
- Supabase RLS policies enabled

## Future Enhancements

### Planned Features (v2.0)
- [ ] Multi-language support (RO/EN/HU)
- [ ] QR code generation for quick access
- [ ] SMS verification code (optional)
- [ ] Barcode scanner for VIN/plate reading
- [ ] Voice input for name entry
- [ ] Print receipt option
- [ ] Guest loyalty program (repeat visits)
- [ ] Integration with station scheduling system

### Admin Dashboard Ideas
- Real-time kiosk status monitoring
- Daily/weekly registration reports
- Heatmap of usage times
- Device health monitoring
- Remote kiosk restart/refresh

---

**Version:** 1.0.0
**Last Updated:** 2025-11-05
**Author:** SWARM 3 - Frontend Developer
**Support:** For issues, contact dev team or check `/docs/KIOSK_MODE_IMPLEMENTATION.md`
