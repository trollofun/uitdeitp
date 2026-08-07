# Raport Audit UitdeITP

**Data:** 2026-08-06 · **Scop:** stare reală a implementării, ca bază pentru PRD-ul de integrare în ecosistemul ITP Pro (UitdeITP + Automatizare SIRAR + Academy + NotifyHub) · **Metodă:** audit read-only cu 4 subagenți pe cod + inspecție directă a bazei de date live (Supabase `dnowyodhffqqhmakjupo`)

---

## 1. Rezumat executiv

Platforma este funcțională cap-coadă pe trei fluxuri: kiosk (verificare SMS + consimțământ GDPR + salvare), dashboard utilizatori înregistrați și cron zilnic de notificare (SMS via NotifyHub, email via Resend). Datele live confirmă: 128 remindere active (90 kiosk, 38 import, 1 web), 50 profiluri, 1 stație activă. Personalizarea SMS per stație **există și funcționează** (template-uri 5d/3d/1d cu placeholder-e, editor în admin); template-urile de email per stație există în DB dar sunt **ignorate la trimitere**. Ce lipsește pentru ecosistem: **niciun webhook/API de intrare autentificat** (Automatizarea SIRAR nu are azi pe ce să împingă date), **zero sistem de credite/plăți**, și **fără identitate de mașină per stație** (stațiile sunt identificate doar prin slug public). Există deja fundații bune: roluri `user`/`station_manager`/`admin`, RLS „station owner își vede reminderele", `source='import'` acceptat de schemă, `estimated_cost` pe fiecare notificare. **Riscul principal**: multi-tenancy-ul este doar la citire — scrierile nu sunt izolate per stație, `notification_log` poate fi inserat/modificat de orice utilizator autentificat (fatal dacă devine registru de credite), iar trimiterea de SMS are 8+ puncte de apel necentralizate, ceea ce face imposibilă decrementarea fiabilă a creditelor fără consolidare prealabilă.

---

## 2. Inventar funcțional

| Funcționalitate | Stare | Fișiere relevante | Observații |
|---|---|---|---|
| Kiosk: flux complet 7 pași (idle → nume → telefon → cod SMS+GDPR → placă → dată → succes) | **Complet** | `src/app/kiosk/[station_slug]/page.tsx`, `src/components/kiosk/PhoneVerificationStep.tsx`, `src/app/api/kiosk/submit/route.ts` | Tip fix `itp`, interval fix `[5]` zile, doar SMS; email nu se colectează |
| Verificare telefon prin SMS (cod 6 cifre, rate-limit 3/oră/telefon) | **Complet** | `src/app/api/verification/{send,verify,resend}/route.ts`, `src/lib/services/phone-verification.ts` | SMS-urile OTP nu se scriu în `notification_log` — invizibile pentru un viitor contor de credite |
| Înregistrare + dashboard utilizatori (add/edit/delete remindere) | **Complet** | `src/app/(auth)/`, `src/app/dashboard/`, `src/app/api/reminders/*` | 3 căi paralele de creare (server action, `/api/reminders/create`, hook direct) cu default-uri divergente ([5], [5,1], [7,3,1]) |
| Unificare kiosk ↔ cont pe telefon verificat | **Complet** | `src/app/api/kiosk/submit/route.ts:130-145`, RPC `claim_guest_reminders` (migrarea `20260806_unify_phone_and_fix_notifications.sql`) | Adăugat 2026-08-06 |
| Cron zilnic notificări (email + SMS, quiet hours, opt-out, retry) | **Complet** | `vercel.json`, `src/app/api/cron/process-reminders/route.ts`, `src/lib/services/reminder-processor.ts` | 07:00 UTC; telefon fallback hardcodat `+40729440127` (Euro Auto Service) |
| Personalizare SMS per stație (template 5d/3d/1d + editor admin) | **Complet** | `kiosk_stations.sms_template_*`, `src/components/admin/NotificationTemplateEditor.tsx`, `src/lib/services/reminder-processor.ts:221-277` | Gaură: la exact 4 zile până la expirare nu se potrivește niciun template custom |
| Template email per stație | **Parțial** | `supabase/migrations/011_add_email_templates_to_stations.sql`, `src/lib/services/email.ts` | Stocate + editabile, dar `sendReminderEmail` folosește HTML hardcodat și nu le citește niciodată |
| Interval notificare configurabil | **Parțial** | `src/components/dashboard/NotificationIntervalPicker.tsx` (set {1,5,14}), `user_profiles.reminder_intervals` | Per reminder: da (doar useri înregistrați). Kiosk: hardcodat [5]. Default-ul din profil e **mort** — nimic nu-l citește. Per stație: ABSENT |
| Adăugare manuală de către stație | **Complet** | `src/app/stations/add-reminder/`, `src/app/api/stations/add-reminder/route.ts` | Verifică doar rolul, NU ownership-ul — managerul stației A poate adăuga pe stația B |
| Panou admin (stații, useri, remindere, notificări) | **Complet** | `src/app/admin/*`, `src/app/api/stations/*` | Stațiile se creează din UI/API, nu doar SQL |
| Opt-out GDPR (link scurt în SMS, listă globală) | **Complet** | `src/app/o/page.tsx`, `src/app/api/opt-out/route.ts`, tabela `global_opt_outs` | Global — opt-out la o stație amuțește toate stațiile |
| Buton „Trimite SMS" din lista de remindere | **Absent (stub)** | `src/components/dashboard/reminders/RemindersManager.tsx:135` — `// TODO: Implement SMS sending logic` | Afișează succes fără să trimită |
| Resend notificare | **Absent (simulat)** | `src/app/api/notifications/resend/route.ts:114` | Scrie log `sent` fără trimitere reală |
| Cod mort major | — | ~20 componente kiosk orfane, 2 fișiere `.backup-2025*`, dublu arbore auth `(auth)/` vs `auth/`, `src/app/api/reasoningbank/` (neautentificat) | Feature flags: ABSENT (grep `FEATURE_|featureFlag` în src/) |

