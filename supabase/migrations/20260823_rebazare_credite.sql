-- ============================================================================
-- Rebazarea creditelor (decizia A1, 2026-08-23): 1 credit = 1 SMS standard.
--
-- Creditul trece de la 0,05 € la 0,10 €; treptele de la 2/3/5 la 1/2/3.
-- Soldurile existente se convertesc VALORIC: sold_nou = ceil(sold_vechi / 2)
-- — rotunjit ÎN FAVOAREA stației. Nicio stație nu pierde niciun cent.
--
-- NU se rescriu deltele istorice (ar strica sold_rezultat și auditul):
-- conversia e o singură linie de ajustare per stație, idempotentă prin
-- constrângerea UNIQUE (station_id, motiv, referinta) cu referința fixă
-- 'rebazare-2026-08'. Ledgerul rămâne append-only și povestea completă.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_new INT;
  v_delta INT;
  v_result JSONB;
BEGIN
  FOR r IN
    SELECT station_id, COALESCE(SUM(delta), 0) AS balance
    FROM public.credit_ledger
    GROUP BY station_id
    HAVING COALESCE(SUM(delta), 0) > 0
  LOOP
    v_new := CEIL(r.balance / 2.0);
    v_delta := v_new - r.balance;  -- negativ

    IF v_delta = 0 THEN
      CONTINUE;
    END IF;

    v_result := public.credit_ledger_append(
      r.station_id,
      v_delta,
      'adjust_admin',
      'rebazare-2026-08',
      format(
        '%s credite · rebazare: 1 credit = 1 SMS (%s credite vechi a 0,05 EUR = %s credite noi a 0,10 EUR, rotunjit in favoarea ta)',
        v_delta, r.balance, v_new
      )
    );

    RAISE NOTICE 'rebazare stație %: % -> % (%)', r.station_id, r.balance, v_new, v_result;
  END LOOP;
END;
$$;
