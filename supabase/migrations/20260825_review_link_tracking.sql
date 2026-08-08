-- Faza 1: cererea de recenzie devine măsurabilă și se oprește la respingeri.
--
-- Ce lipsea, față de ce vinde concurența (Inspecto o ține în planul scump,
-- ~70 lei/inspector/lună): al lor e o propoziție într-un SMS, cu link în text
-- liber, trimis instant, fără niciun contor. Fără măsurare, o stație nu poate
-- justifica plata — deci contorul nu e cosmetic, e chiar argumentul comercial.

-- 1. Token opac pentru linkul scurt.
--
-- NU refolosim tokenizarea din `opt-out.ts`: aceea e o transformare reversibilă
-- a numărului de telefon, deci enumerabilă — cine ghicește un token află un
-- număr. Aici tokenul e aleatoriu și nu spune nimic despre client.
-- 9 octeți = 72 de biți de entropie, 12 caractere după base64 url-safe.
ALTER TABLE public.review_requests
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.review_requests
  ALTER COLUMN token SET DEFAULT replace(replace(encode(gen_random_bytes(9), 'base64'), '/', '_'), '+', '-');

-- Rândurile existente (toate `skipped`, feature-ul n-a trimis nimic încă).
UPDATE public.review_requests
SET token = replace(replace(encode(gen_random_bytes(9), 'base64'), '/', '_'), '+', '-')
WHERE token IS NULL;

ALTER TABLE public.review_requests
  ALTER COLUMN token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS review_requests_token_key
  ON public.review_requests (token);

-- 2. Anti-spam: căutarea „a mai primit clientul ăsta o cerere recent?" trebuie
--    să fie ieftină, altfel o facem o dată și apoi renunțăm la ea.
CREATE INDEX IF NOT EXISTS review_requests_phone_sent_idx
  ON public.review_requests (phone, sent_at DESC)
  WHERE status = 'sent';

-- 3. Poarta pe rezultatul inspecției.
--
-- Azi filtrul e la sursă: SIRAR trimite doar inspecțiile trecute, indiferent
-- dacă vine din ITP Pro sau ITP Pro Auto. Dar SIRAR a cerut să putem primi și
-- respingerile — iar în ziua în care le primim, poarta asta e singurul lucru
-- care oprește un SMS de tipul „mulțumim, lasă-ne o recenzie" către un om
-- căruia tocmai i-am respins mașina.
--
-- Se adaugă acum, cât e ieftin. NULL = necunoscut, tratat ca trecut, ca să nu
-- schimbe comportamentul pentru cele 149 de rânduri existente.
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS inspection_result text;

ALTER TABLE public.reminders
  DROP CONSTRAINT IF EXISTS reminders_inspection_result_check;

ALTER TABLE public.reminders
  ADD CONSTRAINT reminders_inspection_result_check
  CHECK (inspection_result IS NULL OR inspection_result IN ('passed', 'rejected'));

COMMENT ON COLUMN public.reminders.inspection_result IS
  'Rezultatul inspecției, când sursa îl trimite. NULL = necunoscut (tratat ca trecut). Poarta F2.5 refuză ''rejected''.';

COMMENT ON COLUMN public.review_requests.token IS
  'Token opac pentru linkul scurt de recenzie. Aleatoriu, nederivat din telefon — spre deosebire de tokenul de opt-out.';
