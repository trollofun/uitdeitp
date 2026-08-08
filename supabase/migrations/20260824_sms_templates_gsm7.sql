-- Șabloanele SMS fără diacritice: fiecare mesaj costa dublu.
--
-- Un singur caracter din afara alfabetului GSM 03.38 ("ă" din "expiră") mută tot
-- mesajul pe codarea UCS-2, unde o parte are 70 de caractere în loc de 160. Toate
-- cele patru șabloane aveau 92-121 de caractere: sub GSM-7 încap lejer într-o
-- singură parte, sub UCS-2 se taxau ca două.
--
-- Măsurat 2026-08-09, cu substituțiile reale:
--   5d      112 car · UCS-2 · 2 parti  ->  112 car · GSM-7 · 1 parte
--   3d       98 car · UCS-2 · 2 parti  ->   98 car · GSM-7 · 1 parte
--   1d       92 car · UCS-2 · 2 parti  ->   92 car · GSM-7 · 1 parte
--   review  121 car · UCS-2 · 2 parti  ->  121 car · GSM-7 · 1 parte
--
-- Textul e identic ca înțeles; se schimbă doar codarea. Migrarea 007 introdusese
-- diacriticele ca îmbunătățire de prezentare, fără să știe ce costă.
--
-- Se actualizează doar rândurile care încă au textul din 007 — o stație care
-- și-a rescris singură șablonul nu e călcată peste. Editorul din dashboard îi
-- arată de acum costul în timp ce scrie.

UPDATE kiosk_stations
SET sms_template_5d = 'Salut! ITP pentru {plate} expira {date}. Evita amenda! Programare rapida: 0729440127. uitdeITP - uitdeitp.ro'
WHERE sms_template_5d = 'Salut! ITP pentru {plate} expiră {date}. Evită amenda! Programare rapidă: 0729440127. uitdeITP - uitdeitp.ro';

UPDATE kiosk_stations
SET sms_template_3d = '{name}, mai sunt {days_until} zile pana expira ITP pentru {plate}. Te asteptam! 0729440127 - uitdeitp.ro'
WHERE sms_template_3d = '{name}, mai sunt {days_until} zile până expiră ITP pentru {plate}. Te așteptăm! 0729440127 - uitdeitp.ro';

UPDATE kiosk_stations
SET sms_template_1d = 'ITP {plate} expira {date}! Te ajutam sa rezolvi azi. Suna acum: 0729440127 - uitdeitp.ro'
WHERE sms_template_1d = 'ITP {plate} expiră {date}! Te ajutăm să rezolvi azi. Sună acum: 0729440127 - uitdeitp.ro';

UPDATE kiosk_stations
SET sms_template_review = 'Multumim ca ai ales {station_name}! Daca esti multumit, lasa-ne o recenzie: {review_link}'
WHERE sms_template_review = 'Mulțumim că ai ales {station_name}! Dacă ești mulțumit, lasă-ne o recenzie: {review_link}';

-- Default-urile pentru stațiile viitoare, ca să nu reintre diacriticele pe ușa din dos.
ALTER TABLE kiosk_stations
  ALTER COLUMN sms_template_5d SET DEFAULT 'Salut! ITP pentru {plate} expira {date}. Evita amenda! Programare: {station_phone}. uitdeITP - uitdeitp.ro',
  ALTER COLUMN sms_template_3d SET DEFAULT '{name}, mai sunt {days_until} zile pana expira ITP pentru {plate}. Te asteptam! {station_phone} - uitdeitp.ro',
  ALTER COLUMN sms_template_1d SET DEFAULT 'ITP {plate} expira {date}! Te ajutam sa rezolvi azi. Suna: {station_phone} - uitdeITP - uitdeitp.ro';
