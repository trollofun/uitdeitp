-- Auditul costului SMS, la noi în casă.
--
-- Semnalasem că nimeni nu poate audita costul real: NotifyHub avea coloanele
-- `parts` goale (0 din 12 mesaje) și un `estimated_cost` fix, 0,0350 pe mesaj
-- indiferent de lungime — deci un mesaj de două părți se contabiliza ca unul.
--
-- Ei au reparat partea lor (2026-08-09) și au găsit investigând două erori mai
-- adânci, în direcții opuse: caracterele din tabelul de extensie GSM-7
-- (`^ { } \ [ ] ~ | €`) costă **doi septeți** și nu erau numărate ca atare, iar
-- literele non-ASCII care fac totuși parte din GSM-7 (`à Ö ñ ü è É Ä §`) erau
-- tratate ca Unicode — supraestimare de până la 3×.
--
-- Partea noastră: până acum stocam un singur număr, `estimated_cost`, luat din
-- `cost`-ul lor. De la aceeași dată, `cost` include TVA, iar `estimated_cost`
-- la ei rămâne net. Fără schimbarea asta, două coloane cu aceeași denumire ar
-- fi ținut numere care diferă cu 21%, în două baze diferite, fără ca nimeni să
-- observe până la prima reconciliere.
--
-- Deci: `estimated_cost` rămâne **net**, aliniat cu ei și cu factura
-- providerului; bruta și cota se stochează separat, iar `vat_rate` per rând, ca
-- un raport pe o lună trecută să folosească cota de atunci, nu pe cea de azi.

ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS parts integer,
  ADD COLUMN IF NOT EXISTS cost_gross numeric,
  ADD COLUMN IF NOT EXISTS vat_rate numeric,
  ADD COLUMN IF NOT EXISTS currency text;

COMMENT ON COLUMN public.notification_log.estimated_cost IS
  'Cost NET raportat de NotifyHub (cost_net), comparabil cu factura providerului.';
COMMENT ON COLUMN public.notification_log.cost_gross IS
  'Cost cu TVA — suma final platita. NotifyHub il trimite ca `cost` de la 2026-08-09.';
COMMENT ON COLUMN public.notification_log.parts IS
  'Cate SMS-uri s-au taxat. Un mesaj cu diacritice trece pe UCS-2: 70 caractere pe parte in loc de 160.';
COMMENT ON COLUMN public.notification_log.vat_rate IS
  'Cota de TVA la momentul trimiterii, ca rapoartele retroactive sa nu foloseasca cota de azi.';
