# Răspuns SIRAR — Contract A, pornire

**2026-08-09 · de la echipa uitdeITP · răspunde la `cerinte-uitdeitp.md` (rev. 08–09.08)**

Documentul vostru e cel mai util pe care l-am primit de la cineva din ecosistem:
patru puncte concrete, două autocorecții și o listă cu ce ați verificat singuri în
codul nostru. Răspundem în aceeași ordine, plus un lucru pe care l-am descoperit
probând comanda din documentul vostru — și care v-ar fi costat o zi.

---

## 0. Comanda din documentul vostru primește 401. Nu din cauza cheii.

Aveți scris:

```bash
--url https://uitdeitp.ro/api/integrations/reminders
```

Fără `www`. Adresa aia răspunde cu **307** către `https://www.uitdeitp.ro/...`.
Un 307 păstrează metoda și corpul, deci pare inofensiv — dar e o schimbare de
host, iar `requests` **șterge antetul `Authorization`** la redirect între hosturi.
E comportament documentat (`Session.rebuild_auth`), nu un bug al vostru.

Probat acum, cu `requests`, nu dedus:

```
POST https://uitdeitp.ro/api/integrations/reminders
  lant redirect: [307] -> https://www.uitdeitp.ro/api/integrations/reminders
  Authorization ajuns la destinatie: None
  status final: 401

POST https://www.uitdeitp.ro/api/integrations/reminders
  Authorization: 'Bearer PROBA123'
  status: 401   ← 401 corect, cheia chiar e invalidă
```

Ambele dau 401, dar din motive complet diferite. Primul nu vede niciodată cheia.
Ați fi rulat unealta, ați fi primit 401 la fiecare cerere, și amândoi am fi
căutat problema în cheie.

**Folosiți `https://www.uitdeitp.ro/api/integrations/reminders`.** Ăsta e URL-ul
canonic, cu `www`. Nu vă cerem să tratați redirectul — vă cerem să nu-l atingeți.

Ne notăm și partea noastră: un endpoint de integrare n-ar trebui să depindă de
ce formă a domeniului nimerește apelantul. Nu-l reparăm însă cu o excepție de
rutare, care ar ascunde problema pentru următorul; canonic rămâne `www`.

---

## 1. Ce ne-ați cerut ca să porniți

**1. URL-ul.** `https://www.uitdeitp.ro/api/integrations/reminders`. Producție,
fără staging — confirmat, nu există a doua adresă. Nu e o scăpare: sub flag și
cu chei per stație, producția e locul cel mai onest pentru un contract care
oricum se probează cu date reale. Plăcuța `TEST99` e în regulă; o curățăm noi
după.

**2. Cheia pentru CT060.** Aici starea e mai încurcată decât credeați, și
preferăm să v-o spunem exact:

| Cheie | Etichetă | Stare | Ultima folosire |
|---|---|---|---|
| `be4a4330` | PROBĂ AUTOMATĂ — de revocat | revocată 07.08 | 07.08 20:37 |
| `6c3097d4` | SIRAR | revocată 08.08 | niciodată |
| `d1582be4` | SIRAR | **activă** | 08.08 19:28 |

Cea activă a fost folosită ieri seară — de **proba noastră** cap-coadă, nu de
voi. Secretul se afișează o singură dată și nu-l avem stocat nicăieri; voi
scrieți că aveți nevoie de una nouă, deci nici voi nu-l aveți. O cheie activă pe
care n-o deține nimeni e o rămășiță, nu o resursă.

Deci: **emitem una nouă și o revocăm pe `d1582be4`.** Bearer-ul și secretul HMAC
vi le trimitem **în afara documentelor și în afara chat-ului** — aceeași regulă
pe care ne-a impus-o Academy și pe care am adoptat-o. Spuneți-ne pe ce canal.

**3. Secretul HMAC.** Da, emitem unul, separat de Bearer. Semnați.

**4. Tenantul din Bearer.** Confirmat, și e structural, nu convenție:
`station_id` vine din cheie (`authenticateBearer`), iar `statie_ref.rar_code` e
comparat doar ca verificare de sanitate — nepotrivirea dă `422 rar_code_mismatch`
și nu schimbă niciodată tenantul. Codul RAR nu poate autentifica nimic la noi.

---

## 2. Revizia 3 — și un câmp care ne lipsește din lista albă

Distincția `versiune` / `payload_rev` e corectă și o adoptăm în vocabularul
nostru. Aveți dreptate că nu validăm `versiune`; rămâne așa deliberat.

Blocurile noi trec. `vehicul_extins` ajunge întreg la handler și nu-l mai taie
nimic — există un test dedicat (`tests/integrations/contract-a-rev3.test.ts`)
tocmai ca fix-ul de passthrough imbricat să nu se piardă la o refactorizare.

**Ce vă cerem, explicit: `vin`, `serie_civ` și `odometru` în lista albă.**

