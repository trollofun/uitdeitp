# Domeniul scurt `itp.vin` — ce mai e de făcut

**2026-08-09 · codul e gata și desfășurat; rămâne DNS-ul și o variabilă.**

Codul funcționează deja **fără** domeniu: `shortUrl()` cade pe `www.uitdeitp.ro`
cât timp `NEXT_PUBLIC_SHORT_URL` nu e setat. Deci nimic nu se rupe între timp și
nu există o fereastră în care linkurile din SMS sunt greșite.

---

## Ce cumpără, onest

**8 caractere per link**, 16 într-un mesaj cu programare și dezabonare.

Nu e o înjumătățire, cum a fost eliminarea diacriticelor. Un mesaj tipic costă
un SMS și cu domeniul lung. Diferența apare **exact la limită**:

| Mesaj | `www.uitdeitp.ro` | `itp.vin` |
|---|---|---|
| tipic (140 car) | 1 SMS | 1 SMS |
| cu nume de stație (166 car) | **2 SMS** | **1 SMS** |

Fereastra utilă e 161–176 de caractere pe domeniul lung. Acolo se pierdeau
banii — nu la mesajul obișnuit, ci la cel care abia depășea pragul.

---

## Pasul 1 — Cloudflare (DNS)

Domeniul e la Cloudflare, aplicația la Vercel. Sunt două variante și una e
greșită:

**Corect: DNS-only, `CNAME` către Vercel.**

```
Tip:    CNAME
Nume:   @            (și încă unul pentru www, dacă vrei)
Țintă:  cname.vercel-dns.com
Proxy:  DNS only  ← nor gri, NU portocaliu
```

**De ce nu proxy (norul portocaliu):** ar pune Cloudflare în fața Vercel, ceea
ce înseamnă două straturi de cache peste rutele `/o` și `/r`. Iar `/r`
contorizează clicurile — exact defectul pe care l-am reparat ieri, când Data
Cache-ul din Next.js oprea contorul la 1. Nu vrem încă un cache pe același drum.

Dacă totuși ajunge pe proxy, `/o` și `/r` au nevoie de o regulă „Bypass Cache".

---

## Pasul 2 — Vercel (domeniu)

Project `uitdeitp` → Settings → Domains → **Add** `itp.vin`.

Vercel va cere confirmarea prin DNS; când Cloudflare e configurat ca mai sus, se
validează singur în câteva minute.

**Nu-l seta ca domeniu principal.** `www.uitdeitp.ro` rămâne canonic; `itp.vin`
e doar poarta pentru linkurile scurte.

---

## Pasul 3 — variabila

```
NEXT_PUBLIC_SHORT_URL = https://itp.vin
```

Production **și** Preview, apoi **redeploy** — variabilele se citesc la build,
deci fără redeploy rămâne pe domeniul vechi. (Lecția de ieri, cu
`NOTIFYHUB_ADMIN_KEY`.)

Fără slash la final. `appUrl()` îl taie oricum, iar `shortUrl()` la fel — dar
un slash în plus a rupt deja o dată login-ul cu Google, deci merită scris.

---

## Ce face codul, ca să nu fie surpriză

Domeniul scurt **nu e o a doua copie a aplicației**. Middleware-ul îl restrânge
la trei căi:

| Pe `itp.vin` | Ce se întâmplă |
|---|---|
| `/o?t=…` | dezabonarea, direct |
| `/r?t=…` | recenzia, direct |
| `/p/<slug>` | rescris intern către `/programare/<slug>` — fără redirect, ca să nu piardă cele 12 caractere câștigate |
| orice altceva | `308` către `www.uitdeitp.ro` |

Motivul pentru ultimul rând: două domenii care servesc aceeași aplicație
înseamnă conținut duplicat pentru motoarele de căutare, cookie-uri de sesiune pe
host greșit, și o a doua suprafață de întreținut la fiecare schimbare.

`/o` și `/r` trec fără `updateSession` — n-au nevoie de autentificare, iar
cookie-urile setate pe host-ul scurt ar fi inutile acolo și derutante la
depanare.

---

## Verificarea, după propagare

```bash
# 1. domeniul răspunde și rutează corect
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://itp.vin/
#    aşteptat: 308 https://www.uitdeitp.ro/

curl -s -o /dev/null -w '%{http_code}\n' https://itp.vin/p/euro-auto-service
#    aşteptat: 200 (sau 404 dacă booking_enabled e încă oprit)

# 2. linkul de dezabonare, cu un token real dintr-un SMS trimis
curl -s -o /dev/null -w '%{http_code}\n' 'https://itp.vin/o?t=<token>'

# 3. cache: `/r` NU are voie să fie servit din cache
curl -s -D - -o /dev/null 'https://itp.vin/r?t=<token>' | grep -i 'cache\|cf-cache'
#    aşteptat: no-store, și fără `cf-cache-status: HIT`
```

Ultima e cea care contează: dacă apare `cf-cache-status: HIT`, proxy-ul
Cloudflare e pornit și contorul de clicuri va raporta din nou 1.

---

## După ce merge

Șabloanele SMS pot include linkul de programare. Nu l-am pus încă în ele
tocmai ca să nu plătim caractere pe domeniul lung; cu `itp.vin` activ, un
`Programare: itp.vin/p/<slug>` costă 28 de caractere și înlocuiește un „sună la
0729…" care oricum nu se poate apăsa pe toate telefoanele.
