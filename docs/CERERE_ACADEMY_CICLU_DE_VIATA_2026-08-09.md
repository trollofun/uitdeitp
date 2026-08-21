# Cerere către Academy — ciclul de viață al stației

**2026-08-09 · de la echipa uitdeITP · o singură cerere, nu cinci pe rând**

Contract F rezolvă **nașterea** unei stații și o rezolvă bine: un apel, bundle
idempotent, email verificat înainte de orice scriere. Am probat matricea de opt
cazuri pe producție și n-a căzut niciunul.

Ce n-are contractul e **tot restul vieții stației**. Am făcut un pas în spate și
am inventariat ce se rupe tăcut după claim — mai jos e lista întreagă, ordonată
după ce blochează ce, ca să le puteți lua pe toate odată în loc să vă cerem câte
una pe săptămână.

Am marcat explicit ce e la noi. Nu vă cerem nimic din ce putem face singuri.

---

## 0. Ce blochează tot: cum se autentifică prima cerere a agentului

Nu e cererea noastră, e observația SIRAR (`integrare-onboarding-v2.md` §2.1), dar
ne blochează pe toți trei, deci o punem prima.

Agentul are nevoie de o cheie Academy ca să cheme `link/start`. Dar F-ONB spune
că installerul e **generic**. Deci la prima pornire agentul n-are nicio cheie.

Două ieșiri, amândouă acceptabile pentru noi:

- `link/start` acceptă un apel neautentificat care întoarce doar un cod efemer,
  iar autentificarea vine din sesiunea Academy a inspectorului la confirmare;
- installerul descărcat din contul Academy poartă un token de bootstrap de unică
  folosință.

**Nu avem preferință și nu e decizia noastră** — dar până nu se alege una,
fluxul „2 click-uri" n-are cum să înceapă, iar noi rămânem pe provisionare
manuală, adică exact ce F-ONB trebuia să elimine.

---

## 1. Revocarea în cascadă — cea mai urgentă

**Ce se întâmplă azi:** nimic. Dacă o stație se deconectează în Academy, dacă un
abonament expiră, dacă un inspector pleacă — noi nu aflăm. Cheia de ingest rămâne
validă la nesfârșit. Singura cale de a o tăia e ca cineva să intre manual în
admin-ul nostru.

Consecința, spusă direct: **o stație care nu mai plătește continuă să scrie în
uitdeITP cu o cheie pe care voi o credeți revocată.** SIRAR a semnalat exact asta
(`installation.active:false` ar trebui să oprească și trimiterile Contract A).
La noi nu e implementat nimic.

**Ce facem noi:** construim endpoint-ul care primește semnalul și revocă. E în
curtea noastră, îl facem fără să așteptăm.

**Ce vă cerem:** să-l chemați. Vezi §6 pentru forma propusă.

---

## 2. Ceilalți inspectori — funcția există și nu o poate atinge nimeni

Asta ne-a surprins pe noi înșine la inventar.

Contract F atașează **o singură persoană**, ca `patron`. Am construit însă tot
ce trebuie pentru inspectori: rolul `inspector` în `station_members`, rezolvarea
lui în `resolveMyStationAccess`, un dashboard separat care ascunde datele de
contact ale clienților (inspectorul n-are nicio politică RLS pe `reminders` —
RLS filtrează rânduri, nu coloane, deci ascunderea se face pe server).

**Și nimic nu scrie vreodată un rând cu `role: 'inspector'`.** Am căutat: zero
apeluri. Deci o stație cu trei inspectori are un patron care vede tot și doi
oameni care n-au cum să intre.

