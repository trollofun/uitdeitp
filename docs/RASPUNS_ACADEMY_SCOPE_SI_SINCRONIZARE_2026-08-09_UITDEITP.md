# uitdeITP → Academy — scope-ul e activ, plus o gardă pe care fotografia o cerea

**2026-08-09 · răspunde la `RASPUNS_ACADEMY_SCOPE_SI_SINCRONIZARE_2026-08-09.md`**

Scope-ul e pus. Am verificat și faptul pe care îl aduceți — se confirmă din
partea noastră, cu o precizare. Și am găsit, pornind de la runda de
sincronizare, o gaură în handler-ul nostru de reactivare pe care fotografia ar
fi declanșat-o la prima rulare.

---

## 1. Scope: extins pe cheia existentă, activ acum

Argumentul vostru e mai bun decât separarea noastră, și e bun dintr-un motiv pe
care îl acceptăm: separarea de scope-uri e o proprietate a **modelului**, nu a
distribuției. Cât timp ambele apeluri pleacă din același proces citind aceeași
variabilă de mediu, a doua cheie n-ar izola nimic — ar dubla doar secretele de
rotit și ocaziile de a rămâne setate-dar-goale.

Cheia voastră M2M existentă (prefix `pk_prov_live`, emisă 08.08) poartă de acum
ambele scope-uri:

```
scopes = ['stations:provision', 'stations:lifecycle']
```

`supabase/migrations/20260829_partner_key_lifecycle_scope.sql` — aplicată, cu
rollback-ul scris în antet. Modelul din cod rămâne separat
(`src/lib/partner/keys.ts:29`): în ziua în care livrarea evenimentelor pleacă din
alt serviciu, se emite a doua cheie **fără nicio schimbare de cod**. Am mutat
doar distribuția, nu regula.

**Cum verificați că e activ, fără să atingeți nimic:** trimiteți un eveniment cu
un `type` inventat (ex. `probe.noop`) și un `Idempotency-Key` propriu. Un `202
{handled:false, reason:"unknown_event_type"}` înseamnă că cheia a trecut de
autentificare **și** de scope — un `401 insufficient_scope` ar fi însemnat că
n-a trecut. Nicio stație nu e atinsă pe drumul ăsta.

**O schimbare mică din același motiv ca al vostru.** Fiindcă acum o singură
variabilă de mediu poartă tot, un `Authorization: Bearer ` cu valoare goală nu
mai întoarce `invalid_key`, ci `missing_bearer` — „nu mi-ai dat nicio cheie", nu
„cheia ta e greșită" (`src/lib/partner/keys.ts:96`). Diferența contează exact în
scenariul pe care l-ați numit de două ori: cine depanează pleacă să caute cheia
potrivită când, de fapt, variabila e goală.

## 2. Faptul: confirmat, și încă mai gol decât spuneți

Verificat în baza noastră, nu dedus:

| Ce | Azi |
|---|---|
| `partner_provision_requests` | **0 rânduri** |
| `kiosk_stations` cu `academy_station_id` | **0** |
| `partner_station_events` | **0** |
| stații total la noi | 1 — a noastră, CT0xx, creată manual |

Deci mulțimea de stații care există în ambele sisteme e într-adevăr goală, iar
prima rulare a sincronizării va raporta `stations: 0` din ambele direcții. De
acord: nu e un eșec, e dovada.

Precizarea: `stations: 0` va fi adevărat și pentru CT0xx, deși e o stație reală
la voi și la noi. E stația noastră, provisionată manual înainte de Contract F,
deci n-are `academy_station_id` — corelarea se face pe `rar_code` ca rezervă
(`src/app/api/partner/stations/events/route.ts:81`), dar claim-ul ei n-a existat
niciodată, deci nu intră în fotografia voastră. Nu cerem nimic; doar ca la prima
rulare să nu căutăm o stație lipsă care nu lipsește.

## 3. Ce ne-a arătat fotografia: reactivarea repornea prea mult

Runda de sincronizare emite starea **curentă** a fiecărei stații, deci trimite
`installation.reactivated` pentru tot ce e viu la voi. Ne-am uitat ce face
handler-ul nostru cu asta și am găsit exact simetria greșită pe care o corectasem
ieri pe `is_active`, rămasă o treaptă mai jos.

Versiunea de ieri punea necondiționat `ingest_enabled: true`. Adică o stație pe
care **noi** o oprisem din admin — neplată, abuz, cerere proprie — și-ar fi
repornit ingestul dintr-un eveniment despre licența SIRAR. O fotografie menită
să ne alinieze ar fi anulat tăcut o decizie de-a noastră, la prima rulare, pe
oricâte stații.

Corectat (`src/app/api/partner/stations/events/route.ts:225`): repornim ingestul
**doar dacă tot un eveniment de-al vostru l-a oprit**, adică `deactivated_at` e
setat. Altfel marcăm reactivarea, o logăm, și răspundem cu
`{handled:true, ingest_reenabled:false}` plus motivul în clar. Rămâne `2xx` —
n-avem de ce să vă blocăm coada pentru o decizie comercială de-a noastră.

Aceeași regulă ca la `is_active`, cu aceeași justificare: **un eveniment despre
licența altcuiva nu poate anula o decizie a noastră.** Meritul e al variantei
(1) — n-am fi văzut asta fără o fotografie de la pornire.

## 4. Restul, punct cu punct

**`usable_keys` în `data`** — bun, îl logăm ca tot payload-ul. Nu-l folosim ca
să decidem: starea instalării o derivați voi din ce a rămas, iar noi n-avem de ce
să recalculăm ce ne spuneți deja.

**Sincronizarea repetabilă, nu un script de o dată** — de acord, și e argumentul
care ne convinge de tot: exact aia lipsea după orice fereastră de tăcere, nu doar
la primul flip. Rugămintea noastră: rulați-o și după orice rotire a cheii M2M.

**Ordinea** — confirmată, cu pașii 1–4 exact cum îi scrieți. Pasul 1 e făcut.

---

## Ce am schimbat, pe scurt

| Fișier | Ce |
|---|---|
| `supabase/migrations/20260829_partner_key_lifecycle_scope.sql` | cheia Academy primește `stations:lifecycle` (aplicată) |
| `src/lib/partner/keys.ts` | `Bearer ` gol ⇒ `missing_bearer`, nu `invalid_key`; nota despre o cheie / două scope-uri |
| `src/app/api/partner/stations/events/route.ts` | reactivarea repornește ingestul doar dacă voi l-ați oprit; `touchPartnerKey` pentru dovada că scope-ul e viu |
| `tests/integrations/partner-keys.test.ts` | 7 teste: o cheie trece pe ambele scope-uri, scope absent ⇒ 401, cheia goală ≠ cheia greșită |

## Ce e la voi

1. Probați scope-ul cu un tip inventat, când vă convine — răspunsul e `202
   {handled:false}` și nu atinge nimic.
2. Proprietarul aprinde `INSTALLATION_CLAIM_ENABLED` și trecem prima stație
   reală împreună. Noi suntem porniți: `PARTNER_PROVISION_ENABLED=true` în
   producție de ieri.
3. A doua zi, `PARTNER_EVENTS_ENABLED`, apoi sincronizarea — care va raporta
   zero, și e în regulă.
