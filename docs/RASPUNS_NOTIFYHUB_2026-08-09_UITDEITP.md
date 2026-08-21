# uitdeITP → NotifyHub — ce am schimbat la noi

**2026-08-09 · răspunde la `docs/RASPUNS_NOTIFYHUB_2026-08-09.md`**

Am găsit aceeași problemă din capătul celălalt, în aceeași zi, fără să știm unul
de altul: voi ați descoperit că numărați caractere în loc de septeți, noi am
descoperit că **toate cele patru șabloane SMS din producție aveau diacritice** și
se taxau dublu. Concluziile se confirmă reciproc, iar detaliul pe care ni l-ați
dat despre tabelul de extensie a prins la noi o greșeală pe care n-o vedeam.

---

## 1. Tariful — aveți dreptate, și eu spusesem cifra greșită

Raportasem „0,036–0,04, unitate neconfirmată". Voi ați stabilit **0,035 EUR/parte
net = 0,04235 cu TVA**, iar observația de fond e mai valoroasă decât corecția de
14%: cu 0,04 ca preț unitar, derivarea părților din prețul real n-ar fi dat
niciodată un întreg, deci reconcilierea pe cost real n-ar fi funcționat deloc.
Notat, folosim 0,035 net.

## 2. TVA — ajustat, și nu unde v-ați fi așteptat

Confirmat, §6.3: am ajustat. Dar merită spus **unde** era pericolul, pentru că nu
era într-un calcul de-al nostru.

Stocam direct `result.cost` în coloana noastră `notification_log.estimated_cost`.
La voi, `estimated_cost` rămâne net. Deci după schimbarea voastră, două coloane
cu **aceeași denumire**, în două baze diferite, ar fi ținut numere care diferă cu
21% — fără nicio eroare, fără niciun log, până la prima reconciliere lunară, când
ar fi ieșit o „drift" pe care am fi căutat-o în ledger.

Ce am făcut:

- `estimated_cost` la noi stochează acum **`cost_net`** — aceeași semantică cu a
  voastră și cu factura providerului;
- bruta merge în coloană separată, `cost_gross`;
- `vat_rate` se stochează **per rând**, din exact motivul pe care l-ați dat: un
  raport pe o lună trecută trebuie să folosească cota de atunci;
- citim `cost_net ?? cost`, deci un răspuns dinaintea flag-ului vostru nu se
  interpretează greșit în tranziție.

## 3. Părțile — le stocăm și noi acum

Semnalasem că `parts` e gol la voi (0 din 12). Partea pe care n-o spusesem: nici
noi n-aveam unde să-l punem. Coloana nu exista în `notification_log`.

Adăugată, împreună cu `cost_gross`, `vat_rate`, `currency`. Deci de acum costul
unui mesaj e auditabil din ambele capete, independent — dacă numerele noastre
diverg vreodată de ale voastre, se vede fără să reconstruim nimic.

## 4. Tabelul de extensie GSM-7 — verificat la noi, nu presupus

Observația voastră că `^ { } \ [ ] ~ |` și `€` costă **doi septeți** a fost cea
mai utilă din document, pentru că e exact tipul de detaliu pe care o
implementare „rezonabilă" îl ratează.

Am comparat implementarea noastră cu lista voastră, caracter cu caracter:

```
al meu : ^ { } \ [ ~ ] | €
al lor : ^ { } \ [ ] ~ | €
lipsesc la mine: niciunul
```

Le numărăm deja ca doi septeți, și avem test pentru asta (80 × `€` = 160 septeți
= o parte; 81 = două). La fel pentru eroarea inversă pe care ați găsit-o:
`à Ö ñ ü è É Ä §` fac parte din GSM-7 și **nu** le tratăm ca Unicode — există un
test explicit (`'café à Köln'` → GSM-7).

Avertismentul vostru despre paranteze drepte e preluat: editorul de șabloane din
dashboard-ul stației arată acum codarea detectată, numărul real de SMS-uri și
caracterele vinovate, cu buton care le scoate. Un `[uitdeITP]` într-un șablon
de 155 de caractere e exact capcana pe care o descrieți, și acum se vede
înainte de salvare, nu pe factură.

**Un lucru de clarificat:** scrieți „fără diacritice (le eliminăm noi automat)".
Dacă NotifyHub chiar normalizează la trimitere, atunci mesajul din 08.08, care
avea diacritice în corpul stocat la voi și 112 caractere, ar fi trebuit să coste
o parte, nu două. Ori normalizarea e mai nouă decât mesajul, ori corpul se
stochează înainte de normalizare, ori normalizarea nu e activă pe calea aia.
Nu e o reproșare — vrem doar să știm dacă **eliminarea de la noi** (șabloane
rescrise fără diacritice, plus normalizarea valorilor injectate) e redundantă cu
a voastră sau complementară. Preferăm să rămână la noi oricum: mesajul trebuie
să fie corect înainte să plece, nu reparat pe drum.

