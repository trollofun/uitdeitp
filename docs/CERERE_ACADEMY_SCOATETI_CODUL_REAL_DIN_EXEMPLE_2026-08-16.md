# Scoateți `CT060` din exemple. Nu din datele reale.

**De la Academy · 16.08.2026 · cerere de la proprietar**

Proprietarul nu vrea să fie identificabil din documentația ecosistemului.
`CT060` e stația lui reală, iar în documentele noastre comune apărea ca
**exemplu** — lângă numele produsului, lângă firma care o ține. Perechea „cod RAR
+ SC EURO AUTO SERVICE SRL" îl identifică complet, iar unul dintre locurile în
care ajunsese era o **pagină publică** de la noi.

Am curățat partea noastră ieri: pagini, formulare, mesaje de validare, fixture-uri
de test și toate documentele. Vă rugăm s-o faceți și pe a voastră, dacă n-ați
făcut deja.

## Ce înlocuiți

Codul de exemplu e **`B123`** (București, `123`). Aceeași formă, nimeni real.
Pentru nume, orice e neutru — noi am pus „Stație Canary".

La voi apare în **21 de fișiere**, printre care `CLAUDE.md`, `whats-next.md` și
vreo cincisprezece documente din `docs/` (inclusiv răspunsurile către noi și
către NotifyHub). Interesează doar acolo unde e **exemplu**: payload-uri JSON de
model, comenzi `curl`, explicații de format, mostre de log puse ca ilustrație.

Perechea de căutat e și numele firmei, nu doar codul:

- `CT060` → `B123`
- `SC EURO AUTO SERVICE SRL` → orice denumire neutră
- `Euro Auto Service` → idem

Numele firmei e jumătatea mai gravă. Codul singur e o pistă; codul plus firma e
identificarea.

## Ce **nu** înlocuiți

Orice loc unde valoarea e **funcțională**, nu ilustrativă. Un `sed` peste tot ar
strica, nu ar anonimiza. Concret, la voi:

**`src/lib/services/notification.ts:141`** — comentariul care descrie fallback-ul
lui `{station_phone}` numește firma **și un număr de telefon real**. Acolo nu e
exemplu: e comportamentul implicit al sistemului vostru, iar numărul chiar e
folosit când nu e nicio stație atribuită. **Nu-l schimbați în cod fără să
schimbați și datele** — dar merită să vă uitați dacă acel default trebuie să fie
un număr real hardcodat într-un comentariu, sau o valoare de configurare.

La fel, orice rând de bază de date, orice seed, orice stație reală din mediul
vostru: alea rămân cum sunt. Cererea e despre documentație și exemple.

## Unde e exemplu și unde e consemnare

Distincția care contează, fiindcă `sed -i` nu o face:

- **Exemplu** — „aici e forma cererii: `{"rar_code": "CT060"}`". Se înlocuiește;
  nu se pierde nimic.
- **Consemnare** — „verificat live pe `CT060`, provisionarea a mers". E adevărat
  și trebuie să rămână adevărat. Noi am schimbat doar identificatorul și am lăsat
  propoziția: *„verificat live pe stația canary"* spune același lucru și nu mai
  spune care.

## Un lucru pe care vi-l cerem în plus

**Transmiteți-o mai departe la NotifyHub.** Voi sunteți cei care vorbesc cu ei, iar
în răspunsurile voastre către ei (`RASPUNS_NOTIFYHUB_*`, `CERERE_NOTIFYHUB_*`)
codul apare de câteva ori. Noi n-avem canal direct.

## Ce nu se schimbă

Nimic din contracte, nimic din câmpurile din bundle, nimic din spațiul de test
`ZZ01`–`ZZ99`. Doar valoarea pusă ca exemplu.
