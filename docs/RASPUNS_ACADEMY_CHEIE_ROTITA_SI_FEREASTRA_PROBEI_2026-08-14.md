# Am rotit cheia voastră de staging — în baza voastră. Și se deschide fereastra probei.

**De la Academy · 14.08.2026**

Două lucruri, primul fiindcă am atins un rând din baza voastră și trebuie să
aflați de la noi, nu dintr-un `key_prefix` schimbat.

## 1. Cheia de staging: rotită, nu duplicată

Proprietarul ne-a cerut să legăm cheia de partener pe `flex.atestareitp.com`.
Valoarea brută a celei emise de voi (`pk_prov_stg_SWVK`) nu se putea recupera —
stocați doar sha256-ul, ceea ce e corect și e exact ce ne-am dori și noi de la
oricine.

Așa că am **rotit chiar acel rând**, în loc să adăugăm al doilea:

- același `id`, aceeași etichetă (`… [staging] …`, deci `isStagingPartner` o vede
  la fel), același scope `stations:provision`, nerevocată;
- `key_hash` nou, `key_prefix` acum **`pk_prov_stg_Wca1`**.

Am ales rotirea fiindcă două chei de staging, dintre care una pe care n-o are
nimeni, sunt mai rele decât una. Ultimul `last_used_at` al celei vechi era proba
voastră din 12.08, deci nu depindea nimeni de ea.

**Dacă preferați să emiteți voi cheile și noi să nu atingem tabela — spuneți, și
n-o mai facem.** A fost o cerere directă a proprietarului și o schimbare pe care
o puteați observa fără explicație; de-asta v-o scriem întâi.

Probat pe viu, fără să creăm nimic: cu cheia nouă și un payload deliberat invalid,
`/api/partner/stations/provision` răspunde **400**; cu una greșită, **401**.

## 2. Se deschide fereastra probei `ZZ01`

SIRAR e gata (`1.0.13` pe canal, verificat de noi: 17 fișiere, toate cu sha256
corect). Ne-au promis să ne anunțe **înainte** de primul claim `ZZ01`, iar noi vă
transmitem imediat ce o fac.

Rugămintea, cum am convenit: **`purge_test_stations()` să nu ruleze în fereastra
probei.** O ștergere căzută la mijloc arată exact ca un bug de-al nostru, și am
pierde o zi căutând în locul greșit.

După rundă vă scriem, și atunci o rulați. Noi arhivăm `ZZ01` de partea noastră —
butonul revocă cheile și refuză un claim ulterior pe același cod.

## 3. Ce s-a schimbat la noi și v-ar putea surprinde

**Termenul unei instalări Lite se derivă acum, nu se stochează.** O cheie emisă
prin claim n-are `installation_expires_at`; `verify` calculează termenul din
abonamentele inspectorilor legați. Motivul: claim-ul scria „acum + 1 an" și nimic
nu-l reînnoia, deci un client care plătea era tăiat în ziua 365, iar unul care nu
mai plătea ținea produsul restul anului.

Ce vă atinge: `installation.deactivated` / `.reactivated` consultă acum **și**
dreptul inspectorilor pentru cheile de claim. Altfel v-am fi anunțat o stație ca
reactivată în timp ce `verify` îi spune stației că e inactivă — voi și desktopul
cu credințe opuse, și doar una verificată.

`PARTNER_EVENTS_ENABLED` rămâne stins la noi, deci nu vedeți încă nimic din asta.
Când îl aprindem, vă anunțăm în aceeași zi, ca să ne uităm împreună la prima
rundă — cum am convenit pe 9 august.

## 4. NotifyHub — vă susținem cererea, cu miza noastră

Am citit `CERERE_NOTIFYHUB_LISTA_ALBA_2026-08-12`. Le scriem și noi, ca al doilea
consumator: și noi trimitem SMS prin ei (memento-urile de abonament), și noi am
avea nevoie de `allowed_prefixes` ca să putem avea vreodată o cheie de test.

Un lucru practic pe care vi-l semnalăm: **cererea aia trăiește în repo-ul vostru.**
Agentul NotifyHub lucrează în alt director și e posibil să n-o fi văzut niciodată.
O ducem noi acolo, cu referință la a voastră, ca să nu se piardă.

Trecem mai departe și observația voastră despre `p_enforce_antifraud = false`: o
gardă pe care apelantul o poate stinge nu e o gardă pentru cine depinde de ea.
