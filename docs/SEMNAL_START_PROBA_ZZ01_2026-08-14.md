# Semnal de start: proba `ZZ01` poate începe

**uitdeITP → Academy și SIRAR · 14.08.2026 · partea noastră e verificată, nu doar declarată**

Proprietarul cere pornirea probei. Partea noastră e gata, iar mai jos e exact ce
am probat azi pe producție ca să putem spune asta — plus cele patru lucruri de
care depinde ca proba să nu se oprească din motive care n-au legătură cu voi.

---

## 1. Ce am verificat cap-coadă, azi, pe producție

N-am dedus din cod. Am emis o cheie de staging temporară, am parcurs tot fluxul
pe un cod de test `ZZ09`, apoi am șters totul și am revocat cheia.

| Pas | Rezultat |
|---|---|
| provisionare `ZZ09` cu cheie de staging | `201`, stație creată, bundle de ingest complet |
| cheia NotifyHub a stației de test | `delivery_mode: sandbox`, `allowed_prefixes: ["+40700000"]` |
| ingest Contract A, payload `full` cu VIN | `201`, `reminder_id` întors |
| ce a aterizat în bază | stație `ZZ09`, scadență 20.11.2026, notificare calculată 15.11, `consent_version: v1` |
| curățenie | `purge_test_stations()` → 0 urme; cheia NotifyHub revocată |

Deci fluxul pe care urmează să-l parcurgeți **a fost deja parcurs o dată**, de la
claim până la reminderul scris în bază. Dacă se rupe ceva, se rupe altundeva
decât în locurile pe care le-am probat.

## 2. Ce trebuie să știți ca proba să nu se oprească degeaba

**Codul RAR trebuie să fie `ZZ01`** (intervalul convenit e `ZZ01`–`ZZ09`). O
cheie de staging pe un cod real primește `422 staging_key_outside_test_namespace`
— asta a anulat deja `CT999`, codul pe care îl fixaserăți inițial.

**Numerele de test trebuie să înceapă cu `+40700000`.** Cheia NotifyHub a unei
stații de test e `sandbox` — nu apelează niciodată providerul — dar are și listă
albă dură pe intervalul ăsta. Un număr real primește `403 BLOCKED_PREFIX` și
proba se oprește acolo. Intervalul e același cu al cheii voastre de staging,
stabilit de NotifyHub, ca să existe unul singur în ecosistem.

**Ingest-ul cere `X-SIRAR-Idempotency-Key`.** Fără antetul ăsta răspunsul e
`422 missing_idempotency_key`. L-am prins chiar în proba de azi, la prima
încercare — merită spus, fiindcă mesajul e clar dar antetul e ușor de uitat.

**`expirare` trebuie să fie în viitor.** Schema o respinge altfel. Pentru probă,
orice dată la câteva luni distanță e bună.

**Adresa e cu `www`**: `https://www.uitdeitp.ro/api/integrations/reminders`.
Fără `www` primiți `307`, iar `Authorization` se pierde pe redirect între hosturi
— e chiar defectul semnalat în răspunsul din 9 august.

## 3. Ce facem noi în timpul probei

**Nu rulăm `purge_test_stations()`.** Cum ați cerut, și motivul e bun: o
ștergere căzută la mijloc arată exact ca un bug de-al vostru. Curățenia se face
**doar** la semnalul vostru de sfârșit de rundă.

Ne uităm la ce intră. Dacă vedem ceva ciudat — un `422` repetat, un consimțământ
în afara versiunilor canonice, o stație creată și rămasă fără remindere — vă
scriem în aceeași zi, nu așteptăm să ne întrebați.

## 4. Ce așteptăm de la voi

**Academy** — anunțați-ne când dați primul claim `ZZ01`, ca să ne uităm împreună
la prima rundă. Cheia de staging pe care ați rotit-o (`pk_prov_stg_Wca1`) e
activă și nerevocată; are `stations:provision`, fără `stations:lifecycle` — cum
ați cerut. Dacă vreți și evenimentele, e un `UPDATE` pe rând, fără reemitere.

**SIRAR** — după claim, aplicația primește bundle-ul de ingest prin Academy.
Restul e Contract A neschimbat: aceleași forme, aceleași câmpuri. `vin`,
`serie_civ` și `odometru` trec deja prin schemă și se stochează.

**Amândoi** — scrieți-ne la sfârșitul rundei, ca să rulăm curățenia.

---

## 5. Un lucru pe care nu-l putem promite

Stația de test e invizibilă în directorul public — o constrângere de bază refuză
`public_listed` pe orice cod `ZZ*`, indiferent pe unde s-ar scrie. Programările
și cererile de recenzie sunt oprite implicit.

Ce **nu** putem garanta: că un reminder de test nu va fi procesat de cronul de
dimineață dacă data scadenței cade în fereastra de notificare. Nu e o problemă —
cheia stației e `sandbox`, deci mesajul se contabilizează dar nu pleacă nicăieri.
Vi-l spunem ca să nu vă mire dacă vedeți o trimitere „reușită" în jurnal fără ca
vreun telefon să sune. Așa arată sandbox-ul când funcționează.
