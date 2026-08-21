# NotifyHub → uitdeITP — runda 2 (2026-08-09)

**Răspunde la** `docs/RASPUNS_NOTIFYHUB_2026-08-09_UITDEITP.md`

Cele două lucruri pe care le-ați cerut sunt implementate și în producție. Iar
la întrebarea despre normalizare am răspunsul cu dovadă, nu cu presupunere.

---

## 1. Normalizarea diacriticelor — da, funcționează, și avem dovada

**Ipoteza voastră numărul doi era corectă: corpul se stochează înainte de
normalizare, dar se trimite normalizat.**

`normalizeSmsText()` rulează în interiorul providerului, chiar înainte de
apelul HTTP către Calisero. Ce se scrie în `notification_logs.message_body` e
textul **original**, cu diacritice — de asta pare că n-am normalizat.

Dovada nu e din cod, ci din bani. Mesajul din 08.08, interogat acum:

```
body:           "Codul tău de verificare: 816010\n\nCodul expiră în 10 minute.\n\nuitdeitp.ro"
chars:          72
has_diacritics: true
estimated_cost: 0.0350   ← prețul REAL facturat, venit prin DLR
parts:          1
```

72 de caractere cu diacritice înseamnă UCS-2, iar pragul UCS-2 e 70 → ar fi
fost **2 părți, 0,070 EUR**. Calisero a facturat **0,035 = o parte**. Singura
explicație e că textul a plecat normalizat: 72 de septeți GSM-7 = 1 parte.

Mesajul ăsta e chiar la limită — normalizarea i-a înjumătățit costul.
(Nota: la voi apare cu 112 caractere, la noi corpul stocat are 72; probabil
măsurăm variante diferite ale aceluiași mesaj, dar concluzia nu se schimbă.)

**Redundant sau complementar?** Complementar, și **vă recomandăm să păstrați
normalizarea la voi**, din trei motive:

1. **Estimarea voastră devine adevărată.** Dacă textul e deja curat când
   ajunge la noi, numărul de părți pe care îl arată editorul vostru e exact
   cel facturat. Azi, un șablon cu diacritice vă arată 2 părți și vă costă 1 —
   o divergență care ascunde erori reale.
2. **E o decizie de conținut, nu una de transport.** Normalizarea schimbă
   textul pe care îl citește șoferul (`tău` → `tau`). Asta ar trebui să fie
   alegerea voastră, vizibilă în editor, nu o transformare tăcută făcută de
   gateway pe drum.
3. **Noi rămânem plasa de siguranță.** Nu scoatem normalizarea — dacă un
   mesaj scapă cu diacritice de oriunde (kiosk, import, alt sistem), tot nu
   plătiți dublu.

Un singur lucru de știut: pentru că stocăm originalul, `message_body` la noi
și textul efectiv trimis pot diferi. Dacă vă e util pentru audit, putem stoca
și varianta normalizată — spuneți dacă merită.

## 2. `Retry-After` pe 429 — implementat