Lista din tabelul vostru („an fabricație, cilindree, putere, mase, dimensiuni,
normă de poluare, CO₂") nu le include. Nu presupunem că e o omisiune — o listă
albă e o listă albă.

Motivul pentru care le cerem e concret. Azi nu putem răspunde la întrebarea care
interesează cel mai mult o stație: *câți clienți nu s-au mai întors?*
`inspected_at` e populat 12 din 149 și numai prin Contract A; `superseded_by` e
7 din 149 și, sub scope global, o revenire la **altă** stație marchează supersede
la noi — fals pozitiv. Deci orice raport de retenție construit azi minte.

Cu VIN se răstoarnă: un client cu ITP expirat la noi, dar cu ITP valabil în
evidența publică, **a făcut inspecția în altă parte**. Nu e o estimare, e un
fapt. Fezabilitatea interogării RAR n-o avem încă probată, și n-o promitem
nimănui până n-o probăm — dar fără VIN nici n-are rost s-o încercăm.

**Partea neplăcută, spusă de noi, nu descoperită de voi:** VIN-ul e dată cu
caracter personal atunci când e legabil de o persoană, iar la noi e legabil,
pentru că stă lângă `destinatar`. Nu e „date tehnice". Deci:

- îl cerem doar când `destinatar` există — adică doar când clientul a consimțit;
- îl stocăm în `service_visits` (F3.1), nu pe rândul de reminder, ca să aibă
  propriul ciclu de viață și propria ștergere;
- dacă vă e mai comod, trimiteți-l pe tot lotul și filtrăm noi la ingest —
  spuneți-ne care variantă vă convine, oricare e în regulă.

`serie_civ` și `odometru` le cerem din același motiv (dosarul mașinii, plan de
service pe rulaj), cu aceleași condiții. `odometru` îl acceptăm deja ca bloc
opaco (`z.unknown()`), deci nu vă blochează nimic dacă îl trimiteți azi.

---

## 3. Inspecțiile respinse — de acord, și am pus poarta oricum

Argumentul vostru e mai bun decât cererea noastră inițială: retestul e o
inspecție întreagă, cu alt `session_id`, deci alt `id_eveniment`. Nu cerem
schimbare de schemă. Închis.

Am adăugat totuși, pe 09.08, o coloană `reminders.inspection_result` și o poartă
în procesorul de cereri de recenzie, care sare peste `rejected`.

Nu ca să vă contrazicem — ci pentru că poarta era **implicită**, iar noi
descoperisem că singurul lucru care oprea un SMS de tipul „mulțumim, lasă-ne o
recenzie" către un om căruia tocmai i-am respins mașina era faptul că voi nu
trimiteți respingerile. O regulă de siguranță care depinde de politica de
trimitere a altcuiva nu e o regulă. Acum e explicită la noi, costă o linie, și
rămâne inertă atâta timp cât `inspection_result` e `NULL` — adică pentru toate
cele 149 de rânduri existente și pentru tot ce trimiteți voi azi.

Dacă vreodată vă răzgândiți, nu mai trebuie să ne anunțați înainte.

---

## 4. Fără expirare nu emiteți — de acord, și motivul vostru e cel bun

„Pentru voi un 422 e o linie de log; pentru noi înseamnă `dead/`, fără retry."
Asta e asimetria corectă și e exact motivul pentru care nu vă cerem s-o
schimbați. Câmpul (6) al certificatului e sursa autoritară; alerta la voi, când
OCR-ul nu-l prinde, e locul potrivit pentru ea.

---

## 5. Istoricul: nu încă, și vă spunem când

Cele 17 inspecții cu date pe disc ar primi azi `202 no_recipient` și **n-ar
produce nimic** — nici măcar un rând de istoric, pentru că `service_visits` (F3.1
din PRD-ul nostru) **nu există încă în bază**. Am verificat, nu presupus.

Deci: nu porniți modul de trimitere acum. Ar fi 17 cereri care se termină în
`202` și dispar, iar când construim tabela ar trebui să le retrimiteți oricum.

Vă anunțăm noi când `service_visits` e în producție. Atunci istoricul devine
chiar util — mai ales împreună cu VIN-ul de la §2, pentru că un dosar de mașină
fără identificator de mașină e o listă de date.

---

## 6. Ce păstrăm, pentru că ne-ați cerut-o

**`details[].field` + `message` rămân.** Sunt generate din `err.path.join('.')`
în `src/lib/api/errors.ts`, deci vin din structura schemei, nu dintr-o listă
scrisă de mână care s-ar putea usca. Nu le atingem.

**Cele trei câmpuri imbricate rămân imbricate.** Ne-ați oferit să le mutați la
rădăcină dacă ne încurcă passthrough-ul — mulțumim, dar nu e nevoie: e acoperit
de test acum, iar tăierea tăcută nu se mai poate întâmpla fără ca suita să cadă.
Aveți dreptate în principiu (rădăcina e mai sigură pentru câmpuri aditive), doar
că aici garanția e verificabilă, nu presupusă.

**Retragerea de la `CT40PAULA` o notăm ca atare.** Faptul că ați reconstruit
cererea manual ca să aflați ce câmp deranjează, și că apoi ați mutat validarea
plăcuței la tastare, e reparația corectă: eroarea trebuie prinsă acolo unde omul
poate încă s-o repare, nu la livrare.

---

## Ce urmează, concret

| Cine | Ce | Când |
|---|---|---|
| noi | emitem cheia nouă, revocăm `d1582be4` | la confirmarea canalului de transmitere |
| voi | schimbați URL-ul pe `www.uitdeitp.ro` | înainte de prima rulare |
| voi | ne spuneți dacă puteți adăuga `vin`, `serie_civ`, `odometru` în lista albă | când vă convine |
| noi | vă anunțăm când `service_visits` există | apoi porniți backfill-ul |

Prima inspecție reală o trecem împreună, ca la Academy. Spuneți-ne când sunteți
la stație și stăm pe fir.
