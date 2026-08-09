# uitdeITP → Academy — endpoint-ul e viu, plus o gaură la pornire

**2026-08-09 · răspunde la `RASPUNS_ACADEMY_CICLU_DE_VIATA_2026-08-09.md`**

Cele trei întrebări, pe scurt: **da**, **da**, și **e gata acum**. Detaliile mai
jos, plus două lucruri pe care le-am schimbat la noi după ce am citit ce emiteți
— unul dintre ele ar fi tăiat un client care plătește.

---

## Răspunsurile

**1. Cele cinci tipuri închid §1?** Da, complet. `installation.deactivated` singur
ar fi fost destul pentru gaura urgentă; cu `member.added` se deblochează și
inspectorii, care erau problema mai jenantă — construisem rolul, dashboardul care
ascunde datele de contact de el, și nimic nu scria vreodată un rând.

**2. `tier.changed` cu `{tier, issued}`?** Rămâne cum ați propus. Precizarea
voastră — că tier-ul e proprietate a **cheii**, nu a stației, fiindcă upgrade-ul
se face prin suprapunere — e exact genul de lucru pe care l-am fi aflat greșit
mai târziu. Stocăm `tier` ca „cel mai puternic tier utilizabil", iar `issued`
rămâne în jurnalul de evenimente. Azi nu variază nimic în produs după tier; când
va varia, întrebarea corectă e tot cea la care răspundeți voi.

**3. Semnalul că suntem gata.** Ăsta e semnalul. `POST /api/partner/stations/events`
e în producție, probat pe date reale:

| Caz | Rezultat |
|---|---|
| fără cheie / cheie necunoscută | `401` |
| fără `Idempotency-Key` | `422` |
| tip necunoscut | `202 {handled:false, reason:"unknown_event_type"}` |
| stație necunoscută | `202 {handled:false, reason:"station_not_found"}` |
| `installation.deactivated` | `202 {handled:true, revoked_keys:2}` |
| aceeași cheie, din nou | `200 {replayed:true}`, același rezultat |
| `member.added`, email neconfirmat | `202 {handled:false}` + motivul, în clar |
| `member.added`, cont confirmat | `202 {handled:true, role:"inspector"}` |
| `tier.changed` | `202 {handled:true}` |
| `station.renamed` | `202 {handled:false}` — logat, neaplicat |
| `installation.reactivated` | `202 {handled:true}`, fără cheie nouă |

Scope-ul e `stations:lifecycle`, separat de `stations:provision`: cine poate
dezactiva o stație n-are neapărat nevoie să poată crea una. **Cheia voastră M2M
existentă n-are încă scope-ul ăsta** — spuneți-ne dacă vreți același bearer
extins sau unul separat, și îl emitem.

---

## Ce am schimbat la noi după ce am citit ce emiteți

### Dezactivarea nu mai oprește kiosk-ul

Prima versiune punea și `is_active: false`, ceea ce ar fi oprit și colectarea din
kiosk. Greșit — și greșit exact în dauna cuiva care plătește.

Voi emiteți evenimentul când „ultima cheie utilizabilă a dispărut", adică despre
licența SIRAR. Kiosk-ul e produsul nostru, vândut separat: **o stație poate
renunța la Automatizare și rămâne clientul nostru.** Ce depinde de instalarea
SIRAR e Contract A, deci doar ingestul se oprește acum. Reactivarea e simetrică:
dacă n-am oprit `is_active`, nu-l repornim — o stație oprită manual din admin
n-are voie să reînvie dintr-un eveniment despre licența altcuiva.

Prins înainte să aibă consecințe, fiindcă livrarea voastră e oprită. Ăsta e chiar
argumentul pentru ordinea pe care o propuneți.

### `rar_code.changed` și `station.renamed` rămân, dar știm că nu vin

Ne-ați spus limpede că nu le puteți emite onest fiindcă nu aveți fluxurile.
Handler-ele rămân — costă zero și nu vrem să le adăugăm sub presiune în ziua în
care construiți redenumirea. Dar le tratăm ca cod mort până ne spuneți altceva,
nu ca funcții pe care le-am testat cu voi.

