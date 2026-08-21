# Academy: partea noastră e implementată

**2026-08-08 · răspuns la addendum · nimic nu mai e deschis nici la noi**

Regula `401` / `403` e implementată exact cum ați formulat-o. Faptul că observația a prins un
defect real, nu o neclaritate de tabel, e cel mai bun argument pentru schimbul ăsta de
documente — niciunul dintre noi nu l-ar fi găsit citindu-și propriul cod.

Clientul nostru clasifică: `401`, `429` și `5xx` → `inconclusive` (reluăm); restul de `4xx`
→ `rejected` (terminal). Folosim `code`-ul din corp acolo unde există, dar nu depindem de el
— aveți dreptate că e mai bine să avem ambele mecanisme.

---

## Ce e livrat

Sub `INSTALLATION_CLAIM_ENABLED` **oprit**: proprietarul vrea SIRAR Lite testat cap-coadă
înainte ca cineva să poată ajunge la flux. Endpoint-urile întorc `404`, pagina la fel,
butonul din dashboard nu e montat deloc.

| Ce | Unde |
|---|---|
| `POST /api/installations/claim/token` | emite tokenul de bootstrap, pe sesiune autentificată, gated pe `plan_type` |
| `POST /api/installations/claim/start` | agentul cere codul; **aceeași formă de răspuns ca `link/start`** |
| `GET /api/installations/claim/status` | poll; întoarce bundle-ul cât timp claim-ul e `ready` |
| `POST /api/installations/claim/complete` | confirmarea scrierii pe disc; abia asta șterge secretul |
| `POST /api/installations/claim/confirm` | ecranul inspectorului |
| `GET /api/cron/reconcile-station-claims` | la 5 minute: reia provisionarea, reapează bundle-urile neridicate |
| `POST /api/admin/station-claims/{id}/retry?rotate=true` | recuperarea după `410` |

`claim/start` întoarce `user_code`, `user_code_display`, `verification_uri_complete`,
`expires_in`, `interval` — identic cu `link/start`, ca partea PWA să reutilizeze randarea de
QR neschimbată. Diferă doar autentificarea și `?claim=` în loc de `?code=`.

## Trei lucruri care vă privesc direct

**1. Agentul: scrie, `fsync`, abia apoi `complete`.** Livrarea e confirmată, nu bazată pe
citire — `status` întoarce bundle-ul la fiecare poll cât timp claim-ul e `ready`, și doar
`complete` îl șterge. Dacă apelul de `complete` se pierde, fișierul e deja pe disc și un
re-poll care răspunde `delivered` e răspunsul corect, nu o eroare.

**2. Cheia de idempotență e `station_claim:<academy_station_id>`.** Rândul nostru `stations`
se creează și se comite înainte de apel, deci orice reluare — cron, buton de admin, sau un
claim nou peste zile — derivă aceeași cheie. Confirmarea voastră că reluarea întoarce bundle
identic e ce face recuperarea după timeout posibilă; fără ea, un eșec de commit local la noi
ar fi fost nerecuperabil.

**3. `rotate: true` pleacă dintr-un singur loc:** butonul din admin. Cronul renunță după ~15
minute, deci nu poate ajunge niciodată la `410`. Exact cum ați notat.

## Ce am verificat, nu doar scris

RPC-urile rulate pe producție în tranzacții derulate înapoi: cod RAR nou → creează stația;
un străin care revendică o stație cu membri → refuzat, și primește înapoi **numele existent**,
nu redenumirea încercată; proprietarul care revendică propria stație → join; iar baza refuză
un secret pe un claim `delivered` — `CHECK (credential_bundle IS NULL OR status = 'ready')`.

## Ce urmează

Proprietarul testează SIRAR Lite. Când e mulțumit, pornim flag-ul și lipește cheia M2M în
Vercel — verificată pe **valoare, nu prezență**, cum am convenit.

Prima stație reală o trecem împreună. Spuneți-ne când sunteți gata și facem `CT0xx`, care e
deja canary-ul nostru pentru Contract B.
