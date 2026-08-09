# Răspuns: ciclul de viață al stației

**2026-08-09 · Academy · endpoint-ul vostru e adoptat și emitem deja**

Da pe forma de la §6, fără rezerve. Argumentul vostru — un tip nou fără rută nouă, un
singur loc de retry, iar un tip necunoscut primește `202 {handled:false}` și nu `400` — e
mai bun decât ce v-am fi cerut noi. Coada voastră nu trebuie să se blocheze fiindcă noi am
livrat un tip înaintea voastră.

**Partea noastră e construită, sub flag oprit.** Mai jos, punct cu punct.

---

## §0 Bootstrap — decis și implementat acum trei zile

Varianta a doua, cu obiecția SIRAR rezolvată: **tokenul nu intră în installer.** E un
fișier alături, `itppro-claim.json`, descărcat din contul Academy autentificat. Installerul
rămâne generic și semnabil o singură dată, deci propoziția din F-ONB e respectată — se
personalizează configul, nu binarul.

Nu e pe `link/start`. Fluxul de claim are trio-ul lui, `claim/{start,status,complete}`, plus
`claim/confirm` și `claim/deny`. Endpoint-urile consumate de SIRAR sunt neatinse.

Totul e livrat și e `404` până când proprietarul aprinde `INSTALLATION_CLAIM_ENABLED`. Cheia
M2M e pusă și verificată — am probat-o pe producția voastră cu un payload invalid deliberat:
`400 invalid_payload` cu cheia noastră, `401 invalid_key` cu una greșită. Deci autentificarea
funcționează și n-am creat nicio stație probând.

## §1 Revocarea în cascadă — emitem

Construit ca **outbox, nu apel direct**. Motivul e același pentru care claim-ul comite
înainte să provisioneze: revocarea unei chei nu are voie să depindă de disponibilitatea
altcuiva. Mutația scrie un rând și se întoarce; livrarea e treaba unui cron la 5 minute, cu
backoff 1m/2m/4m/8m/16m și șase încercări.

**`id`-ul evenimentului e chiar `Idempotency-Key`**, deci o reluare e același eveniment și
niciodată al doilea — ceea ce contează cel mai mult exact la tipul care distruge ceva la voi.

Tratăm **orice 2xx ca succes, inclusiv `handled:false`**. Ați construit acel răspuns ca să
nu vă blocați coada; a-l citi ca eșec ar arunca fix garanția pe care ne-ați dat-o. Un `4xx`
e terminal, `429` nu.

Un `3xx` e verdict propriu, nu ceva de urmat. Am învățat asta ieri pe pielea noastră: apexul
vostru redirecționează către `www` și antetul `Authorization` se pierde la traversarea de
host, deci un redirect urmat tăcut ar fi apărut ca `401` și l-am fi diagnosticat drept cheie
proastă. Trimitem pe `www.uitdeitp.ro`.

## §2 Ceilalți inspectori — `member.added`, din trei locuri

Inventarul vostru ne-a surprins și pe noi: ați construit rolul, dashboardul care ascunde
datele de contact de el, și nimic n-a scris vreodată un rând cu `inspector`.

Emitem acum din toate cele trei locuri în care apare un membru: la finalizarea unui claim, la
legarea directă din admin, și la mutarea unui inspector. Payload: `{email, role:'inspector', slot}`.

Regula voastră — doar cont confirmat, altfel `403` — rămâne a voastră și e corectă. Noi
trimitem emailul; validarea o faceți voi, ca la provisionare.

## §3 Rotirea — nimic de la noi, și aveți dreptate cum ați rezolvat-o

Revocarea celei vechi la prima folosire reușită a celei noi e alegerea bună: momentul acela
e dovada că bundle-ul a ajuns, deci nu poate lăsa o stație fără chei. Nu depinde de noi,
ceea ce e un plus, nu un minus.

Semnalul explicit pe care îl ofereați ca alternativă există deja la noi ca moment —
`claim/complete`, apelat de agent după `fsync` — dar nu vi-l trimitem, fiindcă soluția
voastră e suficientă și nu vrem să vă legăm de un apel în plus de la noi.

## §4 Tier, cod RAR, proprietar

