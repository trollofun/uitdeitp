# Cerere: un mediu de staging pentru fluxurile dintre proiecte

**De la Academy · 12.08.2026 · nu testăm plăți, testăm autentificarea și legăturile**

Proprietarul vrea să poată parcurge fluxurile ecosistemului fără să atingă clienți
reali: autentificarea între proiecte, claim-ul unei stații, verify-ul de licență,
legarea inspectorilor. Gumroad **nu** intră în discuție — plățile nu se testează.

Partea noastră e ridicată: proiect Vercel separat, branch `staging`, domeniu
`flex.atestareitp.com`. Mai jos e exact ce ne trebuie de la voi și, mai important,
**unde ipoteza „schimbăm un URL și merge" nu ține.**

---

## 0. Ce trebuie să știți despre staging-ul nostru înainte de orice

**Folosește aceeași bază de date ca producția Academy.** E o decizie de cost,
luată conștient: organizația noastră Supabase e pe plan free, iar un al doilea
proiect ar fi însemnat fie limita de proiecte active, fie 25$/lună.

Consecința care vă privește direct: **un claim făcut din staging creează o stație
reală și o cheie reală în producția Academy.** Nu e o stație fantomă. O putem
arhiva după (buton nou în panoul nostru, care revocă cheile și refuză un claim
ulterior pe același cod RAR), dar rândul există între timp.

De aici vine tot ce cerem mai jos: dacă la voi e la fel, atunci „staging" e doar
un nume, iar atunci prefer să știm asta acum și să ne înțelegem pe curățenie, nu
pe izolare.

---

## 1. uitdeitp — o cheie în plus, nu doar un URL

### 1.1. Ce ar fi de ajuns dacă ar fi doar un URL

La noi adresa partenerului e o singură variabilă, `UITDEITP_PARTNER_URL`, citită
în `provision-client.ts` și în cronul de livrare a evenimentelor. O schimbăm
într-o linie. Deci **partea noastră chiar e un URL.**

### 1.2. De ce nu e de ajuns la voi

Am citit `src/lib/partner/keys.ts`: cheile sunt rânduri în `partner_api_keys`, cu
scope-uri. Asta înseamnă că **o cheie de staging e un rând în baza voastră, nu o
modificare de cod** — vestea bună — dar înseamnă și că, fără ea, staging-ul
nostru ar folosi cheia de producție.

Iar o cheie de producție într-un mediu unde se experimentează e exact ce n-ar
trebui să existe. Un bug de-al nostru în staging ar provisiona stații reale la
voi, cu cheia care are voie s-o facă.

**Cerem: un rând nou în `partner_api_keys`, marcat ca staging**, cu
`stations:provision` acum și `stations:lifecycle` când aprindem evenimentele. Ne
trimiteți cheia; o punem doar în proiectul de staging.

### 1.3. Întrebarea care decide restul

**Deployment-ul vostru de staging folosește aceeași bază ca producția?**

- **Dacă da**, un URL separat nu cumpără nimic: stațiile create de noi tot ar fi
  reale la voi. Atunci preferăm să ne lăsați pe producție și să convenim pe
  coduri RAR de test, pe care vi le anunțăm înainte și le ștergeți după. E mai
  cinstit decât un staging care doar pare izolat.
- **Dacă nu**, dați-ne URL-ul și îl punem în `UITDEITP_PARTNER_URL`.

Orice răspuns e bun. Cel care ne-ar strica e să presupunem izolare și să nu fie.

---

## 2. NotifyHub — problema nu e URL-ul, sunt numerele reale

Aici e riscul concret, și vine tot din baza noastră comună: **staging-ul nostru
vede numerele de telefon reale ale clienților.** Un test care declanșează o
notificare ar trimite un SMS real unui om real, de pe un mediu unde tocmai
experimentăm.

Cronurile sunt oprite în staging (nu-i punem `CRON_SECRET`, iar
`isAuthorizedCron` refuză fără secret), deci trimiterile programate nu pleacă. Dar
căile directe rămân.

**Cerem una din două, ce vă e mai ușor:**

1. o **cheie de test care nu livrează** — acceptă, răspunde `201`, jurnalizează,
   nu trimite; sau
2. o **listă albă de numere** pe cheia de staging, cu numerele noastre de test.

Prima e de preferat: e o proprietate a cheii, nu o configurare pe care cineva
poate uita s-o pună.

Dacă niciuna nu e ieftină, spuneți-ne și lăsăm `NOTIFYHUB_API_KEY` nesetată în
staging — la noi o variabilă goală înseamnă „neconfigurat", deci nu se trimite
nimic. Pierdem testarea fluxului de notificare, dar nu trimitem SMS-uri
accidentale. **Aceasta e varianta implicită dacă nu răspundeți.**

---

## 3. Ce NU vă cerem

- **nimic legat de Gumroad** — plățile nu se testează, iar staging-ul nostru nu
  primește nicio variabilă `GUMROAD_*`; fără tokenul din URL, webhook-ul nostru
  respinge orice;
- **nicio schimbare de contract** — formele de cerere și răspuns rămân exact cele
  din `RASPUNS_ACADEMY_CICLU_DE_VIATA_2026-08-09`;
- **nicio grabă pe `stations:lifecycle`** — evenimentele rămân oprite până trece
  prima stație reală, cum am convenit.

---

## 4. Ce facem noi, ca să știți ce se atinge

1. `flex.atestareitp.com` cu `INSTALLATION_CLAIM_ENABLED=true`, în timp ce
   producția rămâne `false`;
2. **pereche de chei de semnare ES256 proprie pentru staging**, cu `kid` diferit
   — dacă am refolosi-o pe cea de producție, un răspuns semnat de staging ar fi
   valid pentru un SIRAR de producție;
3. fără `CRON_SECRET` și fără `AGENT_RELEASE_PUBLISH_TOKEN` în staging — al
   doilea e important: bucket-ul de release e în aceeași bază, deci o publicare
   de test ar rescrie `ultima.json` pentru toată flota;
4. conturi de test separate, fiindcă protecția noastră anti-partajare invalidează
   toate sesiunile unui utilizator, deci același cont pe ambele domenii s-ar
   deconecta reciproc.

---

## Ce ne ajută înapoi, în ordine

1. Cheia de staging din `partner_api_keys` — un rând.
2. Răspunsul la §1.3: staging-ul vostru are bază separată sau nu.
3. Alegerea de la §2 pentru NotifyHub, sau tăcere, caz în care lăsăm cheia
   nesetată.
