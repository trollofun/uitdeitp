# Runbook: onboarding-ul unei stații ITP noi

Lanțul complet de la „stația a semnat" până la primul SMS trimis pe creditele ei.
Corelarea între toate sistemele se face pe **`rar_code`** (ex. `CT0xx`).

## 0. Precondiții

- Flag-uri aprinse în Vercel (proiectul `uitdeitp`): `STATION_DASHBOARD_ENABLED`,
  `STATION_CREDITS_ENABLED`, `GUMROAD_TOPUP_ENABLED` (vezi `src/lib/config/flags.ts`).
- `NOTIFYHUB_ADMIN_KEY` setat (≥32 caractere, fără newline la coadă).
- Produsele de credite există în Gumroad cu **Ping URL** setat per produs către
  `https://uitdeitp.ro/api/webhooks/gumroad?secret=<GUMROAD_WEBHOOK_SECRET>`
  (câmpul „Ping URL", NU „Redirect URI" — vezi incidentul din Academy,
  `GUMROAD_WEBHOOK_SETUP_CRITICAL.md`).

## 1. Crearea stației

- **Prin Academy (Contract F):** Academy apelează
  `POST /api/partner/stations/provision` (Bearer din `partner_api_keys`,
  scope `stations:provision`). Necesită `PARTNER_PROVISION_ENABLED=true`.
- **Manual:** din `/admin/stations/new` — obligatoriu `rar_code`, `slug`,
  `owner_email`, telefon.

## 2. Cheia NotifyHub a stației

uitdeITP (nu Academy) cere cheia — maparea `station_id → notifyhub_api_key_id`
trebuie să trăiască aici pentru webhook-ul de topup.

- Automat la provisionare, sau manual:
  `npx tsx scripts/provision-station-notifyhub-key.ts` (vezi
  `provisionStationNotifyHubKey` în `src/lib/services/station-credits.ts`).
- Stațiile de test (prefix ZZ): **sandbox + allowed_prefixes**, niciodată cheie live.
- Cheia intră în Vault (`secret_put`); NotifyHub o afișează o singură dată.
- Stația rămâne pe `use_own_notifyhub_key=false` (cheia platformei, postpaid)
  până la flip-ul comercial explicit — decizie separată de emiterea cheii.

## 3. Branding & kiosk

- Logo + culoare din `/admin/stations/[id]` (BrandingEditor).
- URL kiosk: `https://uitdeitp.ro/kiosk/<slug>`; manifest PWA per stație
  se generează automat.
- Dacă stația încorporează kiosk-ul pe site-ul propriu: adaugă domeniul în
  `KIOSK_ALLOWED_ORIGINS` (env, listă separată prin virgulă).

## 4. Credite

- Stația cumpără din `/stations/dashboard/setari` — link-urile de checkout conțin
  referința semnată `st=` (HMAC pe `GUMROAD_LINK_SECRET`), deci webhook-ul
  identifică stația fără input de la cumpărător.
- Fluxul: Gumroad Ping → verificarea vânzării la API → `credit_purchases`
  (idempotent pe `payment_ref`) → `POST NotifyHub /api/admin/credits`.
- Plasă de siguranță: cronul `/api/cron/reconcile-gumroad-sales` (15 min)
  prinde Ping-urile pierdute și reia topup-urile `pending`.

## 5. Verificare finală

1. `/api/stations/me/balance` întoarce sold pentru contul stației.
2. Un submit de test pe kiosk creează reminderul și trimite OTP.
3. O achiziție de test pe produsul de staging apare în `credit_purchases`
   cu `status='credited'` și soldul crește în NotifyHub.
4. SMS-ul de reminder pleacă cu numele + telefonul stației în șablon.
