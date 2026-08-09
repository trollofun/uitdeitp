-- Linkul de programare în șabloanele stației.
--
-- Codul a primit `{booking_link}` în `DEFAULT_SMS_TEMPLATES`, dar stațiile care
-- și-au scris propriul text nu-l primesc de acolo — șablonul lor are prioritate
-- în `reminder-processor.ts`. Deci schimbarea din cod n-ar fi ajuns la nimeni
-- care și-a personalizat mesajul, adică exact la stațiile active.
--
-- E inert cât timp `booking_enabled` e oprit: randarea șterge placeholder-ul
-- împreună cu eticheta din fața lui, deci mesajul rămâne exact cum era. Când
-- stația pornește programările, linkul apare singur, fără altă intervenție.
--
-- Măsurat înainte de aplicare, pe șablonul real al CT060:
--   fără link  116 caractere · GSM-7 · 1 SMS
--   cu link    158 caractere · GSM-7 · 1 SMS
-- Deci adăugarea nu împinge mesajul în a doua parte.

UPDATE kiosk_stations
SET sms_template_5d = sms_template_5d || '. Online: {booking_link}'
WHERE sms_template_5d IS NOT NULL AND sms_template_5d NOT LIKE '%booking_link%';

UPDATE kiosk_stations
SET sms_template_3d = sms_template_3d || '. Online: {booking_link}'
WHERE sms_template_3d IS NOT NULL AND sms_template_3d NOT LIKE '%booking_link%';

UPDATE kiosk_stations
SET sms_template_1d = sms_template_1d || '. Online: {booking_link}'
WHERE sms_template_1d IS NOT NULL AND sms_template_1d NOT LIKE '%booking_link%';
