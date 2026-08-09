# NotifyHub → uitdeITP — cerere 2026-08-09

**Răspunde la** `docs/RASPUNS_NOTIFYHUB_2026-08-09_RUNDA2.md` (și, prin el, la
`docs/RASPUNS_NOTIFYHUB_2026-08-09.md` și `docs/RASPUNS_NOTIFYHUB_2026-08-09_UITDEITP.md`).
Nu repetăm ce e deja convenit acolo — doar ce e nou sau cere decizie de la voi.

---

## 1. Endpoint de alerte — cerere formală, spec înghețat

Repetăm formal cererea din RUNDA2 §3, acum ca spec complet, pentru că e blocată
pe voi de trei runde. Are nevoie de: URL + secret (îl generați voi), noi le
punem în `ALERT_WEBHOOK_URL` / `ALERT_WEBHOOK_SECRET`.

- **Headers:** `X-NotifyHub-Timestamp` (unix secunde), `X-NotifyHub-Signature`
  = `hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`))`
- **Verificare la voi:** HMAC pe **corpul brut** (nu JSON reserializat —
  reserializarea schimbă ordinea cheilor și spațiile, semnătura nu mai
  potrivește); respingeți timestamp mai vechi de ~300s (anti-replay).
- **Tipuri:** `low_balance` (→ email către stație — proprietarul `owner_email`
  e la voi, noi rămânem headless), `consumption_anomaly`, `ledger_drift_P0`,
  `negative_balance_P1`, `calisero_low_balance`,
  `calisero_reconciliation_unavailable`, `key_auto_suspended`,
  `monthly_reconciliation_ok` / `_DISCREPANCY` / `_failed`.
- **Corp:** `{ type, ...payload, at: ISO }`

Verificare de referință:

```js
const expected = crypto.createHmac('sha256', SECRET)
  .update(`${req.headers['x-notifyhub-timestamp']}.${rawBody}`)
  .digest('hex');
```

## 2. Forward de DLR (NOU — F3.3, în implementare la noi, spec înghețat)

Dacă trimiteți `callbackUrl` (https, host public) în `POST /api/send`,
statusurile de livrare se împing înapoi la voi: `POST` semnat identic cu
alertele (§1) + două headere suplimentare:

```
X-NotifyHub-Event: dlr
X-NotifyHub-Delivery: <uuid>     # pentru dedup la voi
```

Payload:

```json
{
  "event": "dlr",
  "messageId": "...",
  "provider": "calisero|twilio",
  "status": "delivered|failed|...",
  "idempotency_key": "...",
  "recipient": "+40712***678",
  "parts": 1,
  "occurred_at": "2026-08-09T...",
  "metadata": {}
}
```

`recipient` e mascat implicit. Retry cu backoff exponențial 30s → 1h, abandon
la 8 încercări/24h. Puteți folosi **același** endpoint de la §1 (distingeți pe
`X-NotifyHub-Event`) sau unul separat — spuneți ce preferați.

Câmpul e stocat de acum, dar **nu livrează nimic** până aprindem
`CALLBACK_FORWARD_ENABLED` la noi. Vă anunțăm înainte de activare.

## 3. Trecerea `NOTIFYHUB_API_KEY` pe cheia stației

`NOTIFYHUB_API_KEY` la voi are ~277 de zile — aproape sigur secretul global
vechi (`API_KEY_SECRET`), nu o cheie per-tenant. Cheia stației CT060, emisă de
noi pe 7 august (prefix `nh_live_VhNj`, o aveți), trebuie să-l înlocuiască
pentru trafic real de stație.

Ambele funcționează în paralel — dublă acceptare pe partea noastră, deci zero
fereastră de întrerupere la comutare. Dar **soldul și consumul din
`GET /api/account` sunt per cheie**: cu secretul vechi vedeți contul legacy
(platformă), nu contul stației CT060. Dacă nu treceți pe cheia nouă, orice
dashboard care citește `/api/account` la voi arată date greșite fără să pice.

## 4. Decizia pe idempotency_key (cazul-limită semnalat de voi)

Formatul actual, `{reminder_id}:{zile_până_la_expirare}`
(`src/lib/services/reminder-processor.ts:334`), schimbă cheia la reîncercarea
de a doua zi:

```ts
const idempotencyKey = `${reminder.id}:${daysUntilExpiry}`;
```

Dacă un `502` de azi ascunde un mesaj care de fapt a plecat (doar răspunsul
s-a pierdut pe fir), reîncercarea de mâine capătă o cheie nouă → al doilea SMS
real. Recomandarea noastră rămâne cea din RUNDA2 §4:
**`{reminder_id}:{data_programată}`** — aceeași încercare logică păstrează
aceeași cheie indiferent de ziua în care se reia.

Cerem decizia voastră explicită: da / nu / altă formă. Fereastra de risc e
mică (un `502` de la noi înseamnă că *ambii* provideri au picat — mesajul
aproape sigur n-a plecat; riscul real e la un timeout de rețea între noi și
voi), dar vrem răspunsul scris înainte să aprindem `IDEMPOTENCY_REQUIRED`.

## 5. Verificarea formei răspunsului de topup

Am citit funcția întreagă (`station-credits.ts`, `topupStation`, ~291–341) și
apelantul ei (`src/app/api/webhooks/gumroad/route.ts`, ~112–120).

**Fals-pozitiv — codul vostru e corect.** `topupStation` nu destructurează
nimic din răspunsul `POST /api/admin/credits`: îl păstrează opac, ca
`response: unknown`, și-l scrie brut în `credit_purchases.notifyhub_response`.
Decizia `credited` vs `pending` se ia pe `res.ok`, nu pe vreun câmp din corp:

```ts
const json = await res.json().catch(() => ({}));
return { ok: res.ok, response: json, reason: res.ok ? undefined : 'notifyhub_error' };
```

```ts
status: topup.ok ? 'credited' : 'pending',
notifyhub_response: (topup.response ?? { blocked: topup.blocked, reason: topup.reason }) as never,
```

Deci nu contează dacă noi întoarcem `{applied, txn_id, balance_parts}` sau
altceva — nimic la voi presupune o formă anume.

Comentariul care a declanșat suspiciunea noastră e în altă funcție,
`getStationBalance` (linia ~261), și se referă la **`GET /api/account`**, nu
la `POST /api/admin/credits`:

```ts
// NotifyHub returns an object {at, parts, payment_ref}; we only surface
// the timestamp. Tolerate the plain-string form too.
last_topup:
  typeof payload.last_topup === 'object' && payload.last_topup !== null
    ? (payload.last_topup.at ?? null)
    : (payload.last_topup ?? null),
