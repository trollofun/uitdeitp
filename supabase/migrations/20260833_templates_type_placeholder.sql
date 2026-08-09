-- `{tip}` în loc de „ITP" hardcodat în șabloanele stațiilor.
--
-- Schema și interfața acceptau itp/rca/rovinieta de la început, iar procesorul
-- punea deja tipul în email. Dar șabloanele SMS ale stației sunt per INTERVAL,
-- nu per tip — deci un client cu RCA primea un mesaj care spunea „ITP".
--
-- Alternativa ar fi fost nouă coloane `sms_template_<tip>_<zi>`. N-o merită: e
-- paritate de piață (ITPalert, SOGA și SmsITP acoperă deja RCA/tahograf), nu
-- diferențiere, iar nouă editoare în interfață ar costa mai mult decât aduc.
--
-- Înlocuirea e țintită pe „ITP pentru {plate}", nu pe „ITP": șablonul conține
-- și „uitdeITP", care n-are ce căuta transformat. Probat cu SELECT înainte de
-- aplicare — `uitdeITP` rămâne intact.
--
-- `{tip}` cade pe „ITP" când lipsește, deci un șablon nemigrat rămâne corect.

UPDATE kiosk_stations
SET sms_template_5d = replace(sms_template_5d, 'ITP pentru {plate}', '{tip} pentru {plate}')
WHERE sms_template_5d LIKE '%ITP pentru {plate}%';

UPDATE kiosk_stations
SET sms_template_3d = replace(sms_template_3d, 'ITP pentru {plate}', '{tip} pentru {plate}')
WHERE sms_template_3d LIKE '%ITP pentru {plate}%';

UPDATE kiosk_stations
SET sms_template_1d = replace(sms_template_1d, 'ITP pentru {plate}', '{tip} pentru {plate}')
WHERE sms_template_1d LIKE '%ITP pentru {plate}%';

ALTER TABLE kiosk_stations
  ALTER COLUMN sms_template_5d SET DEFAULT 'Salut! {tip} pentru {plate} expira {date}. Evita amenda! Programare: {station_phone}. uitdeITP - uitdeitp.ro',
  ALTER COLUMN sms_template_3d SET DEFAULT '{name}, mai sunt {days_until} zile pana expira {tip} pentru {plate}. Te asteptam! {station_phone} - uitdeitp.ro',
  ALTER COLUMN sms_template_1d SET DEFAULT '{tip} {plate} expira {date}! Te ajutam sa rezolvi azi. Suna: {station_phone} - uitdeITP - uitdeitp.ro';

-- ADDENDUM, aceeași zi: `{tip}` a făcut mesajul variabil în lungime.
--
-- „ITP" are 3 caractere, „Rovinieta" are 9. Șablonul stației era la 157 cu ITP
-- — sub limita de 160 — dar 163 cu rovinietă, deci **2 SMS pentru fiecare
-- rovinietă**, tăcut. Prins probând randarea pentru toate cele trei tipuri, nu
-- doar pentru cel implicit.
--
-- „Programare rapida:" → „Programare:" eliberează 7 caractere: 156 cu
-- rovinietă, adică un singur SMS pentru toate tipurile.

UPDATE kiosk_stations
SET sms_template_5d = replace(sms_template_5d, 'Programare rapida:', 'Programare:')
WHERE sms_template_5d LIKE '%Programare rapida:%';
