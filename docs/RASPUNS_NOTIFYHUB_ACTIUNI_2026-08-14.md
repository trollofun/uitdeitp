# Răspuns: trei din patru făcute, al patrulea nu trebuie făcut

**uitdeITP → NotifyHub · 14.08.2026 · răspunde la `CERERE_NOTIFYHUB_ACTIUNI_RAMASE_2026-08-14`**

Am verificat fiecare punct pe producție înainte să vă răspund. Ordinea de mai
jos e a voastră.

---

## 1. Calea fără cheie de idempotență: era OTP-ul — reparată

Aveați dreptate, și dovada voastră a fost suficientă ca să o găsim în două
minute: cele două UUID-uri pure din 13 august sunt **codurile de verificare**.
Am citit conținutul mesajelor în jurnalul vostru — „Codul tău de verificare" —
deci `/api/verification/send`, care chema clientul fără `idempotencyKey`.

Efectul concret era exact cel pe care îl descriați: dacă rețeaua cădea după ce
mesajul plecase, reîncercarea noastră trimitea al doilea SMS cu același cod.

Cheia e acum **id-ul rândului din `phone_verifications`**, sub forma
`otp:<uuid>`. Unic pe cerere, stabil la reîncercare, și nu repetă codul în
jurnalele voastre — mesajul îl conține oricum, cheia n-avea de ce.

**Din partea noastră puteți aprinde `IDEMPOTENCY_REQUIRED`** — dar abia după ce
am numărat corect, fiindcă prima variantă a acestui răspuns spunea „trei căi" și
greșea.

Sunt **șapte**, și patru dintre ele nu treceau nicio cheie:

| Cale | Înainte | Cheia acum |
|---|---|---|
| `reminder-processor` | avea | `{reminder_id}:{data}` |
| `verification/send` (OTP) | **lipsă** | `otp:{verification_id}` |
| `phone-verification` (al doilea OTP) | **lipsă** | `otp:{verification_id}` |
| `review-processor` | **lipsă** | `review:{request_id}` |
| `notifications/send-sms` (manual) | **lipsă** | `manual:{reminder_id}:{data}` |
| `notifications/send-bulk-sms` | **lipsă** | `bulk:{reminder_id}:{data}` |
| `booking/[slug]` | avea | — |

Cele două căi manuale sunt exact locul unde un dublu-clic produce două SMS-uri,
iar la lot se înmulțește cu numărul de destinatari. Cheia leagă reminderul de
ziua curentă: o retrimitere de mâine e legitimă și trece, a doua apăsare de acum
nu.

Dacă mai vedeți vreun UUID pur după deploy-ul de azi, spuneți-ne imediat —
înseamnă că am ratat una și tot n-am numărat bine.

## 2. Formatul stabil: da, `{reminder_id}:{data_programată}`

Decizia cerută, într-o propoziție: **da, forma recomandată de voi**, deja în
producție.

Motivul e chiar cazul-limită pe care îl semnalasem noi: `{reminder_id}:{zile}`
se schimba exact când conta. O trimitere eșuată luni, reluată marți, avea alte
zile rămase, deci altă cheie — iar dedupe-ul nu prindea nimic tocmai în ziua în
care ar fi trebuit. Data programată e stabilă prin construcție.

## 3. Alertele: varianta (a), același endpoint

`/api/webhooks/notifyhub`, cu dispatch pe `X-NotifyHub-Event`. Același secret,
nimic de configurat la voi în afară de `ALERT_WEBHOOK_URL`.

Am ales (a) fiindcă (b) nu cumpăra nimic: semnătura, verificarea vechimii
marcajului de timp și logica de reîncercare sunt identice. Un al doilea endpoint
ar fi însemnat același cod de securitate scris de două ori, cu șansa ca peste
șase luni doar unul dintre ele să primească o corecție.

Ce facem cu ele:

- **`low_balance` și `negative_balance_P1`** — rezolvăm `owner_ref` la stație
  prin codul RAR și trimitem și patronului, pe `owner_email`. El e singurul care
  poate face ceva.
- **restul** (`consumption_anomaly`, `ledger_drift_P0`,
  `monthly_reconciliation_*`) — rămân la noi, sunt probleme de platformă.

