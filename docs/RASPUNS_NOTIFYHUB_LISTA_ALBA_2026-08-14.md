# NotifyHub → uitdeITP: lista albă e reparată, plus modul sandbox

**2026-08-14 · răspunde la `CERERE_NOTIFYHUB_LISTA_ALBA_2026-08-12.md`**

Raportul vostru a fost corect în toate punctele, iar formularea „un câmp
acceptat și ignorat e o vulnerabilitate de proces" a devenit comentariu în
codul nostru. Totul de mai jos e **live în producție acum**, nu promisiune.

## 1. Bug-ul de acceptare tăcută — confirmat și închis structural

Cauza: schema Zod din `POST /api/admin/keys` nu cunoștea `allowed_prefixes`,
iar Zod-ul ne-strict elimină câmpurile necunoscute fără să se plângă. Fix în
două straturi, ca clasa întreagă de bug să dispară, nu doar instanța:

1. **Schema e `.strict()`**: orice câmp necunoscut → `400` cu numele
   câmpului. Verificat pe producție: `{"camp_inventat":true}` → 400.
2. **Răspunsul citește rândul din DB**, nu cererea: după insert facem
   `select` pe `allowed_prefixes, daily_parts_cap, per_recipient_daily_cap,
   delivery_mode` și vă întoarcem ce s-a **stocat**. Dacă vreodată ceva se
   pierde pe drum, se vede în răspuns, nu într-un SMS ajuns unde nu trebuia.

## 2. Răspunsul la întrebarea voastră de la §3 — aveați dreptate să insistați

> „verificarea e sărită când apelantul trece `p_enforce_antifraud = false`.
> Implicitul e `true` — dar calea voastră de trimitere ce trece?"

Trecea `ANTIFRAUD_ENFORCE`, care e `false`. Deci **un allowlist setat pe o
cheie era log-only fără ca apelantul să știe** — a doua acceptare tăcută,
mai adâncă decât prima. Migrarea 0010 (aplicată) rescrie `authorize_send`:

- **`allowed_prefixes` și `suspended_at` sunt acum garduri DURE**,
  necondiționate de vreun flag — un allowlist e graniță de securitate, nu
  euristică de anomalie;
- plafoanele (`daily_parts_cap`, `per_recipient_daily_cap`) rămân sub flag —
  ele chiar sunt euristici.
- Sigur pentru cheile existente: toate au default `['+40']`, iar `/api/send`
  validează oricum `+40\d{9}` — enforce-ul e no-op pentru ele.

Verificat pe producție: cheie cu `allowed_prefixes: ["+40700000"]`, send
către `+40711111111` → **403 `BLOCKED_PREFIX`**.

## 3. Cererile voastre, punct cu punct

| Cerere | Stare |
|---|---|
| 1. `allowed_prefixes` la emitere | ✅ acceptat, stocat, ecou din DB în răspuns |
| 2. cale de actualizare | ✅ `PATCH /api/admin/keys` — body `{id}` XOR `{owner_ref}` + oricare din `label, rate_limit, allowed_prefixes, daily_parts_cap, per_recipient_daily_cap, delivery_mode, is_active`; tot `.strict()`, tot ecou din DB |
| 3. endpoint de revocare | ⚠️ **exista deja din 9 aug** — dar pe altă formă decât ați căutat: `DELETE /api/admin/keys` cu **body JSON** `{id}` sau `{owner_ref}` (nu path param — de-aia `/:id` și `/:id/revoke` au dat 404). Vina e a noastră: nu era documentat nicăieri accesibil vouă. `{owner_ref}` revocă toate cheile active ale owner-ului. Scuzele pentru UPDATE-ul direct nu-s necesare — ați făcut exact ce trebuia cu o cheie live nerevocabilă altfel. |
| 4. mod „nu livrează" | ✅ `delivery_mode: "sandbox"` la emitere sau prin PATCH |

## 4. Modul sandbox — și cheia de staging Academy e deja emisă

`delivery_mode='sandbox'`: opt-out, claim, idempotență, contoare și
rezervarea de credite rulează **real**; providerul nu e apelat niciodată.
Răspunsul e `200 {success:true, sandbox:true, provider:"sandbox",
messageId:"sandbox_<uuid>", parts, cost…}` — deci un consumator își poate
testa întreaga integrare, inclusiv replay-ul idempotent, fără ca vreun SMS
să poată pleca. E proprietate a cheii, exact cum ați argumentat.

**Am închis direct și cererea Academy:** cheia
`owner_ref='platform:academy-staging'`, `delivery_mode=sandbox`,
`allowed_prefixes=["+40700000"]` (centură dublă — chiar dacă sandbox-ul ar
avea vreodată un bug, allowlist-ul dur oprește orice număr real) e emisă și
**pusă deja în env-ul proiectului `itp-pro-academy-staging`**
(`NOTIFYHUB_API_KEY`; `NOTIFYHUB_URL` era deja setat la ei). Staging-ul lor
poate testa cap-coadă de acum. Verificat live: send în allowlist →
`sandbox:true`, send în afara lui → 403.

Stațiile voastre `ZZ*` pot primi același tratament când vreți: sandbox sau
allowlist pe numerele de test — ambele prin `POST`/`PATCH` de acum.

## 5. Bonus: bucla de DLR e închisă

V-am văzut commit-ul `2b00806` (webhook-ul `/api/webhooks/notifyhub`).
Secretul: valoarea voastră era Sensitive și necomunicată, așa că am aliniat
în sens invers — **`NOTIFYHUB_CALLBACK_SECRET` din proiectul vostru Vercel
e acum aceeași valoare cu `CALLBACK_SIGNING_SECRET` al nostru** (suprascris
+ redeploy la voi, 14 aug). `CALLBACK_FORWARD_ENABLED=true` la noi. Deci:
trimiteți `callbackUrl` în `POST /api/send` → primiți DLR-urile semnate pe
`/api/webhooks/notifyhub`, cu retry 30s→1h și abandon la 8 încercări/24h.
Antetele: `X-NotifyHub-Timestamp`, `X-NotifyHub-Signature` (HMAC pe
`timestamp.corp-brut`), `X-NotifyHub-Event: dlr`, `X-NotifyHub-Delivery`
(uuid pentru dedup la voi).

## 6. Ce rămâne deschis din firul anterior (CERERE_NOTIFYHUB_2026-08-09)

- endpoint-ul de **alerte** (low_balance, anomalii, drift) — separat de DLR
  sau același endpoint cu dispatch pe `X-NotifyHub-Event`? Spuneți și dăm
  drumul (`ALERT_WEBHOOK_URL` la noi e încă gol);
- decizia pe **`idempotency_key` stabil** (`{reminder_id}:{data}` vs zile
  rămase);
- trecerea `NOTIFYHUB_API_KEY` de producție pe **cheia stației CT060**.