---

## Gaura de la pornire: regula de 24 de ore

Marcarea evenimentelor mai vechi de 24h ca `skipped` e decizia corectă — o rafală
de revocări vechi către un partener a cărui stare a mers mai departe e mai
periculoasă decât întârzierea. N-o contestăm.

Dar are o consecință pe care merită s-o numim înainte, nu după: **la aprindere,
starea poate fi deja divergentă.** O stație dezactivată la voi cu trei zile
înaintea flip-ului nu ne va trimite niciodată evenimentul, iar cheia ei de ingest
rămâne validă la noi la nesfârșit — exact gaura pe care endpoint-ul o închide.

Trei ieșiri, oricare merge pentru noi:

1. **O rundă de sincronizare la aprindere:** emiteți o dată starea curentă a
   fiecărei stații (`deactivated` sau `reactivated`), cu `occurred_at` = acum, nu
   data reală. Nu e istoric, e o fotografie — și trece de regula de 24h prin
   construcție.
2. **Un endpoint de listare la voi**, pe care să-l interogăm noi periodic și să
   reconciliem. Mai multă muncă, dar nu depinde de un moment anume.
3. **Nimic, dacă aprindem în aceeași zi** — dacă `PARTNER_EVENTS_ENABLED` vine la
   câteva ore după `INSTALLATION_CLAIM_ENABLED`, fereastra de divergență e prea
   mică pentru a conta.

Preferăm **(1)**: e o singură rundă, e verificabilă, și ne lasă amândurora o
stare de pornire despre care știm că e adevărată. Dar dacă mergeți pe (3),
spuneți-ne ora și ne uităm împreună.

---

## Trei lucruri pe care le-ați nimerit și merită spuse

**Orice `2xx` e succes, inclusiv `handled:false`.** Exact. Am construit răspunsul
ăla ca să nu vă blocați coada; dacă l-ați fi citit ca eșec, ați fi aruncat fix
garanția pe care v-o dădea.

**`id`-ul evenimentului = `Idempotency-Key`.** Asta contează cel mai mult la
tipurile care distrug ceva. Reluarea noastră întoarce ce s-a decis prima dată, nu
re-execută — deci o revocare rămâne o revocare, oricâte reluări ar veni.

**Redirectul apex→www.** Ați dat peste el independent, în aceeași zi în care
l-am găsit noi probând comanda din documentul SIRAR: `requests` șterge
`Authorization` la traversarea de host, deci un `3xx` urmat tăcut apare ca `401`
și-l cauți în cheie. Faptul că amândoi l-am prins înainte de trafic real, și
nu la prima stație, spune ceva bun despre cum lucrăm.

---

## Ce e nou de partea noastră, care vă privește

**Cheia NotifyHub se cere acum la provisionare.** Contract F o promitea, antetul
rutei noastre o afirma, și **codul nu cerea nimic** — coloanele rămâneau goale.
O stație provisionată prin voi ar fi trimis pe cheia platformei: fără credite
proprii și cu topup-ul Gumroad rupt tăcut, fiindcă webhook-ul n-ar fi avut ce
credita.

Reparat și probat cap-coadă azi: provisionare → cheie de ingest → **cheie
NotifyHub emisă și pusă în Vault** → patron atașat. Pentru voi nu se schimbă
nimic în apel; doar promisiunea din contract e acum adevărată.

---

## Ordinea, confirmată

De acord cu ce propuneți: întâi `INSTALLATION_CLAIM_ENABLED` și prima stație
reală trecută împreună, apoi `PARTNER_EVENTS_ENABLED` după ce ne uităm amândoi la
ce s-a scris în coadă în ziua aia. „O revocare greșită e mai scumpă decât o
revocare întârziată" — o notăm ca regulă comună, nu doar ca decizie de moment.

Ce ne mai trebuie de la voi: decizia pe scope-ul cheii M2M (extindem cea
existentă sau emitem alta), și care din cele trei variante de la §24h.
