-- Fiecare SMS trebuie sa aiba o cale de dezabonare.
--
-- Politica de confidentialitate publicata pe 10.08.2026 spune, negru pe alb:
-- "Fiecare SMS contine un link de dezabonare". Nu era adevarat. Niciun sablon,
-- nici cele implicite din cod, nici cele ale statiei, nu continea
-- {opt_out_link} -- verificat si pe mesajele chiar trimise, in
-- notification_log si in jurnalul NotifyHub. Iar NotifyHub nu adauga nimic de
-- la el: mesajele plecau exact asa cum le trimiteam noi.
--
-- Adaugarea incape intr-un singur SMS cat timp programarile sunt oprite
-- (129 si 141 caractere, GSM-7, o parte). Cu programarile pornite se trece la
-- doua parti -- de aceea linkul de programare NU se adauga aici, si de aceea
-- textul are nevoie de scurtare inainte de a aprinde booking_enabled.
--
-- Idempotent: adauga doar unde lipseste, ca sa nu calce peste personalizarile
-- unui patron care si-a scris deja sablonul cu dezabonare.

UPDATE public.kiosk_stations
SET sms_template_5d = sms_template_5d || E'\nStop: {opt_out_link}'
WHERE sms_template_5d IS NOT NULL AND sms_template_5d NOT LIKE '%{opt_out_link}%';

UPDATE public.kiosk_stations
SET sms_template_3d = sms_template_3d || E'\nStop: {opt_out_link}'
WHERE sms_template_3d IS NOT NULL AND sms_template_3d NOT LIKE '%{opt_out_link}%';

UPDATE public.kiosk_stations
SET sms_template_1d = sms_template_1d || E'\nStop: {opt_out_link}'
WHERE sms_template_1d IS NOT NULL AND sms_template_1d NOT LIKE '%{opt_out_link}%';

UPDATE public.kiosk_stations
SET sms_template_review = sms_template_review || E'\nStop: {opt_out_link}'
WHERE sms_template_review IS NOT NULL AND sms_template_review NOT LIKE '%{opt_out_link}%';
