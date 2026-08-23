# NOTĂ către Academy, NotifyHub și SIRAR — politica anti-oboseală a notificărilor

**De la:** uitdeITP · **Data:** 2026-08-23 · **Caracter:** informativ, nimic blocant

## Ce am decis și implementat

Ca să nu stresăm șoferii cu mesaje (efectul invers: opt-out, reclamații, reputația tuturor), uitdeITP aplică de acum, structural în cod:

1. **Aceeași mașină + același expeditor = max 1 SMS pe zi.** Dublurile (cron re-rulat, buton apăsat repetat) sunt refuzate idempotent.
2. **Mașinile diferite ale aceluiași client se notifică toate** — inclusiv în aceeași zi. Informația nu e spam; un client cu 3 mașini scadente primește 3 mesaje, fiecare cu șablonul stației lui.
3. **Plasă anti-defect: max 10 SMS/zi per număr de telefon**, pe toate căile ne-tranzacționale, în punctul unic de ieșire spre NotifyHub. Nu e politică de produs — prinde doar buclele, bug-urile și abuzul manual. Log-only până la ENFORCE_RATE_LIMIT, apoi enforce.
4. **Max 3 intervale de notificare** per reminder (promisiunea publică „maxim 3 remindere pe vehicul" e acum și validare de API).
5. **Excepții tranzacționale** (nelimitate de plasă): OTP, confirmarea de programare, testul de admin — mesaje pe care clientul le-a cerut chiar atunci.
6. Fiecare SMS poartă link de dezabonare (obligatoriu și în șabloanele custom, la salvare); emailul are acum link real de dezabonare (cel vechi era 404) și fair-use 10/lună/adresă.

## Ce veți observa

- **NotifyHub:** mesaje refuzate local la noi cu `RECIPIENT_DAILY_CAP` nu vă mai ating deloc (refuzul e înainte de rețea). `message_type` e acum setat consistent: `otp`, `reminder`, `booking_confirmation`, `test` — util pentru raportarea voastră pe tipuri. Opțional, dacă vreți apărare în adâncime, puteți oglindi un cap similar per destinatar pe cheia de platformă — nu depindem de asta.
- **Academy:** argument de vânzare pentru stații: „zero spam garantat structural, nu prin bune intenții". De reflectat în materiale când ajungeți la capitolul notificări.
- **SIRAR:** neafectat funcțional. Ingestul creează remindere ca până acum; politica acționează doar la trimitere.

## Ce NU facem

- Nu combinăm mai multe mașini într-un singur SMS (integritatea șablonului stației).
- Nu eșalonăm/amânăm mesaje pentru mașini diferite — clientul are dreptul să afle la timp pentru fiecare.

Detalii tehnice: `docs/runbooks/anti-oboseala-notificari.md` în repo-ul uitdeitp.