## 5. Ce ne-ați cerut

**§6.1 — `idempotency_key`.** Îl trimitem deja, exact în formatul recomandat:
`{reminder_id}:{zile_pana_la_expirare}` (`reminder-processor.ts:337`). Puteți
să-l faceți obligatoriu când vreți, din partea noastră.

Un caz-limită pe care îl semnalăm noi: la o reîncercare **a doua zi**, numărul de
zile scade, deci cheia se schimbă. E corect semantic (e alt interval, alt
mesaj), dar înseamnă că un `502` de azi, dacă mesajul chiar a plecat și doar
răspunsul s-a pierdut, ar putea produce mâine un al doilea SMS. În aceeași
rulare suntem acoperiți — reîncercările refolosesc payload-ul, deci și cheia.

**§6.2 — endpoint-ul de alerte.** Încă nu există la noi. Îl construim, dar vrem
să confirmăm forma înainte: presupunem `POST`, corp JSON cu `type` din lista
voastră (`low_balance`, `consumption_anomaly`, `ledger_drift`,
`monthly_reconciliation_*`), semnătură `X-NotifyHub-Signature` = HMAC-SHA256 pe
corpul brut, cu un secret pe care îl generăm noi și vi-l dăm. Confirmați și
spuneți-ne dacă trimiteți și un antet de timestamp — fără el, o semnătură
valabilă e rejucabilă la nesfârșit, iar noi am prefera să respingem cererile mai
vechi de câteva minute.

**§6.3 — TVA.** Ajustat, vezi §2.

## 6. Ce ne-ați cerut și e deja rezolvat de partea noastră

**`rar_code` — nu e gol la noi.** Stația Euro Auto Service are `CT0xx` în
`kiosk_stations.rar_code`, verificat acum în producție. Dacă la voi apare gol,
e fie o citire dinaintea provisionării, fie ne uităm la câmpuri diferite.
Puteți emite cheia; `owner_ref` va avea ce să conțină.

**`owner_email` — există.** Stația are proprietar cu email confirmat. Alertele au
destinatar din momentul în care endpoint-ul de la §5 e gata.

**Textul de consimțământ** — de acord, nu vă atinge. Rămâne blocat pe avizul
juridic; până atunci `REVIEW_SMS_ENABLED` e oprit la noi.

## 7. Codurile noi — tratate, cu o corecție la noi

Am trecut prin tabelul vostru din §7 și am găsit o greșeală de partea noastră:

**`429` nu era reîncercat.** Clientul nostru avea regula „nu reîncerca pe 4xx",
care e corectă pentru 400/401/403 dar nu pentru 429 — ăla nu spune „cererea ta e
greșită", ci „nu acum". O limită atinsă la 09:00 însemna un reminder pierdut
pentru toată ziua, deși a doua încercare peste câteva secunde ar fi trecut.
Reparat: backoff care respectă `Retry-After` când îl trimiteți, altfel
exponențial, plafonat la 30s. Reîncercarea refolosește același
`idempotency_key`, deci nu poate produce un al doilea SMS.

Restul: `502` era deja reîncercat (regula pe 5xx) cu aceeași cheie — exact ce
cereți. `402` și `403` se întorc imediat, fără reîncercare. `409` nu se
reîncearcă.

## 8. `/api/send-direct`

Confirmat: n-avem niciun apelant. Secvența voastră (telemetrie → `410` → ștergere)
e în regulă; dacă vedem vreun apel rezidual în logurile noastre, vă anunțăm.

## 9. Un lucru pentru care vă rămânem datori

Faptul că ați scris „diagnosticul vostru era corect ca observație, dar cauza era
deployment, nu implementare" e distincția care ne-a lipsit nouă. Raportasem
„NotifyHub n-a construit încă" pe baza a două `404`-uri, ceea ce era o concluzie
mai tare decât dovada. Data viitoare spunem ce am observat, nu ce credem că
înseamnă.

---

## Rezumat operațional

| Cine | Ce | Stare |
|---|---|---|
| noi | `estimated_cost` = net, `cost_gross`/`vat_rate`/`currency`/`parts` separate | gata |
| noi | `429` cu backoff și `Retry-After` | gata |
| noi | șabloane fără diacritice + avertisment în editor | gata, în producție |
| noi | endpoint de alerte | **așteptăm confirmarea formei (§5)** |
| voi | confirmați dacă normalizați diacriticele la trimitere (§4) | — |
| voi | puteți emite cheia per stație; `rar_code` = `CT0xx` | — |
