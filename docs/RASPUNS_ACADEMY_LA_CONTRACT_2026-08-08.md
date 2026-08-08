# Răspuns Academy la `RASPUNS_CONTRACT_ACADEMY_2026-08-08.md`

**2026-08-08 · de la echipa Academy · închide bucla**

Toate trei răspunsurile sunt acceptate. Contractul de la noi e actualizat la forma voastră
și e închis, cu **o singură precizare** care nu poate rămâne implicită. Mai jos: cele două
lucruri pe care le-ați cerut, precizarea, și ce facem cu ce ne-ați spus nesolicitat.

---

## Precizarea: `403` nu poate însemna două lucruri

Tabelul nostru clasifica `401/403` împreună ca `inconclusive`. Al vostru alocă `401` cheii
M2M invalide și `403` unui `inspector_email` neconfirmat, terminal.

Împărțirea e curată — **dacă e garantată la nivel de implementare, nu doar de tabel.**
Multe framework-uri răspund `403` pentru o cheie validă dar neautorizată. Dacă un `403`
poate însemna și „cheia ta M2M nu are voie aici", atunci noi îi vom spune inspectorului că
are emailul neconfirmat exact atunci când de fapt cheia noastră e prost rotită — adică fix
eșecul pe care regula lui `401 → inconclusive` există ca să-l prevină.

**Acceptăm `403 → rejected` cu condiția ca o cheie M2M invalidă, expirată sau revocată să
întoarcă `401`, niciodată `403`.** Alternativ, un câmp `code` citibil de mașină în corp, pe
care ramificăm noi. Oricare variantă e bună; ambiguitatea nu. Confirmați-ne pe care o
alegeți și e ultimul lucru deschis între noi.

---

## 1. `410 + rotate` ne convine. Nu vrem endpoint separat.

Un singur endpoint, o singură cheie de idempotență, nicio suprafață de autentificare nouă.
Un `/rotate` separat ar fi al doilea loc din care ies credențiale, deci al doilea loc de
securizat, auditat și revocat.

**Unde îl folosim, ca să știți la ce trafic să vă așteptați.** Cronul nostru de reconciliere
renunță după 5 încercări cu backoff `min(3600, 60·2^(n-1))` — aproximativ 15 minute, mult
sub fereastra voastră de 24h. Deci un `410` e practic inaccesibil din cron. Locul lui real e
**butonul de retry din panoul nostru de admin**, apăsat peste zile. Acolo trimitem
`rotate: true`.

O singură cerință: `410` să poarte în corp codul citibil de mașină pe care l-ați numit
(`bundle_expired`), ca butonul din admin să poată spune operatorului *de ce* reia cu
rotație, nu doar că a eșuat.

## 2. Canalul pentru cheia M2M: direct în Vercel, de mâna proprietarului

Nu prin fișier, nu prin chat, nu prin vreun repo. Cheia noastră publică ES256 a mers pe git
fiindcă e publică; asta e un secret și merge altfel.

**Generați-o voi, o dată. Proprietarul o lipește direct în Vercel** ca
`UITDEITP_PARTNER_API_KEY` (Production), dintr-un editor simplu — nu din terminal, unde un
newline invizibil ajunge în câmp.

Verificăm apoi **valoarea, nu prezența**. Vercel afișează o variabilă ca existentă chiar
dacă e goală, iar codul care o citește ar sări peste apel în tăcere. Exact asta s-a
întâmplat la noi cu tokenul de webhook Gumroad: setat, existent de o oră, gol. Verificarea
e mecanică acum.

---

## 3. Ce luăm în seamă din ce ne-ați spus nesolicitat

**`tier` nu face nimic la voi în v1** — nu construim nimic în plus. Îl trimitem pentru
trasabilitate. Diferența `sirar_automation` rămâne integral la noi, unde e oricum calculată
din `plan_type`, niciodată din `subscription_status`.

**Voi adăugați `inspector_email` ca `patron`; noi îl adăugăm ca `inspector`.** Divergența e
intenționată, nu o scăpare. La noi nimic din datele de claim nu identifică un proprietar, iar
rolul de patron ar acorda drepturi pe care nimeni nu le-a cerut — aceeași regulă pe care am
aplicat-o și la backfill-ul manual al celor 9 stații. `rar_code` rămâne cheia de corelare
între sisteme. Dacă vreodată sincronizăm rolurile, e o decizie separată, luată explicit.

Aterizarea pe rol la voi e exact rezultatul dorit din F-ONB.1b — inspectorul nu află
niciodată că sunt două sisteme.

---

## 4. Gaura din `find_user_id_by_email`

Mulțumim că ați spus-o nesolicitat. Nu e o curățenie paralelă: invariantul „rolul se atașează
doar pe email verificat" e **temelia** lui F-ONB.1b și singurul lucru care stă între un cont
creat cu emailul altcuiva și preluarea stației lui.

Deci reparația voastră e **precondiție pentru primul apel real**, nu pentru lansare. **Nu
trimitem trafic către endpoint până nu confirmați că a intrat în producție.** Nu e
neîncredere — e că am scris în contract că ne bazăm pe ea, iar un contract care se sprijină
pe o presupunere neverificată e exact ce am petrecut ziua asta reparând.

---

## 5. Ce facem noi mai departe

Blocajul e ridicat: scriem partea Academy pe forma din răspunsul vostru — tabelă separată
`station_claims`, trio-ul `claim/{start,status,complete}`, confirmarea care comite intenția
înainte de apelul ieșit, și un cron de reconciliere. Endpoint-urile consumate de SIRAR
rămân neatinse.

`claim/start` va întoarce **exact forma răspunsului lui `link/start`** (`user_code`,
`user_code_display`, `verification_uri_complete`, `expires_in`, `interval`), ca partea PWA
să reutilizeze randarea de QR neschimbată. Diferă doar autentificarea și URL-ul.

Contractul nostru actualizat, cu tot ce e mai sus plus harta schimbărilor din Academy, e în
repo-ul Academy la `docs/CONTRACT_ACADEMY_UITDEITP_PROVISION.md`. Răspunsul vostru e salvat
acolo verbatim, ca linkurile să se rezolve.

Anunțați-ne când endpoint-ul e pe staging sub flag și când reparația de la punctul 4 e în
producție. Alegeți varianta pentru `403` și n-a mai rămas nimic deschis.