---

## 3. Schema de date

**Schema live** (extrasă direct din DB `dnowyodhffqqhmakjupo`, 7 tabele, toate cu RLS activ mai puțin una):

- **`user_profiles`** (50 rânduri) — id→auth.users, full_name, phone (CHECK `+40\d{9}`), **phone_verified**, **role** enum (`user`/`station_manager`/`admin`), **station_id**→kiosk_stations, sms_enabled, email_enabled, reminder_intervals jsonb `[7,3,1]`, quiet_hours_*, preferred_notification_time, locație (city/country/subdivision/lat/lng), avatar_url. *Emailul NU e aici — e în `auth.users`.*
- **`kiosk_stations`** (1 rând) — slug unic, name, logo_url, primary_color, **owner_id**→auth.users, **sms_template_5d/3d/1d**, **email_template_5d/3d/1d** (cu placeholder-e documentate în comentarii de coloană), station_phone, station_address, total_reminders (menținut prin trigger), is_active.
- **`reminders`** (137 rânduri) — user_id NULLABLE, guest_name/guest_phone, plate_number, reminder_type (`itp`/`rca`/`rovinieta`), expiry_date, notification_intervals jsonb, notification_channels jsonb, next_notification_date, **source** (`web`/`kiosk`/`whatsapp`/`voice`/**`import`**), **station_id**, consent_given/consent_timestamp/**consent_ip** (inet), opt_out, deleted_at (soft delete), verification_id→phone_verifications. Index unic parțial `(guest_phone, plate_number) WHERE deleted_at IS NULL` — LIFO global.
- **`notification_log`** (59) — reminder_id, channel (`sms`/`email`), recipient, message_body, status, provider, provider_message_id, **estimated_cost numeric**, retry_count, metadata jsonb.
- **`phone_verifications`** (182) — phone, cod, source (`kiosk`/`registration`/`profile_update`), station_id, attempts, expires_at, ip, user_agent.
- **`global_opt_outs`** — phone PK, source, reason, deleted_at (re-opt-in).
- **`app_settings`** (5) — key/value; **RLS DEZACTIVAT** (vezi §7).

**Consimțământ GDPR**: boolean + timestamp + IP pe rândul de reminder (`consent_given`, `consent_timestamp`, `consent_ip` — `src/app/api/kiosk/submit/route.ts:161-163`), impus de Zod (`consent_given: z.literal(true)`, `src/lib/validation/index.ts:81-83`) și de RLS-ul de insert kiosk. Nu există document/dovadă text a formulării acceptate (versiunea politicii nu se salvează).

**Câmpuri pentru odometru / istoric service / componente schimbate: ABSENT** — verificat în schema live completă (toate coloanele celor 7 tabele), `supabase/migrations/` (tabela `vehicles` a fost ștearsă în `005_cleanup_and_utilities.sql`) și `src/types/`.

**Câmpuri lipsă pentru ecosistem**: entitate `vehicles`/`service_visits` (odometru, dată vizită, componente schimbate), câmp `external_ref`/`sirar_id` pe reminder, versiune consimțământ, api_key per stație, tabele de credite (vezi §5).

---

## 4. Puncte de integrare

### Webhook de intrare (pentru Automatizarea SIRAR): ABSENT

Verificat în toate cele 42 de route-uri din `src/app/api/`, grep `webhook|x-api-key|api_key` în `src/` (cuvântul „webhook" apare de 0 ori). Nu există nicio rută autentificată cu API key care să primească payload; singurele rute cu Bearer sunt cron-urile (`CRON_SECRET`), fără payload.

**Cel mai apropiat candidat — `POST /api/kiosk/submit`** (`src/app/api/kiosk/submit/route.ts`): complet neautentificat (doar rate-limit 10/oră/IP, în memorie), identifică stația prin `station_slug` public. Payload (Zod, `src/lib/validation/index.ts:72-84`):

```json
{
  "station_slug": "euro-auto-service",
  "guest_name": "Ion Popescu",
  "guest_phone": "+40712345678",
  "plate_number": "CT12ABC",
  "expiry_date": "2026-11-15",
  "consent_given": true
}
```

Răspuns 201: `{ id, message, station_name }` + headere `X-RateLimit-*`.

Limitări ca API de ecosistem: tip forțat `itp`, interval forțat `[5]`, nu verifică server-side că telefonul a trecut prin verificare SMS (doar clientul kiosk o impune), CORS-ul e doar allowlist de browser pentru euroautoservice.ro (un server poate posta fără header Origin — merge azi, dar e o gaură, nu un contract). Re-trimiterea aceluiași telefon+placă șterge soft reminder-ul vechi — **ultima stație care trimite „fură" clientul**, global.

### Legătura client ↔ stație

`reminders.station_id` FK → `kiosk_stations.id` (atribuire + selecție template); `user_profiles.station_id` există dar nu e folosit de pipeline-ul de notificare. Un client NU poate aparține mai multor stații pentru aceeași placă (index unic global, `supabase/migrations/010_add_unique_constraint_guest_reminders.sql`).

### NotifyHub — contract real din cod

`src/lib/services/notifyhub.ts`: `POST ${NOTIFYHUB_URL}/api/send`, header `Authorization: Bearer ${NOTIFYHUB_API_KEY}`, payload:

```json
{ "to": "+40712345678", "message": "...", "templateId": "optional", "data": {} }
```

Răspuns împachetat în `data` cu `{ messageId, provider, parts, cost }`; retry 3× cu backoff exponențial (1s/2s/4s), timeout 5s/încercare, fără retry pe 4xx; invocat din cron (`src/lib/services/reminder-processor.ts:282`). Există și un al doilea client legacy (`src/lib/clients/notifyhub.ts` → `/api/send-direct`, folosit doar de `send-manual`) plus 6 apeluri `fetch` directe care ocolesc ambii clienți (vezi §5). **Webhook de status livrare dinspre NotifyHub: ABSENT** (schema `sendSmsSchema` definește `callbackUrl` opțional dar nicio rută nu-l primește). Email: Resend REST direct (`src/lib/services/email.ts`, `POST https://api.resend.com/emails`), doar pentru utilizatori înregistrați.

### API pentru stație (baza viitorului dashboard)

Politica RLS există deja — `"Station owners see station reminders"` (`supabase/migrations/006_prd_schema_migration.sql:246`: `station_id IN (SELECT id FROM kiosk_stations WHERE owner_id = auth.uid())`) + pagina `/stations/manage` (role-gated). Dar un endpoint REST `GET /api/stations/:id/reminders` **nu există**; managerul de stație nu are azi nicio listă a clienților proprii în UI, doar formularul de adăugare.

---

## 5. Credite & plăți

**Sistem de credite: ABSENT** — confirmat prin grep exhaustiv (`credit|credits|balance|sold|transaction|payment|plata|billing|invoice|subscription|abonament|stripe|netopia|euplatesc|paypal|checkout`) în `src/`, `supabase/migrations/`, `package.json`. Zero SDK de plăți, zero tabele de credite/tranzacții.

Singurele urme găsite:

1. `notification_log.estimated_cost` — trigger `calculate_notification_cost()` care pune 0.05€/SMS, 0.001€/email (`supabase/migrations/004_notification_log.sql:102-122`), pur informativ; nimic nu-l citește pentru vreo limită.
2. Toast client-side „Insufficient Credits" în `src/hooks/reminders/useSendReminderSMS.ts:141-148` — **cod mort/speculativ** (serverul nu returnează niciodată acea eroare).
3. Copy de marketing: landing-ul și kiosk-ul afișează „100% Gratuit" în ~10 fișiere (`src/app/page.tsx:136-138`, `src/components/landing/FAQ.tsx` etc.) — copy-ul contrazice modelul de credite planificat și va trebui revizuit.

**Unde s-ar atașa decrementarea** — problema e că NU există un singur punct de trecere. Inventar complet al trimiterii de SMS:

1. `notifyHub.sendSms()` (`src/lib/services/notifyhub.ts:58`) — apelat din cron (`reminder-processor.ts:282` via `src/lib/services/notification.ts:117`), `api/users/verify-phone`, `api/notifications/{test,send-manual}`;
2. `fetch` direct la `${NOTIFYHUB_URL}/api/send` în `api/notifications/{send-sms,send-bulk-sms,test-sms}`, `api/verification/{send,resend}`, `src/lib/services/phone-verification.ts:95`;
3. client legacy `src/lib/clients/notifyhub.ts` (`/api/send-direct`).

**Atașarea naturală**: consolidarea tuturor pe `src/lib/services/notifyhub.ts`, apoi decrement atomic (RPC Postgres `debit_station_credits(station_id, parts)`) imediat înainte de send + writeback pe eșec, cu registrul legat de `notification_log` (are deja `estimated_cost`, `provider_message_id`, `metadata.station_id`). Precondiții obligatorii: SMS-urile de verificare OTP nu apar azi în `notification_log`, și RLS-ul actual permite oricărui utilizator autentificat INSERT/UPDATE pe `notification_log` (`004_notification_log.sql:143-158`) — inacceptabil pentru un registru financiar.

---

## 6. Auth & multi-tenancy

**Auth**: Supabase Auth (email/parolă + OAuth Google), sesiune pe cookie; rate-limit in-memory (nedistribuit) în `src/lib/auth/actions.ts:43-61`. Există **două arbori UI de auth divergenți** (`src/app/(auth)/` și `src/app/auth/` — ambele rutabile, conținut diferit; landing-ul trimite spre `/auth/login`). Middleware-ul exclude `/api/*` — fiecare rută API își face singură auth-ul (`requireAuth` din `src/lib/api/middleware.ts`).

**Roluri: EXISTĂ** — enum `user_role` (`user`,`station_manager`,`admin`) pe `user_profiles.role` (`supabase/migrations/20251105103022_add_user_roles.sql`), primul user auto-promovat admin, helpers `requireAdmin`/`requireStationManagerOrAdmin` (`src/lib/auth/requireRole.ts`), `/admin/*` gate-uit prin `src/app/admin/layout.tsx:10`.

**Cont de stație dedicat nu există** — conceptul e utilizator normal cu rol `station_manager` care deține rânduri în `kiosk_stations` prin `owner_id`. Kiosk-ul în sine e complet anonim, identificat prin slug public — oricine ghicește slug-ul poate trimite în numele stației. **Identitate de mașină / API key per stație: ABSENT** (nicio coloană token în `kiosk_stations`; verificat în `003_kiosk_stations.sql`, `006_prd_schema_migration.sql`, `database.types.ts`).

**Izolare date — la citire: OK prin RLS**:
- `"Station owners see station reminders"` (`owner_id = auth.uid()`);
- utilizatorii își văd doar propriile remindere (+ guest remindere doar pe telefon **verificat**, întărit în `20260806_unify_phone_and_fix_notifications.sql`);
- `user_profiles`: strict `auth.uid() = id`.

**La scriere: NU e izolat**:
- `POST /api/stations/add-reminder` verifică doar rolul, nu ownership-ul → managerul A scrie pe stația B (`route.ts:98-130`);
- `notification_log`: INSERT/UPDATE deschis tuturor autentificaților (`004:143-158`);
- `phone_verifications`: SELECT `USING (true)` pentru autentificați → orice user logat vede toate numerele aflate în verificare (`005_phone_verifications.sql:100-104`);
- orice utilizator autentificat poate crea stații (`003_kiosk_stations.sql:134`);
- resurse globale partajate: un singur cont NotifyHub (o singură factură, fără cote per stație), un singur cron, fallback telefon Euro Auto Service hardcodat (`reminder-processor.ts:~272`), index unic telefon+placă **global** (stația B primește „există deja" pentru clientul stației A, iar reminder-ul păstrează template-urile stației A).

**Pentru multi-tenancy curat trebuie**: ownership check pe toate rutele de scriere station-scoped, închiderea celor 3 politici RLS de mai sus, api_key per stație pentru ingest extern, contorizare cost per `station_id`, și o decizie de produs pe indexul unic global (client partajat vs per stație).

---

## 7. Stack & datorie tehnică

**Stack**: Next.js `^14.2.33` (App Router) + React 18 + TypeScript 5.9; Supabase (`@supabase/ssr ^0.1.0` — foarte vechi, curent 0.5+); TanStack Query/Table; Tailwind + Radix (shadcn); Resend (email); Sentry cablat la nivel de framework dar **neapelat din codul aplicației** (`src/lib/logger.ts:41` are `TODO: Send to Sentry`; 169× `console.error`, 91× `console.log` în src/); Vercel (region iad1, un singur cron `0 7 * * *`).

**Env necesare**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NOTIFYHUB_URL`, `NOTIFYHUB_API_KEY` (+ drift: `NOTIFYHUB_BASE_URL` folosit într-un loc, nedocumentat în `.env.example`), `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_IPGEO_KEY`, `NEXT_PUBLIC_IPINFO_TOKEN`, Sentry (4).

**Datorie tehnică majoră**:

- **Teste**: Playwright configurat coerent (`playwright.config.ts`); Vitest are 41 fișiere de test dar **niciun `vitest.config.*` în repo** — suita unitară aproape sigur nu rulează (alias `@/`, jsdom și `tests/setup.ts` nu sunt cablate); `__tests__/` dublează subseturi din `tests/`; artefacte committed (`test-results/`, `playwright-report/`).
- **Migrații**: două scheme de numerotare amestecate (secvențial + datestamp), prefixe duplicate (005×3, 007×2, 012×2), 008 lipsă, `notification_log` creat de două ori (004 și 20251109), hotfix-uri SQL aplicate manual pe live (documentat în `MIGRATION_STATUS.txt`; `fix-cron-job.sql` în root) — **istoricul migrațiilor NU e sursa adevărului; schema live este**.
- **Securitate**: `app_settings` cu **RLS dezactivat** (critic — 5 rânduri citibile/modificabile cu cheia anon, inclusiv setările de rate-limit SMS; remediere: `ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;` + politici); `fix-cron-job.sql` în root conține URL-ul Supabase + cheia anon hardcodate; `api/reasoningbank` și `api/cron/heartbeat` neautentificate; advisorii Supabase mai listează 3 view-uri SECURITY DEFINER, 17 funcții executabile de anon, search_path mutabil ×23.
- **Dependențe**: `vercel` CLI (^58.7.1) și `claude-flow` (ref GitHub mobil!) în `dependencies` de producție; `framer-motion` + `motion` ambele la ^12 (aceeași bibliotecă de două ori); `json2csv` pinned pe `6.0.0-alpha.2` (linie abandonată); `eslint-config-next` fixat la 14.1.0 vs `next` ^14.2.33.
- **Structură**: dublu arbore auth divergent, ~20 componente kiosk orfane + 2 fișiere `.backup-2025*` committed, 2 fișiere de tipuri DB paralele (`src/lib/supabase/database.types.ts` și `src/types/database.types.ts`), `components/kiosk/` duplicat în afara `src/`, directoare de artefacte committed (`analyses/`, `prompts/`, `research/`, `.next/`), fișier kiosk de 946 linii.

---

## 8. Top 5 modificări necesare pentru ecosistem

Ordonate după impact; estimări S/M/L.

1. **API de ingest autentificat per stație** (webhook-ul pentru Automatizarea SIRAR) — **M**. Tabelă `station_api_keys` (hash, scope, revocabil) + `POST /api/integrations/reminders` cu `Authorization: Bearer`, payload extins (tip reminder, interval, odometru opțional, `external_ref`), `source: 'import'` (deja acceptat de CHECK-ul din schemă). Refolosește tiparul existent `createAdminClient()` + validarea Zod din `/api/kiosk/submit`. Fără asta, ecosistemul nu are punct de intrare.
2. **Consolidarea trimiterii SMS + registru de credite** — **L** (prima jumătate, consolidarea, e S). Pasul 1: toate cele 8+ puncte de apel trec prin `src/lib/services/notifyhub.ts`; OTP-urile intră și ele în `notification_log`. Pasul 2: tabele `station_credits` + `credit_transactions`, RPC atomic de debit legat de `station_id`, integrare plăți (Netopia/Stripe) pentru topup. Precondiție dură: punctul 3.
3. **Închiderea găurilor de multi-tenancy la scriere** — **S/M**. RLS: `notification_log` (doar service_role la INSERT/UPDATE), `phone_verifications` (fără SELECT global authenticated), `app_settings` (RLS on + politici); ownership check în `api/stations/add-reminder` și `send-bulk-sms`; restricționarea creării de stații la admin. Ieftin, dar blochează frauda pe viitorul registru de credite.
4. **Dashboard de stație** — **M**. RLS-ul de citire există deja; lipsesc `GET /api/stations/:id/reminders` (+ notificări trimise + cost consumat din `notification_log.estimated_cost`) și paginile UI. Acesta e produsul vandabil către stații și locul unde se afișează soldul de credite.
5. **Parametrizare notificări + date de service** — **M**. Activarea template-urilor de email per stație (există în DB, procesorul nu le citește — `reminder-processor.ts:230` cere doar coloanele SMS), interval configurabil per stație (coloană nouă pe `kiosk_stations`, folosită de kiosk și de ingest în locul hardcodatului `[5]`), consumarea `user_profiles.reminder_intervals` (azi mort), și entitate `service_visits` (odometru, componente, dată) populată de webhook-ul SIRAR — baza istoricului de service promis în ecosistem.

---

*Note colaterale: copy-ul „100% Gratuit" de pe landing/kiosk intră în conflict cu modelul de credite și trebuie revizuit odată cu introducerea lui; modificarea locală necommitată la `supabase/migrations/20260806_unify_phone_and_fix_notifications.sql` (REVOKE pentru `authenticated`, deja aplicată pe live) așteaptă commit.*