```

Asta chiar corespunde cu `GET /api/account` → `last_topup: {at, parts,
payment_ref}`, exact cum e documentat la noi. Concluzie: **niciun mismatch
real** — codul e defensiv (tolerează și forma veche, string simplu) exact
acolo unde ar trebui.

## 6. `queue` din `GET /api/health` — verificat

Am rulat grep pe tot `src/` după referințe la `queue` / `health` legate de
NotifyHub. Rezultat: `notifyhub.ts:checkHealth()` întoarce tot corpul
răspunsului ca blob opac (`{ ok: true, status: data }`) și nimic din codebase
nu citește un câmp `.queue` din el. Confirmăm: **nimic la voi depinde de
câmpul `queue`** — eliminarea lui de la noi (Faza 2) e sigură din perspectiva
voastră.

## 7. Noutăți disponibile deja (informativ)

- `GET /api/admin/credits` (cu `NOTIFYHUB_ADMIN_KEY`) = soldurile **tuturor**
  stațiilor + sumar — util pentru un dashboard de administrare la voi;
  câmpul `enforcing` e `true` doar când stația chiar poate primi `402`.
- Răspunsul `/api/send` are acum `cost` (final, cu TVA 21%), `cost_net`,
  `vat`, `vat_rate`, `currency` — confirmat deja că ați ajustat (folosiți
  `costNet`, nu `cost`, pentru contabilizare). `parts` e real (septeți GSM-7 —
  atenție la `[ ] { } | €`, care costă dublu în șabloane).
- `429` vine cu `Retry-After` — confirmat că ați implementat deja backoff pe
  el.
- Câmpul `queue` din `GET /api/health` a fost **eliminat** — vezi §6.
- `schedule_at` va fi disponibil opțional (`'YYYY-MM-DD HH:MM:SS'`
  Europe/Bucharest, max +30 zile) sub flag. Programarea rămâne la voi în v1;
  există dacă o vreți vreodată.

## 8. Cine-ce

| # | Subiect | La voi | La noi |
|---|---|---|---|
| 1 | Endpoint de alerte | de construit — URL + secret | spec live, așteaptă |
| 2 | Forward DLR (`callbackUrl`) | opțional, de folosit când vreți | în implementare, spec înghețat, dark până la `CALLBACK_FORWARD_ENABLED` |
| 3 | `NOTIFYHUB_API_KEY` → cheia stației | de comutat | dublă acceptare, live |
| 4 | Format `idempotency_key` | de decis (da/nu/altă formă) | respectăm orice cheie unică per încercare |
| 5 | Mismatch topup | — | **fals-pozitiv, cod corect confirmat** |
| 6 | `health.queue` eliminat | verificat, nimic nu-l citește | eliminat |
| 7 | `/api/admin/credits`, TVA pe `cost`, `Retry-After`, `schedule_at` | informativ | live / în plan |
