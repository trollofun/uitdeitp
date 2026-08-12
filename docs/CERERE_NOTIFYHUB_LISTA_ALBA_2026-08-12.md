# Cerere: `allowed_prefixes` să poată fi setat prin API

**uitdeITP → NotifyHub · 12.08.2026 · un câmp, plus un bug de acceptare tăcută**

Scurt: mecanismul de listă albă pe care îl aveți e exact ce ne trebuie, e
enforce-uit corect în bază, dar **nu există nicio cale de a-l seta prin API**.
Iar încercarea de a-l seta nu eșuează — reușește aparent.

---

## 1. Ce am probat, și cum

Contextul: Academy ridică un mediu de staging pentru testarea ecosistemului.
Staging-ul lor folosește baza lor de producție, deci vede numere reale de
clienți. Ne-au cerut una din două — o cheie care nu livrează, sau o listă albă de
numere pe cheia de staging.

Am încercat varianta a doua, cu cheia noastră de admin:

```
POST https://ntf.uitdeitp.ro/api/admin/keys
{ "label": "...", "owner_ref": "PROBE-STG", "billing_mode": "postpaid",
  "allowed_prefixes": ["+40700000000"] }

→ 201 Created
```

Răspunsul e `201` și conține `id`, `key`, `key_prefix`, `label`, `owner_ref`,
`billing_mode`, `rate_limit`. Nu conține `allowed_prefixes`, ceea ce e primul
indiciu.

Rândul rezultat în baza voastră:

```sql
select label, allowed_prefixes from api_keys where owner_ref = 'PROBE-STG';
-- allowed_prefixes = {+40}
```

Adică **implicitul**, nu ce am trimis. Cheia a fost revocată imediat după probă
(`revoked_at`, `is_active = false`, cu motiv scris în `suspended_reason`).

## 2. De ce ne îngrijorează mai mult decât lipsa câmpului

Un câmp neimplementat care întoarce `400 unknown_field` e o zi de muncă în plus.
Un câmp acceptat și ignorat e o vulnerabilitate de proces: apelantul pleacă
convins că restricția s-a aplicat, o notează în documentul de handoff, și abia
un SMS ajuns unde nu trebuia arată că nu era așa.

Noi am prins-o doar fiindcă avem acces la baza voastră și am verificat rândul, nu
răspunsul. Un partener fără acces n-ar fi avut cum.

## 3. Partea bună: mecanismul e solid

`authorize_send` respinge cu `blocked_prefix` orice destinatar care nu se
potrivește:

```sql
if v_violation is null and k.allowed_prefixes is not null
   and not exists (select 1 from unnest(k.allowed_prefixes) pfx
                   where p_recipient like pfx || '%') then
  v_violation := 'blocked_prefix';
end if;
```

E în bază, `SECURITY DEFINER`, deci nu se poate ocoli din codul aplicației. Și,
fiindcă e `LIKE prefix || '%'`, un „prefix" egal cu numărul întreg funcționează
ca listă albă exactă — exact ce cerea Academy, fără nicio schemă nouă.

Un singur lucru de confirmat de voi: verificarea e sărită când apelantul trece
`p_enforce_antifraud = false`. Implicitul e `true` — dar calea voastră de
trimitere ce trece?

## 4. Ce cerem

1. **`POST /api/admin/keys` să accepte `allowed_prefixes`** și să-l scrie. Dacă
   preferați să nu-l expuneți, **respingeți-l explicit** — orice, numai să nu
   fie acceptat și ignorat.
2. **O cale de actualizare** pe o cheie existentă (`PATCH /api/admin/keys/:id`
   sau ce vă e comod). Azi nu există nici pentru `allowed_prefixes`, nici pentru
   revocare.
3. **Un endpoint de revocare.** Am căutat `DELETE /api/admin/keys/:id` și
   `POST /api/admin/keys/:id/revoke` — amândouă `404`. Am fost nevoiți să
   revocăm prin `UPDATE` direct în baza voastră, ceea ce n-ar trebui să fie
   singura opțiune. Ne cerem scuze că am scris în baza voastră; alternativa era
   să lăsăm o cheie live nerevocată.
4. Opțional, dar mai bun decât 1: **un mod „nu livrează"** pe cheie — acceptă,
   jurnalizează, răspunde `201`, nu trimite. E ce prefera Academy, fiindcă e o
   proprietate a cheii, nu o configurare pe care cineva poate uita s-o pună.

## 5. Ce am făcut între timp la noi

Stațiile din spațiul de test (cod RAR `ZZ*`) **nu mai primesc deloc cheie
NotifyHub**. Descoperit în aceeași probă: un claim de test crease o cheie live,
activă, cu `allowed_prefixes` implicit `+40` — putea scrie oricărui număr din
România. Cât timp nu o putem îngrădi la emitere, nu o emitem.

Când punctul 1 e gata, revenim: stațiile de test primesc cheie, îngrădită la
numerele de test.

Separat, am adăugat `SMS_ALLOWLIST` la noi, pe mediile care nu sunt producție —
dar aia ne apără doar pe noi. Cheia îngrădită vă apără pe toți partenerii.
