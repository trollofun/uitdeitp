# Kiosk Mode - Quick Start Guide

## 5-Minute Setup

### Step 1: Create Database Schema (1 min)

```bash
# Run the setup script
./KIOSK_SETUP.sh
```

Or manually execute this SQL:

```sql
-- Create table
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

-- Indexes
CREATE INDEX idx_kiosk_station ON kiosk_registrations(station_id);
CREATE INDEX idx_kiosk_phone ON kiosk_registrations(guest_phone);
CREATE INDEX idx_kiosk_plate ON kiosk_registrations(plate_number);
CREATE INDEX idx_kiosk_expiry ON kiosk_registrations(expiry_date);

-- RLS
ALTER TABLE kiosk_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Station owners view registrations"
ON kiosk_registrations FOR SELECT
USING (station_id IN (SELECT id FROM stations WHERE owner_id = auth.uid()));

CREATE POLICY "Service role inserts"
ON kiosk_registrations FOR INSERT TO service_role WITH CHECK (true);
```

### Step 2: Enable Kiosk for a Station (1 min)

```sql
-- Enable kiosk mode
UPDATE stations
SET kiosk_enabled = true,
    primary_color = '#3b82f6',  -- Optional: set brand color
    logo_url = 'https://your-url.com/logo.png'  -- Optional: set logo
WHERE station_slug = 'your-station-slug';
```

### Step 3: Configure Next.js Images (1 min)

Edit `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'your-supabase-project.supabase.co',
      'storage.supabase.co',
      // Add any other image hosting domains
    ],
  },
};

module.exports = nextConfig;
```

### Step 4: Test the Kiosk (2 min)

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Access kiosk:**
   ```
   http://localhost:3000/kiosk/your-station-slug
   ```

3. **Complete workflow:**
   - Click "Setează Reminder ITP"
   - Enter name: "Ion Popescu"
   - Enter phone: "0744123456" (auto-converts to +40744123456)
   - Enter plate: "B123ABC" (auto-formats to B-123-ABC)
   - Select expiry date from calendar
   - Check GDPR consent
   - Submit

4. **Verify in database:**
   ```sql
   SELECT * FROM kiosk_registrations ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM reminders WHERE source = 'kiosk' ORDER BY created_at DESC LIMIT 1;
   ```

---

## Production Deployment

### Option 1: Dedicated Kiosk Subdomain

```nginx
# kiosk.uitdeitp.ro
location /kiosk/ {
  proxy_pass http://localhost:3000/kiosk/;
}
```

### Option 2: Station-Specific URLs

```nginx
# station-itp-cluj.uitdeitp.ro → /kiosk/itp-cluj-napoca
location / {
  proxy_pass http://localhost:3000/kiosk/itp-cluj-napoca;
}
```

### Hardware Setup

1. **Get tablet:** Android/iOS tablet (10-15")
2. **Install browser:** Chrome/Safari latest
3. **Enable kiosk mode:**
   - Android: Use Kiosk Browser app
   - iOS: Use Guided Access (Settings → Accessibility)
4. **Set homepage:**
   ```
   https://kiosk.uitdeitp.ro/your-station-slug
   ```
5. **Auto-refresh:** Daily at 3AM (browser extension or cron job)
6. **Mount:** 120-140cm height, slight tilt (10-15°)

---

## Customization

### Change Colors

```sql
UPDATE stations SET primary_color = '#10b981' WHERE station_slug = 'your-slug';
```

**Colors to try:**
- Blue: `#3b82f6` (default)
- Green: `#10b981`
- Purple: `#8b5cf6`
- Red: `#ef4444`
- Orange: `#f97316`

### Upload Logo

1. **Upload to Supabase Storage:**
   ```bash
   supabase storage upload logos your-logo.png
   ```

2. **Update database:**
   ```sql
   UPDATE stations
   SET logo_url = 'https://your-project.supabase.co/storage/v1/object/public/logos/your-logo.png'
   WHERE station_slug = 'your-slug';
   ```

**Logo specs:**
- Format: PNG with transparency
- Size: 500x500px (square)
- Max: 500KB
- Simple design (recognizable at small sizes)

---

## Troubleshooting

### Issue: 404 Not Found

**Check:**
1. Is `kiosk_enabled = true`?
   ```sql
   SELECT kiosk_enabled FROM stations WHERE station_slug = 'your-slug';
   ```
2. Is URL correct? `/kiosk/[station_slug]` (not `/kiosk/[id]`)

**Fix:**
```sql
UPDATE stations SET kiosk_enabled = true WHERE station_slug = 'your-slug';
```

### Issue: Logo Not Showing

**Check:**
1. Is `logo_url` valid?
   ```sql
   SELECT logo_url FROM stations WHERE station_slug = 'your-slug';
   ```
2. Is domain in `next.config.js`?

**Fix:**
Add domain to `next.config.js` and restart server.

### Issue: Validation Failing

**Common mistakes:**
- Phone: Missing `+40` or wrong length (needs 9 digits after +40)
- Plate: Missing hyphens (B123ABC → B-123-ABC) or lowercase
- Date: Past date or >5 years ahead

**Debug:**
Open browser console (F12) to see validation errors.

---

## Analytics Queries

### Daily Registrations
```sql
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS registrations
FROM kiosk_registrations
GROUP BY date
ORDER BY date DESC;
```

### Registrations by Station
```sql
SELECT
  s.station_name,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE kr.created_at > now() - interval '7 days') AS last_7_days
FROM kiosk_registrations kr
JOIN stations s ON kr.station_id = s.id
GROUP BY s.station_name
ORDER BY total DESC;
```

### Recent Registrations
```sql
SELECT
  s.station_name,
  kr.guest_name,
  kr.guest_phone,
  kr.plate_number,
  kr.expiry_date,
  kr.created_at
FROM kiosk_registrations kr
JOIN stations s ON kr.station_id = s.id
ORDER BY kr.created_at DESC
LIMIT 10;
```

---

## URLs

**Frontend:**
- Development: `http://localhost:3000/kiosk/[station-slug]`
- Production: `https://kiosk.uitdeitp.ro/[station-slug]`

**API:**
- Station config: `GET /api/kiosk/station/[station-slug]`
- Submit registration: `POST /api/kiosk/submit`

---

## Testing Checklist

- [ ] Database schema created (`kiosk_registrations` table exists)
- [ ] Station enabled (`kiosk_enabled = true`)
- [ ] Kiosk URL accessible (`/kiosk/[station-slug]`)
- [ ] Logo displays (if configured)
- [ ] Primary color applies to buttons
- [ ] Phone validation works (+40 auto-prefix)
- [ ] Plate validation works (auto-uppercase, hyphens)
- [ ] Calendar date selection works
- [ ] GDPR consent required before submit
- [ ] Success screen shows and auto-resets (30s)
- [ ] Data saved to `kiosk_registrations` table
- [ ] Reminder created in `reminders` table
- [ ] Analytics event logged

---

## Support

**Documentation:**
- Implementation: `/docs/KIOSK_MODE_IMPLEMENTATION.md`
- Usage Guide: `/docs/KIOSK_USAGE_GUIDE.md`
- Delivery Summary: `/docs/KIOSK_DELIVERY_SUMMARY.md`

**Database Setup:**
- Script: `/KIOSK_SETUP.sh`

**Issues:**
- Tag with `kiosk-mode` label
- Contact: SWARM 3 - Frontend Developer

---

**Version:** 1.0.0
**Last Updated:** 2025-11-05
**Status:** Production Ready