**Tier: emitem, dar cu o precizare importantă.** La noi tier-ul e proprietate a **cheii**,
nu a stației — o stație ține legitim o cheie `lite` și una `auto` în același timp, fiindcă
așa arată upgrade-ul documentat prin suprapunere. Deci „tier-ul stației" nu e bine definit;
trimitem **cel mai puternic tier utilizabil**, plus cel emis, în `{tier, issued}`. E singura
citire care răspunde la întrebarea pe care o puneți de fapt.

**Codul RAR: nu se schimbă niciodată.** Nu există flux de redenumire în Academy, iar
`rar_code` e unic și ajunge în răspunsuri semnate. Nu vă trimitem `rar_code.changed` fiindcă
n-am putea să-l emitem onest. Dacă vreodată construim schimbarea, evenimentul vine odată cu ea.

**Proprietarul: de acord, rămâne manual.** Regula voastră — „proprietarul legal nu se schimbă
dintr-un claim" — e corectă și n-avem ce adăuga. O stație vândută e o decizie umană.

**`station.renamed`: nu-l emitem.** Nu avem redenumire. Regula comună rămâne oricum că numele
existent câștigă.

## §5 Ștergerea contului — confirmăm poziția voastră, și adăugăm un fapt

**Ștergerea unui cont Academy dezactivează accesul, nu șterge date.** Sunteți operatorul
datelor șoferilor; noi suntem un cont de instruire. Evidența de consimțământ a altcuiva nu
dispare fiindcă un inspector și-a închis contul de învățat.

Faptul de adăugat: **Academy n-are astăzi ștergere de cont self-service.** Am căutat, nu
există. Deci scenariul nu se poate produce încă pe calea aia. Când o construim, va emite
`member.removed` pentru fiecare legătură a persoanei — nimic mai mult.

Scris aici ca să fie undeva înainte să se întâmple prima dată, cum ați cerut.

## §6 Forma — adoptată

```
POST https://www.uitdeitp.ro/api/partner/stations/events
Authorization: Bearer <cheia M2M>
Idempotency-Key: <id-ul evenimentului nostru>

{ "type": "...", "academy_station_id": "...", "rar_code": "CT060",
  "occurred_at": "...", "data": { ... } }
```

Prima tranșă, adică ce emitem de la prima zi:

| Tip | Când |
|---|---|
| `installation.deactivated` | ultima cheie utilizabilă a dispărut (revocată, suspendată sau expirată) |
| `installation.reactivated` | prima cheie utilizabilă a reapărut |
| `member.added` | claim finalizat, sau legare din admin |
| `member.removed` | legătură revocată — din admin sau de inspector din profilul lui |
| `tier.changed` | s-a emis o cheie și tier-ul efectiv al stației s-a schimbat |

**Starea instalării o derivăm din ce a rămas, nu din ce tocmai s-a schimbat.** Revocarea unei
chei din două nu dezactivează instalarea, iar emiterea pe acțiune ar tăia o stație care
funcționează. Numărăm cheile utilizabile după schimbare — același lucru pe care îl raportează
`/api/licenses/verify`.

---

## Cum pornim, și de ce nu azi

Rândurile se scriu **deja**, cu livrarea oprită. Sunt urma a ceea ce v-am fi spus, și cel mai
ieftin mod de a verifica dacă fluxul de evenimente e corect **înainte** să aibă consecințe.
Când aprindem `PARTNER_EVENTS_ENABLED`, coada se drenează.

Un detaliu deliberat: **evenimentele mai vechi de 24 de ore se marchează `skipped`, nu se
trimit.** Dacă pornim livrarea după o săptămână de tăcere, nu vrem o rafală de revocări
vechi către un partener a cărui stare a mers mai departe între timp.

Ordinea pe care o propunem: întâi `INSTALLATION_CLAIM_ENABLED` și prima stație reală trecută
împreună, apoi `PARTNER_EVENTS_ENABLED` după ce ne uităm amândoi la ce s-a scris în coadă în
ziua aia. O revocare greșită e mai scumpă decât o revocare întârziată.

## Ce v-ar ajuta înapoi

1. Confirmarea că prima tranșă de cinci tipuri vă e de ajuns pentru a închide §1.
2. Dacă preferați ca `tier.changed` să poarte altceva decât `{tier, issued}` — spuneți acum,
   cât timp nu emite nimic.
3. Un semnal când endpoint-ul vostru de evenimente e gata să primească trafic real, ca să
   aprindem în aceeași zi și să ne uităm împreună la prima rundă.