Aveați dreptate să-l cereți, iar bug-ul pe care l-ați găsit la voi (regula
„nu reîncerca pe 4xx" care pierdea reminderele pentru toată ziua) merită
subliniat: 429 nu înseamnă „cererea ta e greșită", ci „nu acum".

Răspunsurile `429` conțin acum, pe lângă `X-RateLimit-*`:

```
Retry-After: 37        # secunde întregi până la resetarea ferestrei
```

Deci nu mai ghiciți intervalul. Live pe ambele căi (legacy și pipeline v2).

## 3. Alertele — forma confirmată, plus anti-replay

Presupunerile voastre erau corecte. Observația despre timestamp era însă mai
mult decât o rafinare: **o semnătură fără timestamp rămâne valabilă la
nesfârșit**, deci o cerere capturată putea fi rejucată oricând. Am schimbat
schema înainte să scrieți receptorul.

```
POST <ALERT_WEBHOOK_URL>
Content-Type: application/json
X-NotifyHub-Timestamp: 1786248000
X-NotifyHub-Signature: <hex>

{ "type": "low_balance", "keys": [...], "at": "2026-08-09T06:00:00.000Z" }
```

**Semnătura acoperă `"<timestamp>.<corp brut>"`**, nu doar corpul:

```js
const expected = crypto.createHmac('sha256', SECRET)
  .update(`${req.headers['x-notifyhub-timestamp']}.${rawBody}`)
  .digest('hex');
```

Două reguli la verificare:
1. folosiți **corpul brut**, nu JSON-ul reserializat (reserializarea schimbă
   ordinea cheilor și spațiile → semnătura nu mai potrivește);
2. respingeți cererile cu timestamp mai vechi de câteva minute (300 s e o
   valoare rezonabilă) — asta e apărarea la replay pe care ați cerut-o.

Tipurile pe care le veți primi: `low_balance`, `consumption_anomaly`,
`ledger_drift_P0`, `negative_balance_P1`, `calisero_low_balance`,
`calisero_reconciliation_unavailable`, `key_auto_suspended`,
`monthly_reconciliation_ok` / `_DISCREPANCY` / `_failed`.

Secretul îl generați voi și ni-l dați; îl punem în `ALERT_WEBHOOK_SECRET`
împreună cu URL-ul. Până atunci alertele rămân doar în logurile noastre.

## 4. `idempotency_key` — formatul e bun, iar cazul-limită e real

`{reminder_id}:{zile_pana_la_expirare}` e exact ce recomandam. Nu îl facem
obligatoriu încă (`IDEMPOTENCY_REQUIRED` rămâne `false`) până nu confirmăm în
logurile noastre că sosește pe tot traficul.

Cazul-limită pe care l-ați semnalat singuri e corect analizat și merită
tratat: un `502` de azi, urmat de reîncercare **mâine**, produce o cheie
diferită (alt număr de zile) și deci un al doilea SMS, dacă primul chiar
plecase. Trei observații:

- **Fereastra e mică.** `502` de la noi înseamnă că *ambii* provideri au
  eșuat — mesajul aproape sigur n-a plecat. Riscul real e la un timeout de
  rețea între noi și voi, unde răspunsul se pierde deși trimiterea a reușit.
- **Îl puteți închide complet** folosind un identificator stabil în cheie:
  `{reminder_id}:{data_programată}` în loc de zile rămase. Aceeași încercare
  logică păstrează aceeași cheie indiferent de ziua în care se reia.
- **Dacă preferați semantica actuală**, o alternativă e să interogați starea
  înainte de a reîncerca a doua zi — dar e mai simplu să schimbați cheia.

Decizia e a voastră; noi respectăm orice cheie unică per încercare logică.

## 5. `rar_code` = `CT0xx` — notat, cheia se poate emite

Confirmarea voastră închide întrebarea. Emiterea propriu-zisă mai are o
dependență la noi: `ADMIN_API_KEY` trebuie setat în env-ul de producție.
Când e pus, primiți:

- **cheia de trimitere** a stației (`nh_live_...`, se afișează o singură dată);
- **`api_key_id`**-ul ei — parametrul pentru `POST /api/admin/credits`;
- **cheia de admin** — strict server-side la voi, niciodată în browser.

**Numele variabilelor.** La noi cheia de admin se numește `ADMIN_API_KEY`
(acolo se verifică, numele e fixat în cod). La voi e doar eticheta sub care o
păstrați ca s-o trimiteți mai departe, așa că vă recomandăm
**`NOTIFYHUB_ADMIN_API_KEY`**, lângă `NOTIFYHUB_URL` și `NOTIFYHUB_API_KEY` pe
care le aveți deja. **Valoarea e aceeași**, doar numele diferă — un singur
secret partajat, nu două.

Atenție: cine are cheia asta poate credita conturi, adică poate crea sold din
nimic. Deci niciodată cu prefix `NEXT_PUBLIC_`, niciodată în cod care ajunge
în browser, niciodată în git.

Din momentul acela, `GET /api/account` întoarce sold real în loc de
`KEY_NOT_PROVISIONED`, iar fluxul Gumroad → topup funcționează cap-coadă.

Cheile noi pornesc pe `billing_mode: postpaid` — nimeni nu primește `402`
până când o stație e trecută explicit pe `credits`, iar flip-ul deschide
automat 7 zile de log-only în care se înregistrează ce *ar fi* fost refuzat.

## 6. Ce rămâne deschis

| Cine | Ce | Stare |
|---|---|---|
| noi | `Retry-After` pe 429 | **gata, în producție** |
| noi | alerte cu timestamp anti-replay | **gata**, așteptăm URL + secret |
| noi | răspuns pe normalizare | **gata** (§1: păstrați-o la voi) |
| voi | endpoint de alerte, cu regulile din §3 | de construit |
| voi | decizie pe cazul-limită al cheii de idempotență (§4) | de decis |
| ambii | emiterea cheii `CT0xx` | așteaptă `ADMIN_API_KEY` în env-ul nostru |

## 7. Pe marginea §9 din răspunsul vostru

Observația voastră finală — „spunem ce am observat, nu ce credem că înseamnă"
— merită întoarsă, pentru că a funcționat în ambele sensuri: exact pentru că
ați raportat faptul brut („`parts` gol, 0 din 12, `estimated_cost` fix"), am
căutat cauza și am găsit ceva mai adânc decât coloana lipsă — numărarea în
caractere în loc de septeți. Dacă raportați doar concluzia, aș fi adăugat o
scriere de coloană și am fi rămas amândoi cu facturarea greșită.
