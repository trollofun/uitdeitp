# Răspuns la `CONTRACT_ACADEMY_UITDEITP_PROVISION.md`

**2026-08-08 · de la echipa uitdeITP · răspunde la secțiunea C (cele trei întrebări blocante)**

Aveți tot ce vă trebuie ca să scrieți cod. Cele trei răspunsuri sunt mai jos, fiecare cu
consecința pe care ați cerut-o explicit. La final: două lucruri pe care nu le-ați întrebat
dar care vă schimbă implementarea, și un lucru pe care îl reparăm noi înainte ca
endpoint-ul să existe.

---

## 0. Corecția voastră e acceptată, și argumentul e mai bun decât al nostru

**uitdeITP cheamă NotifyHub. Academy face un singur apel ieșit și nu vede niciodată cheia
NotifyHub.**

Ajunseserăm la aceeași concluzie din motive de contract (`PRD-uitdeitp.md:74`, Council
P0.9 — maparea `station_id → notifyhub_api_key_id` trăiește exclusiv la noi, fiindcă
webhook-ul Gumroad de topup depinde de ea; dacă o creați voi, topup-ul se rupe tăcut).

Argumentul vostru e însă cel decisiv: Academy n-are nicio primitivă de criptare la rest,
deci n-are unde ține un secret recuperabil. Un sistem care nu poate păstra un secret nu
trebuie pus să-l creeze. Nu adăugați criptare pentru asta.

---

## C.1 — Reluarea întoarce **același bundle**. Fereastră 24h.

**Răspunsul scurt: același bundle, 200.** Deci rămâneți la reținerea de 60 de minute pe
care o preferați — noi ținem 24h ca plasă de siguranță sub voi.

**Cum, fiindcă nu e evident:** cheia brută de ingest nu e recuperabilă la noi — ținem doar
`key_hash` (SHA-256), exact ca voi la `station_license_keys`. Deci „același bundle" nu se
obține re-derivând, ci stocând. Bundle-ul intră în Supabase Vault (criptat la rest, spre
deosebire de plaintext-ul vostru cu TTL — vezi C.3, decizia voastră D.5 rămâne validă),
legat de `Idempotency-Key`, cu ștergere la expirare.

**După expirarea ferestrei: `410 Gone`, cod `bundle_expired`.** Nu 409 — nu e conflict, e
„a existat și nu mai e". Distincția contează pentru clasificarea voastră din secțiunea B:
tratați `410` ca **`rejected`** (terminal, nu reluați), fiindcă reluarea nu-l va aduce
înapoi niciodată.

**Recuperarea nu e un telefon la noi.** Aceeași cerere cu `"rotate": true` în corp emite o
cheie nouă pentru aceeași stație și întoarce un bundle nou, 201. Cheia veche rămâne
validă până o revocați explicit — ca să nu rupeți un agent care încă funcționează. E un
act deliberat, exprimabil, nu un accident.

---

## C.2 — Cheia autorizează **o stație**. Emitem una per apel de provisionare.

`station_id` vine **exclusiv** din cheia Bearer, niciodată din payload. Cheia nu poartă
identitate de agent.

**A doua stație de lucru nu împarte credențiale — și nici nu trebuie.** Indexul nostru
`idx_station_api_keys_station` e deliberat **non-unic**: mai multe chei active pe aceeași
stație sunt permise prin design. A doua stație de lucru trimite o cheie de idempotență
distinctă (`station_claim:<academy_station_id>:<claim_id>`, forma pe care ați anticipat-o)
și primește cheia ei, revocabilă independent. Ambele autorizează același tenant.

Deci: **forma voastră simplă, `station_claim:<academy_station_id>`, e corectă pentru cazul
normal**, iar când adăugați mai multe stații de lucru extindeți cheia fără să ne cereți un
endpoint separat de „re-livrează credențialele existente".

Contextul vostru cu `station_license_keys_active_idx` neunic și upgrade-ul `lite → auto`
prin suprapunere se potrivește exact: și la noi suprapunerea e permisă, din același motiv.

---

## C.3 — Da la primul, nu la al doilea. **Decizia voastră D.5 rămâne validă.**

**Secretul HMAC e revocabil — și e per _cheie_, mai fin decât ați cerut.** Fiecare rând
din `station_api_keys` are propriul `hmac_secret_id`. Revocarea cheii (`revoked_at`) omoară
Bearer-ul și HMAC-ul într-un singur act. Verificat live ieri pe stația CT060: cheie
revocată → `403`, imediat, fără repornire.

**O cheie de ingest nu poate scrie datele altei stații.** Tenantul se rezolvă exclusiv din
cheie (`authenticateBearer` în `src/lib/integrations/station-keys.ts`). Câmpul
`statie_ref.rar_code` din payload e **doar sanity check**: la nepotrivire răspundem `422`,
nu acceptăm. Verificat pe toată matricea Contract A împotriva producției: `201` creare,
`200` replay, `202` fără destinatar, `422` dată în trecut, `403` cheie revocată, `401`
cheie inexistentă.

Deci nu vă trebuie criptare la rest pentru v1. Plaintext cu TTL scurt plus
`CHECK (credential_bundle IS NULL OR status = 'ready')` e proporțional cu expunerea reală
(0–1 rânduri în starea normală).

---

## Contractul, în forma finală

### Cererea

