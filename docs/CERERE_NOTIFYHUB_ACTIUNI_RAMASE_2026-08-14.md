# NotifyHub → uitdeITP: ce a mai rămas la voi (scurt, cu dovezi)

**2026-08-14 · continuarea firului `CERERE_NOTIFYHUB_2026-08-09` + `RASPUNS_NOTIFYHUB_LISTA_ALBA_2026-08-14`**

Partea NotifyHub e în regim de întreținere: toate contractele funcționează,
bucla DLR e închisă și verificată azi contra receptorului vostru (**4 callback-uri
livrate, 0 eșuate**, semnătura a validat la voi). Au rămas **patru** lucruri,
toate în curtea voastră.

## 1. O cale de trimitere de-a voastră NU trimite `idempotency_key` — dovadă nouă

Trimiterile voastre din **13 august** au ajuns fără cheie de idempotență:

```sql
-- în baza NotifyHub, notification_logs:
idempotency_key = '3eca95e4-2c6b-4630-ae88-b187b6796b23'   -- UUID pur
idempotency_key = '7714a96f-be87-40cc-86df-671be44d35e6'   -- UUID pur
```

UUID-urile pure sunt **umplutura noastră server-side** la cheie lipsă
(logată ca `MISSING_IDEMPOTENCY_KEY`). Formatul vostru din
`reminder-processor.ts` conține `:` (`{reminder_id}:{zile}`) — deci aceste
două trimiteri au venit pe **altă cale** (OTP/verificare? test manual?
alt serviciu?). Consecința: dacă acea cale reîncearcă după un timeout de
rețea, poate produce SMS dublu, iar noi nu putem aprinde
`IDEMPOTENCY_REQUIRED` cât timp o cale legitimă ar primi 400.

**De făcut:** găsiți calea (grep după apelurile spre `NOTIFYHUB_URL` care
nu setează `idempotency_key`/`Idempotency-Key`) și pasați cheia și acolo.

## 2. Decizia pe formatul stabil al cheii (întrebare deschisă din 9 aug)

Cazul-limită semnalat chiar de voi: `{reminder_id}:{zile_rămase}` schimbă
cheia la reîncercarea de a doua zi. Recomandarea rămâne
`{reminder_id}:{data_programată}`. **Cerem doar decizia** (da / altă formă) —
o propoziție în următorul RASPUNS e suficientă.

## 3. Endpoint-ul de alerte — ultima piesă lipsă din Contract D

DLR-urile curg; **alertele nu au încă destinație** (`ALERT_WEBHOOK_URL` la
noi e gol, alertele mor în logurile Vercel). Tipuri: `low_balance` (voi
trimiteți emailul stației — aveți `owner_email`), `consumption_anomaly`,
`ledger_drift_P0`, `negative_balance_P1`, `monthly_reconciliation_*`.

Două variante, alegeți voi:
- **(a) același endpoint** `/api/webhooks/notifyhub`, cu dispatch pe
  `X-NotifyHub-Event` (`dlr` vs `alert`) — semnătura e deja identică;
- **(b) endpoint separat** — ne dați URL + confirmarea că folosim același
  secret sau unul nou.

Spuneți varianta + (dacă e cazul) URL-ul, și pornim în aceeași zi.

## 4. Producția voastră încă trimite pe secretul global, nu pe cheia stației

`NOTIFYHUB_API_KEY` al vostru de producție e tot valoarea legacy (se vede în
`owner_ref='platform:legacy'` pe trimiterile din 13 aug). Cheia stației
CT060 (prefix `nh_live_VhNj…`, emisă de voi pe 7 aug) e activă și așteaptă.
Până la schimb, `GET /api/account` vă arată contul legacy, nu al stației —
adică dashboardul de sold pe care l-ați construit citește cifra greșită.
Schimbul e fără fereastră de întrerupere (ambele chei merg în paralel).

## Tabel rezumat

| # | Acțiune | Deblochează |
|---|---|---|
| 1 | cheia de idempotență pe TOATE căile de trimitere | `IDEMPOTENCY_REQUIRED` (protecția anti-dublu completă) |
| 2 | decizia pe formatul stabil | idem |
| 3 | endpoint alerte (varianta a sau b) | alertele de sold/anomalii ajung la stații |
| 4 | `NOTIFYHUB_API_KEY` → cheia CT060 | sold per stație corect în dashboard |

Nimic din cele patru nu e blocat de noi; răspundem în aceeași zi la orice.
