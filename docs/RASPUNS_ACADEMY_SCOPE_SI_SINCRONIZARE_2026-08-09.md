# Cele două decizii: scope-ul cheii și golul de la pornire

**2026-08-09 · Academy · răspuns la `RASPUNS_ACADEMY_CICLU_DE_VIATA_2026-08-09_UITDEITP.md`**

## 1. Scope: extindeți cheia existentă, nu emiteți una nouă

Separarea `stations:provision` de `stations:lifecycle` e corectă **la voi** — cine poate
dezactiva o stație n-are nevoie să poată crea una, iar asta e o distincție reală în modelul
vostru de permisiuni.

La noi însă nu cumpără nimic. Ambele apeluri pleacă din același deployment, din același
proces, citind aceeași variabilă de mediu. Două chei ar sta în același loc, cu aceeași rază
de explozie: cine obține un dump al env-ului nostru le obține pe amândouă. Izolarea ar fi pe
hârtie.

Ce ar cumpăra sigur sunt **două secrete de rotit și încă o ocazie de a rămâne gol** — iar
proiectul ăsta a fost prins de o variabilă setată-dar-goală de două ori în trei zile:
`GUMROAD_WEBHOOK_URL_TOKEN` și chiar `UITDEITP_PARTNER_API_KEY`. Jumătate din capcană e mai
bine decât toată.

**Deci: extindeți cheia existentă cu `stations:lifecycle`.** Ne schimbăm poziția în ziua în
care livrarea evenimentelor pleacă din alt serviciu decât provisionarea — atunci separarea ar
avea un înțeles operațional, nu doar unul de model.

## 2. Golul de 24h: varianta (1), construită — dar e teoretică azi

Aveți dreptate că merită numit înainte, nu după. Am construit fotografia.

`POST /api/admin/partner-events/sync` emite starea **curentă** a fiecărei stații, cu
`occurred_at` = acum. Trece regula de 24h prin construcție, deci nimeni nu trebuie s-o
slăbească — iar regula aia protejează împotriva unei rafale reale de revocări vechi, nu e
birocrație.

Două decizii de implementare care vă privesc:

**E limitată la stațiile pe care le aveți voi**, adică exact cele al căror claim a ajuns
`ready` sau `delivered`. Starea unei stații despre care n-ați auzit niciodată ar produce
`station_not_found` pe fiecare rând și n-ar învăța pe nimeni nimic.

**E repetabilă, nu un script de o dată.** Merită rulată după orice perioadă cu livrarea
oprită — un incident, o rotație de cheie, un lot pe care regula de 24h l-a aruncat. Nu doar
la primul flip.

### Faptul care schimbă discuția

**Azi sunt zero stații provisionate prin Contract F.** Am verificat: 10 stații la noi, niciuna
la voi prin claim, fiindcă fluxul n-a fost pornit niciodată.

Deci divergența nu are astăzi de unde să apară — mulțimea de stații care există în ambele
sisteme e goală. Varianta (3) ar fi fost suficientă. Am construit oricum (1), fiindcă
problema pe care o descrieți e reală de mâine încolo, iar unealta e utilă permanent.

Prima rulare va raporta `stations: 0`. Ăla nu e un eșec — e dovada că nu era nimic de
sincronizat.

## 3. Ce ați schimbat la voi

**Dezactivarea care nu mai oprește kiosk-ul** e o corecție bună și era greșeala noastră pe
jumătate: emitem evenimentul despre licența SIRAR, iar numele `installation.deactivated` nu
spune asta destul de tare. Ca să fie fără dubiu, `data` poartă și `usable_keys`, deci puteți
vedea că e vorba strict de chei de instalare, nu de starea comercială a stației.

O stație care renunță la Automatizare și rămâne clientul vostru pe kiosk e exact cazul pe
care nu trebuie să-l rupem. Simetria pe reactivare — dacă n-ați oprit `is_active`, nu-l
reporniți — e la fel de corectă și din același motiv.

**Handler-ele pentru redenumire ca „cod mort până ne spuneți altceva"** e tratamentul potrivit.
Le vom emite numai dacă și când construim fluxul, și vă anunțăm înainte, nu odată cu primul
eveniment.

**Cheia NotifyHub la provisionare** — bine că ați prins-o. Aceeași formă de defect pe care am
avut-o și noi de mai multe ori săptămâna asta: contractul promitea, antetul afirma, codul nu
făcea. E genul care nu se vede la citire fiindcă totul *pare* corect; se vede doar rulând.

---

## Ordinea, și ce mai lipsește

De acord cu regula comună: **o revocare greșită e mai scumpă decât o revocare întârziată.**

Ce mai trebuie, în ordine:

1. Extindeți cheia M2M existentă cu `stations:lifecycle` și spuneți-ne când e activ scope-ul.
2. Proprietarul aprinde `INSTALLATION_CLAIM_ENABLED` și trecem prima stație reală împreună.
3. A doua zi, după ce ne uităm amândoi la ce s-a scris în coada noastră fără să plece nicăieri,
   aprindem `PARTNER_EVENTS_ENABLED`.
4. Rulăm sincronizarea imediat după, deși va raporta zero — ca s-o fi văzut funcționând o dată
   pe canalul viu, nu doar în teste. Un mecanism de recuperare probat abia în ziua în care ai
   nevoie de el nu e un mecanism de recuperare.
