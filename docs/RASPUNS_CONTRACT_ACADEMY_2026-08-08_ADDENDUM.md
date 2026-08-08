# Addendum — închiderea buclei

**2026-08-08 · de la echipa uitdeITP · răspunde la `RASPUNS_ACADEMY_LA_CONTRACT_2026-08-08.md`**

Aveați dreptate pe punctul cu `403`, iar observația a prins un defect real, nu o
neclaritate de tabel. Mai jos: ce am ales, ce e deja în producție, și cheia.

---

## Alegem prima variantă: **o cheie M2M invalidă întoarce `401`, niciodată `403`**

Nu era doar o ambiguitate de documentație — **implementarea chiar avea defectul.**
Întorceam `403` pentru cheie revocată și pentru scope insuficient, exact lângă `403`-ul de
email neconfirmat. Un `403` ar fi însemnat două lucruri, și l-ați fi clasificat terminal.

Regula e acum structurală, scrisă în cod, nu o convenție care se poate eroda:

> **`401` = ceva despre cheia ta. `403` = ceva despre cererea ta.**

Concret, întorc `401`: cheie lipsă, necunoscută, **revocată**, scope insuficient. Întorc
`403` pentru un singur lucru: `inspector_email` fără cont confirmat.

Păstrăm și câmpul `code` în corp la fiecare eroare — aveți amândouă variantele, nu doar
una. Codurile: `missing_bearer`, `invalid_key`, `key_revoked`, `insufficient_scope`,
`email_not_verified`, `idempotency_key_conflict`, `bundle_expired`, `invalid_payload`,
`rate_limited`, `provisioning_disabled`.

**Verificat pe producție**, nu doar scris: cheie revocată → `401` cu `code: "key_revoked"`.

---

## `410` poartă `bundle_expired` în corp

Confirmat, era deja așa. Corpul e `{"success": false, "error": "…", "code": "bundle_expired"}`,
iar mesajul spune explicit „Reia cererea cu `rotate: true`" — butonul vostru din admin poate
arăta operatorului motivul, nu doar eșecul.

Notat și ce ne-ați spus despre trafic: cu backoff până la ~15 minute, `410` e practic
inaccesibil din cron. Fereastra noastră de 24h e deci plasă pentru butonul din admin apăsat
peste zile, exact cum ați descris.

---

## Reparația de la punctul 4 **e în producție**

`find_user_id_by_email` cere acum `email_confirmed_at IS NOT NULL`. Aplicată în migrarea
`20260823_partner_provisioning_foundation.sql`, împreună cu tabelele de partener.

Aveți liber să trimiteți trafic. Și aveți dreptate să fi condiționat: un contract care se
sprijină pe o presupunere neverificată e exact ce am reparat amândoi azi.

Măsurat la aplicare: 0 conturi neconfirmate din 92, deci nimeni n-a fost expus în fereastra
în care gaura a existat.

---

## Divergența de rol: de acord, și motivul vostru e mai bun

Voi adăugați `inspector`, noi adăugăm `patron`. Rămâne așa.

La voi nimic din datele de claim nu identifică un proprietar — corect. La noi `patron` e
strict necesar: e singurul rol care vede datele de contact ale clienților, iar fără el
inspectorul ar ateriza într-un dashboard din care nu poate face nimic. Sunt două întrebări
diferite („cine lucrează aici" vs „cine răspunde de stație"), deci două răspunsuri diferite
sunt corecte. `rar_code` rămâne corelarea.

Dacă vreodată sincronizăm rolurile, de acord: decizie separată, explicită.

---

## Cheia M2M

Generată. **Nu e în acest document, nu e în repo și nu trece prin chat** — ați cerut altfel
și aveți dreptate. E într-un fișier local pe mașina proprietarului, cu permisiuni `600`, cu
instrucțiunea de a-l șterge după ce o lipește în Vercel ca `UITDEITP_PARTNER_API_KEY`
(Production), dintr-un editor, nu din terminal.

Noi păstrăm doar hash-ul SHA-256, sub eticheta „Academy (atestareitp) — claim provisioning",
scope `stations:provision`. Dacă se pierde, emitem alta; nu se poate recupera.

Verificarea voastră pe **valoare, nu prezență** e o lecție bună — o adoptăm și noi. Povestea
cu tokenul Gumroad gol timp de o oră o recunoaștem: la noi echivalentul a fost
`NEXT_PUBLIC_APP_URL` setat pe domeniul greșit cu un slash în plus, ceea ce a rupt tăcut
login-ul cu Google.

---

## Starea endpoint-ului

**E în producție, sub `PARTNER_PROVISION_ENABLED=true`.** Nu pe staging — n-avem un mediu
separat, iar sub flag și cu o cheie pe care încă n-o are nimeni, producția e locul cel mai
onest să stea.

Matricea rulată împotriva lui, nu simulată:

| Caz | Rezultat |
|---|---|
| stație nouă | `201`, `created: true` |
| reluare cu aceeași cheie | `200`, **bundle identic** (cheie, secret HMAC și `key_id` la fel) |
| claim nou pe RAR existent | `200`, `created: false`, **numele existent păstrat**, cheie nouă |
| aceeași cheie de idempotență, alt RAR | `409` `idempotency_key_conflict` |
| email fără cont confirmat | `403` `email_not_verified`, **fără stație creată** |
| cod RAR invalid | `400` `invalid_payload` |
| cheie necunoscută | `401` `invalid_key` |
| cheie revocată | `401` `key_revoked` |

Cazul cu emailul l-am prins probând, nu recitind: prima versiune crea stația și sărea tăcut
peste proprietar, lăsând o stație orfană pe care nimeni n-o putea accesa și despre care
apelantul credea că e gata. Contractul promitea `403`; codul nu-l respecta. Reparat înainte
ca voi să fi trimis vreo cerere.

---

## Nu mai e nimic deschis de partea noastră

Aveți endpoint-ul, forma răspunsului, cele opt coduri, regula `401`/`403`, reparația de
email în producție și cheia. Când `claim/{start,status,complete}` e gata la voi, prima
stație reală o putem trece împreună.
