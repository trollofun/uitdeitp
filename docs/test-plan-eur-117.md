# EUR-117: Test Plan — Propagare automată EAManager → uitdeitp

**Obiectiv:** Verificare integrare EAManager → uitdeitp pentru trimiterea automată a clienților ITP cu consimțământ operational.

**Componente noi:**
- `eam-core/src/services/uitdeitp-receiver.service.ts` — serviciu de sincronizare
- `eam-core/src/routes/uitdeitp-receiver.routes.ts` — controller pentru endpoint-uri
- `eam-core/src/routes/uitdeitp-receiver-router.ts` — router Express
- Înregistrare în `eam-core/src/routes/index.ts` → `/uitdeitp/*`

---

## 1. Configurare Preliminară

### 1.1. Configurare uitdeitp (Receiver)

Verifică că uitdeitp are ingest activat pe mediu de test:

\`\`\`bash
# În uitdeitp repo
cd /home/john/.hermes/profiles/beba/uitdeitp

# Verifică flag-urile din .env.local
grep "INGEST_ENABLED" .env.local
# Trebuie să fie: INGEST_ENABLED=true
\`\`\`

Dacă `INGEST_ENABLED=false`, editează `.env.local` și setează:

\`\`\`bash
INGEST_ENABLED=true
STATION_CREDITS_ENABLED=false  # Încă nu folosim credite
PARTNER_PROVISION_ENABLED=false
\`\`\`

**Restart dev server uitdeitp** dacă ai modificat env vars:

\`\`\`bash
npm run dev  # Pornește pe http://localhost:3000
\`\`\`

### 1.2. Creează Stație Test în uitdeitp

uitdeitp folosește autentificare cu chei pe stație. Trebuie să creăm o stație test:

\`\`\`sql
-- Conectează-te la Supabase DB (dnowyodhffqqhmakjupo.supabase.co)
-- Tabelul: kiosk_stations

INSERT INTO kiosk_stations (
  slug,
  name,
  rar_code,
  primary_color,
  secondary_color,
  contact_phone
) VALUES (
  'eam-test-station',
  'Euro Auto Manager Test',
  'CT-123-TEST',  -- Cod RAR fictiv
  '#3B82F6',
  '#10B981',
  '+40712000000'
) RETURNING id;

-- Salvează ID-ul stației (de ex. uuid-aici)
\`\`\`

### 1.3. Generează Chei de Integrare pentru Stația Test

uitdeitp generează automat chei prin admin dashboard:

**Opțiune A: Via Admin UI (recomandat)**
1. Accesează: http://localhost:3000/admin/stations/[station-id]/keys
2. Click "Generate New Key"
3. Copiază:
   - `Bearer Token` (ex: `sta_1a2b3c4d5e6f`)
   - `HMAC Secret` (ex: `sk_hmac_abc123def456`)

**Opțiune B: Via SQL Direct**

\`\`\`sql
-- Generează chei direct în DB
INSERT INTO station_integration_keys (
  station_id,
  key_id,
  hmac_secret_id,
  name,
  enabled
) VALUES (
  '[station-id-from-step-1.2]',
  gen_random_uuid(),
  'sk_hmac_test_secret_12345',
  'EAManager Test Key',
  true
) RETURNING key_id;

-- Salvează key_id (va fi folosit ca Bearer token: "sta_..." prefix)
\`\`\`

**Inserează și secret-ul HMAC:**

\`\`\`sql
INSERT INTO station_secrets (
  id,
  secret_value
) VALUES (
  'sk_hmac_test_secret_12345',
  'MY_TEST_HMAC_SECRET_REPLACE_THIS'
);
\`\`\`

### 1.4. Configurare EAManager (Sender)

Editează `/home/john/Desktop/euro-auto-manager/.env.local` și adaugă:

\`\`\`bash
# uitdeitp Integration (EUR-117)
UITDEITP_URL=http://localhost:3000
UITDEITP_API_KEY=sta_[key-id-from-step-1.3]
UITDEITP_HMAC_SECRET=MY_TEST_HMAC_SECRET_REPLACE_THIS
UITDEITP_RAR_CODE=CT-123-TEST
\`\`\`

**Restart EAManager dev server:**

\`\`\`bash
cd /home/john/Desktop/euro-auto-manager/eam-core
npm run dev  # Pornește pe http://localhost:4000 (sau portul configurat)
\`\`\`

---

## 2. Criterii de Succes

✅ **Configurare validă:** `/uitdeitp/status` returnează `configured: true`

✅ **Sincronizare reușită:** POST `/uitdeitp/sync` returnează `sent: 1` pentru client test

✅ **Reminder programat:** uitdeitp DB conține reminder cu:
- `next_notification_date` = `expiry_date - 7 days`
- `reminder_type` = 'itp'
- `guest_phone` normalizat (format RO: +40...)
- `station_id` corect

✅ **Audit trail:** `integration_request_log` conține cererea cu:
- `signature_valid = true`
- `status_code = 201`
- `payload_variant = 'lite'`

✅ **Idempotency:** A doua sincronizare NU creează duplicate (sent: 0)

✅ **Filtrare consimțământ:** Clienți fără `operational` consent sunt skipped

✅ **ZERO date personale în comentarii:** Raportul final conține doar contoare agregate

---

**Notă:** Acest test plan NU conține date personale reale. Toate valorile (nume, telefon, plăci) sunt fictive și folosite exclusiv pentru testare.