```
POST https://uitdeitp.ro/api/partner/stations/provision
Authorization: Bearer <cheie M2M Academy→uitdeITP>
Idempotency-Key: station_claim:<academy_station_id>
Content-Type: application/json
```

```json
{
  "academy_station_id": "0cf48f17-1431-4d87-b3a0-1178303a7f02",
  "rar_code": "CT060",
  "name": "Service Popescu",
  "tier": "lite",
  "inspector_email": "ion@exemplu.ro",
  "rotate": false
}
```

`rotate` e opțional, implicit `false`.

### Răspunsul (201 la creare, 200 la reluare)

```json
{
  "success": true,
  "data": {
    "station": {
      "id": "c0000000-0000-0000-0000-000000000001",
      "rar_code": "CT060",
      "name": "Euro Auto Service ITP",
      "created": true
    },
    "ingest": {
      "key": "sk_ing_...",
      "hmac_secret": "...",
      "key_id": "be4a4330-...",
      "endpoint": "https://uitdeitp.ro/api/integrations/reminders"
    },
    "dashboard_url": "https://www.uitdeitp.ro/stations/dashboard",
    "bundle_expires_at": "2026-08-09T11:00:00Z"
  }
}
```

`station.created` distinge crearea de join (vezi D.8 la voi — numele existent câștigă
întotdeauna, deci la join întoarcem numele nostru, nu pe al vostru). `bundle_expires_at`
vă spune exact cât mai puteți relua.

Antetul `Cache-Control: no-store` pe fiecare răspuns care conține bundle-ul.

### Codurile, mapate pe clasificarea voastră din secțiunea B

| Cod | Când | Verdictul vostru |
|---|---|---|
| `201` | stație creată, bundle nou | `provisioned` |
| `200` | reluare în fereastră, **același bundle** | `provisioned` |
| `400` | corp invalid | `rejected` |
| `403` | `inspector_email` neconfirmat (vezi mai jos) | `rejected` |
| `409` | `Idempotency-Key` reluată cu **alt** `rar_code` | `rejected` |
| `410` | bundle expirat — reluați cu `rotate: true` | `rejected` |
| `422` | `rar_code` invalid ca format | `rejected` |
| `429` | rate limit pe cheia M2M | `inconclusive` |
| `503` | flag oprit la noi | `inconclusive` |
| `401` / `5xx` / timeout | — | `inconclusive` |

**`409` la nepotrivire cheie/RAR: acceptat**, exact cum ați cerut. O coliziune de chei
devine eroare zgomotoasă, nu o stație tăcut greșită.

Confirmăm și clasificarea voastră a lui `401` ca `inconclusive`. Aveți dreptate și pe
motivul dat: o cheie M2M prost rotită la noi n-are voie să-i spună inspectorului că are
codul RAR invalid. Aceeași regulă o aplicăm și noi la 402 de la NotifyHub.

---

## Două lucruri pe care nu le-ați întrebat

### 1. `tier` nu face nimic la noi în v1

Îl stocăm pe stație pentru trasabilitate, dar nu schimbă nimic în comportamentul de
ingest: și `lite`, și `auto` trimit pe același endpoint, cu același contract. Diferența
`sirar_automation` rămâne integral la voi. Nu construiți nimic în plus pentru asta.

### 2. Apartenența pe care o creăm

La provisionare adăugăm `inspector_email` ca **`patron`** în tabela noastră
`station_members` — aceeași formă ca la voi (`role IN ('inspector','patron')`, `status`,
`unique(station_id, user_id)`), aleasă deliberat ca legarea prin `rar_code` să fie
ulterior un import, nu o rescriere.

Consecința pentru inspector, care e chiar scopul: după claim se autentifică pe uitdeITP cu
același Google și **aterizează direct în dashboard-ul stației**, nu pe ecranul de șofer.
Aterizarea pe rol e deja live la noi de ieri.

---

## Un lucru pe care îl reparăm noi înainte ca endpoint-ul să existe

Regula pe care o numiți nenegociabilă — *rolul se atașează doar pe email verificat* — **nu
e respectată azi de partea noastră.**

Funcția `find_user_id_by_email`, scrisă ieri pentru asignarea proprietarului din panoul de
admin, caută în `auth.users` fără să verifice `email_confirmed_at`. Deci exact vectorul pe
care l-ați descris — cineva își face cont pe uitdeITP cu emailul inspectorului și îi preia
stația — există acum în producție, pe altă cale decât endpoint-ul vostru.

Îl reparăm în aceeași migrare care creează `partner_api_keys`, înainte ca endpoint-ul de
provisionare să fie scris. Vi-l spunem fiindcă e o gaură în invariantul pe care contractul
nostru comun se sprijină, și fiindcă v-ați bazat pe el în F-ONB.1b. Când endpoint-ul va
exista, un `inspector_email` neconfirmat va primi `403`, nu o stație.

---

## De la voi ne trebuie doar atât

1. **Confirmarea că `410 + rotate` vă convine** ca mecanism de recuperare — dacă preferați
   un endpoint separat `/rotate`, spuneți acum, e același efort la noi.
2. **Un canal pentru cheia M2M.** O generăm noi și v-o dăm o singură dată; spuneți-ne cum
   preferați să o primiți.

Nimic altceva. Endpoint-ul din `A` îl construim pe forma de mai sus și vă anunțăm când e
pe staging, sub flag.
