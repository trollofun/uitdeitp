# Runbook — Contract A: conectarea unei stații la importul automat

Cum se pune o stație pe `POST /api/integrations/reminders`, de la zero până la
respingerea cererilor nesemnate. Fiecare treaptă are un criteriu măsurabil —
nu se trece mai departe „din senzație".

Referințe: `PRD-uitdeitp.md` §3, `00-arhitectura-ecosistem.md` Contract A.

---

## 0. Precondiții

| Ce | Unde se verifică |
|---|---|
| `INGEST_ENABLED=true` în Vercel | altfel endpointul răspunde `503` pentru toată lumea |
| Stația are `rar_code` completat | Admin → Stații → *stație* → Integrare ecosistem |
| Stația are `is_active = true` | aceeași pagină |

`INGEST_ENABLED` e comutatorul global; `ingest_enabled` per stație e cel care
decide efectiv cine intră. Global pornit + stație oprită = `403`, ceea ce e
poziția normală pentru orice stație care nu e încă în probe.

---

## 1. Emiterea cheii

Admin → Stații → *stație* → Chei de integrare → **Generează cheie**.

Se afișează **o singură dată**, și nu mai pot fi recuperate niciodată:

- `sk_ing_…` — cheia Bearer. În DB stă doar `sha256(cheie)`.
- secretul HMAC — separat de Bearer, stocat în Supabase Vault.

Amândouă se trimit persoanei care configurează agentul SIRAR pe un canal pe care
l-ai folosi și pentru o parolă. Dacă una se pierde, nu se „recuperează": se
revocă și se emite alta (§4).

Apoi bifează **Permite importul automat** pe stație și lasă **Verificare
semnătură** pe `Doar înregistrare`.

---

## 2. Prima cerere reală

Agentul trimite:

```
POST /api/integrations/reminders
Authorization: Bearer sk_ing_…
X-SIRAR-Signature: sha256=<hmac>
X-SIRAR-Idempotency-Key: <id eveniment, unic per inspecție>
Content-Type: application/json
```

Fără cheia de idempotență → `422`. E obligatorie pe ambele variante de payload
și e singurul lucru care oprește duplicarea la retry.

Ce înseamnă răspunsurile:

| Cod | Ce s-a întâmplat | Sursa trebuie să |
|---|---|---|
| `201` | reminder creat | marcheze `sent` |
| `200` | replay al aceleiași chei de idempotență | marcheze `sent` (nu e eroare) |
| `202` | payload fără `destinatar` — acceptat, fără reminder | marcheze `sent`, **fără retry** |
| `401` | cheie lipsă/necunoscută | oprească și alerteze |
| `403` | cheie revocată, stație inactivă sau ingest neactivat | oprească și alerteze |
| `422` | payload invalid | **nu** retrimită — se repară la sursă |
| `429` | peste 120 cereri/oră pe cheie | retrimită după `Retry-After` |

Verificare fără agent, cu payload-uri gata făcute pentru toată matricea:

```bash
INGEST_KEY=sk_ing_… HMAC_SECRET=… BASE_URL=https://uitdeitp.ro ./scripts/fake-sirar.sh
```

---

## 3. Trecerea semnăturii de la „înregistrare" la „respingere"

Contract A nu fixează șirul canonic peste care se calculează HMAC, așa că ruta
acceptă ambele forme uzuale (`HMAC(body)` și `HMAC(timestamp.body)`) și
înregistrează care s-a potrivit. Fereastra log-only există ca să afli ce trimite
SIRAR de fapt, **înainte** să respingi ceva.

Criteriu de trecere — se rulează după minimum 7 zile de trafic real al stației:

```sql
SELECT count(*)                                        AS cereri,
       count(*) FILTER (WHERE signature_present)       AS cu_semnatura,
       count(*) FILTER (WHERE signature_valid)         AS semnate_corect,
       array_agg(DISTINCT signature_form)              AS forme,
       min(created_at)                                 AS prima,
       max(created_at)                                 AS ultima
  FROM integration_request_log
 WHERE station_id = '<station_id>'
   AND created_at > now() - interval '7 days';
```

Treci pe `enforce` **doar dacă**:

- `semnate_corect = cereri` (zero eșecuri, nu „aproape zero"),
- `cereri >= 20` (altfel n-ai măsurat nimic),
- `forme` conține o singură valoare non-NULL — două forme înseamnă două versiuni
  de agent în teren, iar una dintre ele se va rupe la comutare.

Comutarea: Admin → stație → Verificare semnătură → `Respinge cererile nesemnate corect`.
Se face **per stație**, nu global, și niciodată în aceeași zi cu alt deploy.

Rollback: aceeași listă înapoi pe `Doar înregistrare`. Efect imediat, fără
deploy — se citește la fiecare cerere.

---

## 4. Rotația cheii — 3 pași, fără întrerupere

Nu revoca înainte să emiți. Ordinea contează.

1. **Emite** o cheie nouă pe aceeași stație (§1). Ambele sunt acum valide —
   `station_api_keys` acceptă mai multe rânduri active per stație.
2. **Configurează** agentul cu perechea nouă și așteaptă până vezi trafic pe ea:

   ```sql
   SELECT key_prefix, label, last_used_at, revoked_at
     FROM station_api_keys
    WHERE station_id = '<station_id>'
    ORDER BY created_at DESC;
   ```

   Cheia nouă trebuie să aibă `last_used_at` recent, iar cea veche să fi încetat
   să avanseze.
3. **Revocă** cheia veche din interfață. Din acel moment primește `403`.

Dacă pasul 2 nu se confirmă în 24h, agentul n-a fost reconfigurat — nu revoca,
sau oprești importul stației.

**Compromitere confirmată:** se revocă imediat (pasul 3 primul), se acceptă
întreruperea, apoi §1 de la capăt. Un import oprit o oră e reparabil; o cheie
scursă care scrie remindere în contul stației, nu.

---

## 5. Când ceva nu merge

Toate cererile, inclusiv cele respinse, lasă urmă — fără payload brut (GDPR):

```sql
SELECT created_at, status_code, error_code, payload_variant,
       signature_present, signature_valid, signature_form, rar_code_match
  FROM integration_request_log
 WHERE station_id = '<station_id>'
 ORDER BY created_at DESC
 LIMIT 50;
```

| Simptom | Cauza obișnuită |
|---|---|
| `403` constant, cheie corectă | `ingest_enabled` oprit pe stație, sau stația inactivă |
| `422` pe toate cererile | `expirare` în trecut, sau număr de înmatriculare respins de validare |
| `202` în loc de `201` | payload fără bloc `destinatar` — clientul n-a dat consimțământ |
| `signature_valid = false` după rotație | agentul semnează cu secretul vechi |
| reminder creat, dar fără SMS | vezi cron-ul: `notification_log` + `next_notification_date` pe reminder |