Răspundem `200` chiar dacă emailul cade, și scriem alerta în jurnal întâi: o
reîncercare din outbox-ul vostru s-ar lovi de aceeași eroare de opt ori.

**Puteți porni oricând.** Dacă vreți, trimiteți întâi o alertă de probă cu
`severity: "test"` și vă confirmăm ce a ajuns.

## 4. `NOTIFYHUB_API_KEY` — aici nu suntem de acord, și cred că e o confuzie

Traficul `platform:legacy` pe care l-ați văzut pe 13 august **este OTP**. Am
verificat conținutul în jurnalul vostru: sunt codurile de verificare. OTP-ul e
trafic de platformă — se trimite la oameni care încă nu aparțin niciunei stații,
inclusiv la înregistrarea pe site — și acolo îi e locul.

Reminderele folosesc deja cheia stației. Verificat în baza noastră pe CT060:
`use_own_notifyhub_key = true`, `notifyhub_api_key_id = b79fea83…` (adică
`nh_live_VhNj`, cheia emisă de voi), secretul în Vault.

Dacă am muta `NOTIFYHUB_API_KEY` global pe cheia CT060, **am factura unei
singure stații codurile de verificare ale tuturor utilizatorilor platformei**,
inclusiv ale celor care se înregistrează fără nicio legătură cu ea.

Observația voastră despre `GET /api/account` rămâne însă valabilă și e utilă:
dacă dashboardul de sold citește contul cheii globale, citește cifra greșită.
Verificăm și, dacă e așa, îl mutăm pe cheia stației — dar prin cheia stației, nu
prin schimbarea celei globale.

---

## Ce am verificat din ce ne-ați livrat

Nu pe încredere, ci rulând:

| Verificare | Rezultat |
|---|---|
| `allowed_prefixes` acceptat și stocat | ✅ ecou din bază, rândul îl are |
| `delivery_mode: sandbox` | ✅ `200 {sandbox:true}`, fără SMS, cu cost calculat |
| listă albă dură | ✅ număr real → `403 BLOCKED_PREFIX` |
| revocare | ✅ `DELETE /api/admin/keys` cu corp `{owner_ref}` → `{revoked:[…]}` |
| `NOTIFYHUB_CALLBACK_SECRET` la noi | ✅ recreat azi 08:06, cum ați spus |

Mulțumim pentru §2 din răspunsul vostru — `ANTIFRAUD_ENFORCE=false` care făcea
lista albă log-only era mai grav decât ce raportaserăm noi, și l-ați găsit
singuri pornind de la o întrebare secundară.

**Consecință directă:** stațiile noastre din spațiul de test primesc iar cheie
NotifyHub, în `sandbox` + listă albă pe `+40700000`. Pe 12.08 oprisem emiterea
cu totul; acum garanția nu mai depinde de o configurare pe care cineva poate uita
s-o pună. Folosim același interval ca la cheia Academy, ca să existe unul singur
în ecosistem.

---

## Un lucru de igienă, pentru amândoi

Ați schimbat `NOTIFYHUB_CALLBACK_SECRET` în proiectul nostru Vercel, iar noi am
revocat chei prin `UPDATE` direct în baza voastră. Amândouă au fost decizii
corecte în context — ale voastre ne-a închis bucla DLR, ale noastre a scos din
uz o cheie live nerevocabilă altfel.

Merită totuși spus: **niciunul dintre noi n-are urmă de audit pentru ce a făcut
celălalt.** Noi am aflat de la voi, din document. Dacă documentul nu venea,
schimbarea s-ar fi văzut doar ca o dată de modificare pe care nimeni n-o
citește. Aceeași lipsă o avem și noi pe `partner_api_keys`, unde Academy a rotit
o cheie ieri.

Nu cerem nimic acum. Doar semnalăm că, pe măsură ce ecosistemul crește, „scriem
direct la celălalt când e mai rapid" o să ne coste într-o zi mai mult decât ne
economisește azi.

**Preview-ul nostru a rămas pe secretul vechi** (creat 09.08, nemodificat), deci
callback-urile către deployment-urile de probă vor pica la semnătură. Nu ne
încurcă — le aliniem noi când avem nevoie de ele.
