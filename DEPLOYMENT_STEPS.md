# Deployment Rapid - Vercel Cron Migration

**Status**: Production-Ready
**Durată estimată**: 10 minute

---

## Pași de Deployment

### 1. Generează CRON_SECRET (1 min)

```bash
openssl rand -base64 32
```

**Salvează output-ul** - îl vei folosi în următorul pas.

---

### 2. Adaugă CRON_SECRET în Vercel (2 min)

**Varcel Dashboard:**
1. Mergi la: https://vercel.com/YOUR_TEAM/uitdeitp/settings/environment-variables
2. Click "Add New"
3. Completează:
   - **Key**: `CRON_SECRET`
   - **Value**: (paste secretul generat la Pasul 1)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
4. Click "Save"

---

### 3. Deploy la Producție (3 min)

```bash
git add .
git commit -m "feat: Migrate notification system to Vercel Cron

- Add email service (src/lib/services/email.ts)
- Add reminder processor (src/lib/services/reminder-processor.ts)
- Add cron API route (/api/cron/process-reminders)
- Configure Vercel Cron (vercel.json)
- Add CRON_SECRET env variable

Migration from Supabase Edge Functions to Vercel Cron.
Edge Function kept active for safety (parallel run)."

git push origin main
```

**Vercel va deploya automat** - durează ~2-3 minute.

---

### 4. Verifică Deployment (2 min)

**A. Health Check:**
```bash
curl https://uitdeitp.ro/api/cron/process-reminders
```

**Expected:**
```json
{
  "service": "reminder-processor",
  "status": "healthy",
  "timestamp": "2025-11-10T...",
  "message": "Use POST with Authorization header to trigger processing"
}
```

**B. Manual Trigger Test:**
```bash
curl -X POST https://uitdeitp.ro/api/cron/process-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Expected:**
```json
{
  "success": true,
  "message": "Processed X reminders (Y sent, Z failed)",
  "stats": { ... },
  "executionTime": "1234ms",
  "timestamp": "..."
}
```

---

### 5. Monitorizare (Ziua 1-3)

**Vercel Cron va rula automat** la 07:00 UTC (09:00 Romanian) în fiecare zi.

**Check logs în Vercel Dashboard:**
https://vercel.com/YOUR_TEAM/uitdeitp/logs

**Filtrează cu:** `/api/cron/process-reminders`

**Check database:**
```sql
-- Notificări trimise azi
SELECT
  type,
  status,
  COUNT(*) as count
FROM notification_log
WHERE sent_at >= CURRENT_DATE
GROUP BY type, status;
```

---

## Sisteme Active După Deployment

**✅ Vercel Cron**: ACTIV (runs daily at 07:00 UTC)
**✅ Supabase Edge Function + pg_cron**: ACTIV (runs daily at 07:00 UTC)

**Ambele sisteme vor rula în paralel** - acest lucru este SIGUR pentru 2-3 zile:
- Edge Function verifică `next_notification_date <= today`
- Vercel Cron verifică `next_notification_date <= today`
- După ce unul trimite notificarea, actualizează `next_notification_date` → următorul găsește `next_notification_date` în viitor și nu trimite
- **Rezultat**: Nu vor exista duplicate

---

## Dezactivare Edge Function (După 2-3 Zile)

**Când:** După ce Vercel Cron a rulat cu succes 2-3 zile.

**SQL Command (Supabase SQL Editor):**
```sql
-- Dezactivează pg_cron job
SELECT cron.unschedule('daily-reminder-processing');

-- Verifică că e dezactivat
SELECT * FROM cron.job WHERE jobname = 'daily-reminder-processing';
-- Trebuie să returneze 0 rows
```

---

## Cleanup Final (După 1 Săptămână)

**Când:** După ce Vercel Cron rulează stabil 1 săptămână.

### Șterge Fișiere:

```bash
# Edge Function
rm -rf supabase/functions/process-reminders/

# Migration vechi
rm supabase/migrations/20250109_setup_cron_job.sql

# Commit
git add .
git commit -m "chore: Remove Supabase Edge Function (migrated to Vercel Cron)"
git push origin main
```

### Șterge Supabase Secrets (Dashboard):

https://supabase.com/dashboard/project/dnowyodhffqqhmakjupo/settings/vault

**Delete:**
- `NOTIFYHUB_URL` (acum în Vercel)
- `NOTIFYHUB_API_KEY` (acum în Vercel)
- `RESEND_API_KEY` (acum în Vercel)
- `RESEND_FROM_EMAIL` (acum în Vercel)

---

## Rollback (Dacă Ceva Nu Merge)

**Re-activează pg_cron:**
```sql
SELECT cron.schedule(
  'daily-reminder-processing',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dnowyodhffqqhmakjupo.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

**Dezactivează Vercel Cron:**
```json
// vercel.json - comentează:
// "crons": [...]
```

```bash
git add vercel.json
git commit -m "revert: Disable Vercel Cron (rollback)"
git push origin main
```

---

## Checklist Final

- [ ] CRON_SECRET generat și adăugat în Vercel
- [ ] Deploy la producție (`git push`)
- [ ] Health check SUCCESS
- [ ] Manual trigger test SUCCESS
- [ ] Monitorizare ziua 1 (check logs)
- [ ] Monitorizare ziua 2 (check notification_log)
- [ ] Monitorizare ziua 3 (verify stats)
- [ ] (După 3 zile) Dezactivează pg_cron
- [ ] (După 1 săptămână) Șterge Edge Function files
- [ ] (După 1 săptămână) Șterge Supabase secrets
- [ ] (După 1 săptămână) Actualizează documentație

---

**Deployment Start**: 2025-11-10
**Cutover Target**: 2025-11-13 (după 3 zile)
**Cleanup Target**: 2025-11-17 (după 1 săptămână)
