# RESEND API KEY - Setup Instructions

## ⚠️ IMPORTANT: RESEND_API_KEY Needs Real Value

Deployment-ul în Vercel a fost făcut cu un **placeholder** pentru `RESEND_API_KEY`.

Pentru ca email notifications să funcționeze, trebuie să înlocuiești placeholder-ul cu cheia reală.

---

## Opțiunea 1: Găsește Cheia Existentă (Recommended)

Edge Function folosește deja Resend, deci cheia există undeva.

### Verifică în Supabase Dashboard:

1. Mergi la: https://supabase.com/dashboard/project/dnowyodhffqqhmakjupo/settings/edge-functions

2. Caută în **Edge Function Secrets** sau **Environment Variables** pentru:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`

3. Copiază valoarea reală a lui `RESEND_API_KEY`

---

## Opțiunea 2: Creează Cont Nou Resend (Dacă Nu Găsești)

### Pași:

1. **Sign Up**: https://resend.com/signup

2. **Verifică Domeniul `uitdeitp.ro`:**
   - Dashboard → Domains → Add Domain
   - Adaugă DNS records (SPF, DKIM) în registrar-ul domeniului

3. **Generează API Key:**
   - Dashboard → API Keys → Create API Key
   - Nume: `uitdeitp-production`
   - Permissions: `Send emails`
   - Copiază cheia (începe cu `re_`)

---

## Actualizare în Vercel

### CLI Method:

```bash
# Remove placeholder
vercel env rm RESEND_API_KEY production

# Add real key
echo "re_YOUR_REAL_KEY_HERE" | vercel env add RESEND_API_KEY production
echo "re_YOUR_REAL_KEY_HERE" | vercel env add RESEND_API_KEY preview
echo "re_YOUR_REAL_KEY_HERE" | vercel env add RESEND_API_KEY development
```

### Dashboard Method:

1. https://vercel.com/trollofuns-projects/uitdeitp-app-standalone/settings/environment-variables

2. Găsește `RESEND_API_KEY` → Click "Edit"

3. Înlocuiește `re_placeholder_resend_key_needs_manual_config` cu cheia reală

4. Click "Save"

---

## Redeploy După Actualizare

```bash
# Trigger redeploy pentru ca noua cheie să fie folosită
vercel --prod
```

SAU fă un push gol:

```bash
git commit --allow-empty -m "chore: Trigger redeploy for RESEND_API_KEY update"
git push origin main
```

---

## Verificare

### Test Email Service Local:

```bash
# Actualizează .env.local cu cheia reală
RESEND_API_KEY=re_YOUR_REAL_KEY_HERE

# Test endpoint
curl -X POST http://localhost:3000/api/cron/process-reminders \
  -H "Authorization: Bearer tOcDZJ7VkcRHB5g11FAwQfTykHxyNdVOdvdCleXFfEs=" \
  -H "Content-Type: application/json"
```

### Test în Production:

```bash
curl -X POST https://uitdeitp.vercel.app/api/cron/process-reminders \
  -H "Authorization: Bearer tOcDZJ7VkcRHB5g11FAwQfTykHxyNdVOdvdCleXFfEs=" \
  -H "Content-Type: application/json"
```

Check logs:
- Vercel: https://vercel.com/trollofuns-projects/uitdeitp-app-standalone/logs
- Filter: `/api/cron/process-reminders`

---

## Current Status

✅ CRON_SECRET: Configured
✅ NOTIFYHUB_URL: Configured
✅ NOTIFYHUB_API_KEY: Configured
✅ RESEND_FROM_EMAIL: Configured (notificari@uitdeitp.ro)
⚠️ RESEND_API_KEY: **PLACEHOLDER** - Needs real key

---

## Deployment Error Troubleshooting

Dacă deployment-ul a dat eroare, verifică:

1. **Vercel Build Logs**: https://vercel.com/trollofuns-projects/uitdeitp-app-standalone/logs
2. **Environment Variables**: Toate variabilele sunt setate?
3. **Build Command**: `npm run build` funcționează local? ✅ DA

Build local **FUNCȚIONEAZĂ** (doar warnings minore).

Eroarea din Vercel poate fi:
- Timeout la build (puțin probabil)
- Lipsă dependency (verifică package.json)
- Edge case cu Next.js 14 + Vercel

**Recomandare**: Verifică Vercel Dashboard logs pentru eroarea exactă.

---

**Data creării**: 2025-11-10
**Status**: Waiting for RESEND_API_KEY update