Voi adăugați `inspector` la voi — am convenit deliberat că rolurile diferă,
fiindcă răspund la întrebări diferite („cine lucrează aici" vs „cine răspunde de
stație"). Rămâne să ne spuneți **cine lucrează aici**, altfel jumătate din
produsul pe care l-am construit e inaccesibil.

Aceleași reguli ca la provisionare: doar email cu cont confirmat, altfel `403`.

---

## 3. Rotirea care nu rotește

`rotate: true` emite o cheie nouă. Comentariul din codul nostru spune, cinstit:
*„cea veche rămâne validă"*.

Are o justificare — o rotire în care cheia nouă n-a ajuns încă la agent n-ar
trebui să oprească stația. Dar nu există niciun pas care să o revoce pe cea
veche **după** ce cea nouă e confirmată. Deci cheile se adună.

Nu e teoretic. Pe CT0xx, azi:

| Cheie | Stare | Ultima folosire |
|---|---|---|
| `be4a4330` | revocată | 07.08 |
| `6c3097d4` | revocată | niciodată |
| `d1582be4` | **activă** | 08.08 — proba noastră, nu SIRAR |

O cheie activă pe care n-o deține nimeni. Una singură, la o stație, în faza de
probă. La cincizeci de stații cu reinstalări, e un inventar de secrete pe care
nimeni nu-l mai poate audita.

**Ce facem noi:** revocăm cheia veche automat, la prima folosire reușită a celei
noi. Momentul ăsta e dovada că bundle-ul a ajuns, deci nu poate lăsa o stație
fără chei.

**Ce vă cerem:** nimic, doar să știți că se întâmplă. Dacă preferați un semnal
explicit („am scris bundle-ul, poți revoca"), spuneți — e mai curat, dar cere un
apel în plus de la voi.

---

## 4. Schimbările de plan și de stație

Trei situații, toate reale, niciuna acoperită:

**Tier.** Îl primim la provisionare (`lite` / `auto`) și îl folosim doar ca
etichetă pe cheie. Nu-l stocăm. Dacă o stație trece de la Lite la Auto sau
invers, nu aflăm. Azi nu variază nimic în produsul nostru după tier — dar am
prefera să știm înainte să înceapă să conteze, nu după.

**Codul RAR.** E cheia de corelare între noi. Dacă se schimbă, corelarea se rupe
tăcut — noi rămânem cu o stație pe codul vechi, voi cu alta pe cel nou, și abia
la primul reminder ratat cineva întreabă de ce.

**Proprietarul.** Scriem `owner_id` doar dacă lipsește: *„proprietarul legal nu
se schimbă dintr-un claim"* — regulă bună, o păstrăm. Dar înseamnă că o stație
vândută nu poate schimba proprietarul prin niciun flux automat. Rămâne manual la
noi, ceea ce e acceptabil — vrem doar să fie o decizie asumată, nu o omisiune.

---

## 5. Ștergerea contului — cine decide, și ce rămâne

Un inspector își șterge contul Academy. Ce se întâmplă cu stația lui la noi, și
mai ales cu **datele clienților ei** — numere de telefon, plăcuțe, consimțăminte?

Nu e o întrebare tehnică, e una de temei legal. Datele alea nu sunt ale
inspectorului, sunt ale șoferilor, iar stația e operatorul lor. Ștergerea unui
cont de instruire n-ar trebui să șteargă evidența de consimțământ a altcuiva —
dar nici nu poate rămâne un cont-fantomă cu acces.

Poziția noastră provizorie: ștergerea contului Academy **dezactivează accesul**
(§1), nu șterge date. Ștergerea propriu-zisă vine doar la cererea stației, prin
fluxul nostru GDPR.

Confirmați sau contraziceți — dar hai să fie scris undeva înainte să se întâmple
prima dată.

---

## 6. Propunerea concretă: un singur endpoint, nu patru

Ca să nu vă cerem patru integrări separate, propunem **un endpoint de evenimente**.
Voi îl chemați de fiecare dată când se schimbă ceva; noi tratăm ce știm și
ignorăm politicos ce nu.

```
POST https://www.uitdeitp.ro/api/partner/stations/events
Authorization: Bearer <aceeași cheie M2M, scope stations:lifecycle>
Idempotency-Key: <event_id de la voi>

{
  "type": "installation.deactivated",
  "academy_station_id": "…",
  "rar_code": "CT0xx",
  "occurred_at": "2026-08-09T10:00:00Z",
  "data": { … }
}
```

Tipurile de care avem nevoie, în ordinea importanței:

| `type` | `data` | Ce facem |
|---|---|---|
| `installation.deactivated` | `{reason}` | revocăm cheile de ingest ale stației |
| `installation.reactivated` | — | emitem o cheie nouă, o întoarcem în răspuns |
| `member.added` | `{email, role: "inspector"}` | atașăm inspectorul (doar pe cont confirmat) |
| `member.removed` | `{email}` | `status: 'left'`, accesul cade imediat |
| `tier.changed` | `{tier}` | stocăm; azi nu schimbă comportament |
| `station.renamed` | `{name}` | **nu** aplicăm automat — vezi nota |
| `rar_code.changed` | `{old, new}` | recorelăm, cu audit |

**Nota despre redenumire:** rămâne regula noastră comună — numele existent
câștigă. Un eveniment de redenumire îl **logăm și îl arătăm în admin**, dar nu-l
aplicăm singur. Dacă vreți altfel, e o discuție separată.

**De ce un endpoint și nu mai multe:** ca să puteți adăuga un tip nou fără să ne
cereți un endpoint nou, și ca să aveți un singur loc de retry și de idempotență.
Un tip necunoscut primește `202 {accepted: true, handled: false}` — nu `400`.
Nu vrem să vă rupem o coadă de evenimente fiindcă noi n-am prins din urmă.

**Ce garantăm:** idempotență pe `Idempotency-Key`, aceeași regulă de status ca la
provisionare (`401` = ceva despre cheie, `403` = ceva despre cerere), `code`
citibil de mașină la fiecare eroare, și audit pe fiecare eveniment primit.

---

## 7. Ce facem noi, fără să așteptăm nimic de la voi

Ca să fie limpede unde se termină cererea:

| Ce | Stare |
|---|---|
| endpoint-ul de evenimente de la §6 | îl construim acum |
| revocarea cheii vechi la rotire | a noastră |
| stocarea `academy_station_id` și `tier` — le primim și le aruncăm azi | a noastră |
| cheia NotifyHub la provisionare | a noastră; contractul spune că o cerem noi, iar codul **nu o cere** — coloanele există goale. NotifyHub a raportat ieri că `/api/admin/keys` e funcțional, deci nu mai suntem blocați |

Ultima e o scăpare de-a noastră, nu a voastră: Contract F promite că stația
primește și cheia NotifyHub la claim, iar implementarea noastră n-o cere. O
stație provisionată azi ar trimite pe cheia platformei, nu pe a ei — deci fără
credite proprii și fără topup Gumroad funcțional. O reparăm înainte de prima
stație reală.

---

## Ce ne-ar ajuta să primim înapoi

1. Decizia de la §0 (bootstrap) — sau măcar cine o ia.
2. Da/nu pe forma endpoint-ului de la §6, și care tipuri le puteți emite în
   prima tranșă. Dacă e doar `installation.deactivated`, e deja destul ca să
   închidem cea mai urgentă gaură.
3. Poziția voastră pe §5 (ștergerea contului).

Restul poate aștepta. Prima stație reală o trecem împreună, ca la Contract F.
