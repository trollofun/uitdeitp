-- Contorizarea clicurilor, atomic.
--
-- Prima variantă citea rândul, apoi scria `click_count + 1` din aplicație. Două
-- probleme, amândouă văzute pe producție:
--
--   1. Citirea nu întorcea coloanele noi, deci fiecare clic scria „primul clic":
--      `click_count` rămânea 1 și `clicked_at` se rescria la fiecare deschidere,
--      pierzând exact informația pentru care există.
--   2. Chiar dacă citirea ar fi mers, citire-apoi-scriere e o cursă: doi oameni
--      care dau clic în aceeași clipă citesc amândoi aceeași valoare și scriu
--      amândoi aceeași valoare +1. Un clic dispare.
--
-- Un singur UPDATE rezolvă ambele: incrementul se face în baza de date, unde
-- rândul e blocat, iar `clicked_at` se pune doar dacă e încă NULL — deci
-- reține primul clic, nu ultimul.
--
-- Întoarce și linkul stației, ca ruta să nu mai facă o interogare separată:
-- un singur drum dus-întors între redirect și client.

CREATE OR REPLACE FUNCTION public.record_review_click(p_token text)
RETURNS TABLE (review_link text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bumped AS (
    UPDATE public.review_requests AS rr
    SET click_count = rr.click_count + 1,
        clicked_at = COALESCE(rr.clicked_at, now())
    WHERE rr.token = p_token
    RETURNING rr.station_id
  )
  SELECT ks.review_link
  FROM bumped
  JOIN public.kiosk_stations ks ON ks.id = bumped.station_id
  WHERE ks.review_link IS NOT NULL;
$$;

-- Ruta rulează cu service_role, care oricum ocolește RLS; nu dăm execuție
-- rolurilor publice ca să nu existe o cale de a umfla contoarele din browser.
REVOKE ALL ON FUNCTION public.record_review_click(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_review_click(text) TO service_role;

COMMENT ON FUNCTION public.record_review_click(text) IS
  'Incrementeaza atomic contorul de clicuri si intoarce linkul de recenzie al statiei. clicked_at retine primul clic.';
