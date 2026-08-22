-- ============================================================================
-- Ledger de credite per stație (PRD credite §6.2) — imuabil, append-only.
--
-- Soldul NU este niciodată un câmp mutabil: este agregarea ledgerului, iar
-- fiecare linie poartă soldul rezultat (sold_rezultat) calculat atomic la
-- inserare, sub advisory lock per stație. Orice afișare de sold în UI provine
-- de aici.
--
-- Modelul: 1 credit = 0,05 € + TVA; e-mailul NU atinge ledgerul (gratuit);
-- SMS = 2/3/5 credite la 1/2/3 segmente; 4+ segmente = blocat la trimitere.
-- Creditele expiră la 12 luni de la achiziție, FIFO.
--
-- Inert până la CREDIT_LEDGER_ENABLED=true. Idempotent, sigur pe producție.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id     UUID NOT NULL REFERENCES public.kiosk_stations(id) ON DELETE CASCADE,
  delta          INT  NOT NULL CHECK (delta <> 0),
  motiv          TEXT NOT NULL CHECK (motiv IN ('purchase', 'refund_purchase', 'send_sms', 'refund_dlr', 'expiry', 'adjust_admin')),
  -- Referința sursei: payment_ref (purchase), notification_log.id (send_sms /
  -- refund_dlr), id-ul liniei de purchase (expiry).
  referinta      TEXT,
  -- Explicație în limbaj natural, afișată ca atare în istoricul stației
  -- („−12 credite · 4 SMS-uri a câte 2 segmente către …").
  descriere      TEXT,
  sold_rezultat  INT  NOT NULL CHECK (sold_rezultat >= 0),
  -- Doar pe liniile purchase: momentul expirării FIFO (achiziție + 12 luni).
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotență: aceeași sursă nu poate produce de două ori aceeași linie
-- (webhook rejucat, DLR dublu, cron reluat).
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_ledger_source
  ON public.credit_ledger (station_id, motiv, referinta)
  WHERE referinta IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_ledger_station
  ON public.credit_ledger (station_id, created_at DESC);

-- Append-only la nivel de bază, nu doar prin convenție.
CREATE OR REPLACE FUNCTION public.credit_ledger_block_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'credit_ledger is append-only';
END;
$$;

DROP TRIGGER IF EXISTS credit_ledger_no_update ON public.credit_ledger;
CREATE TRIGGER credit_ledger_no_update
  BEFORE UPDATE OR DELETE ON public.credit_ledger
  FOR EACH ROW EXECUTE FUNCTION public.credit_ledger_block_mutation();

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Station owners read own ledger" ON public.credit_ledger;
CREATE POLICY "Station owners read own ledger"
  ON public.credit_ledger FOR SELECT
  TO authenticated
  USING (
    station_id IN (SELECT id FROM public.kiosk_stations WHERE owner_id = auth.uid())
  );

REVOKE INSERT, UPDATE, DELETE ON public.credit_ledger FROM anon, authenticated;
GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;

-- ----------------------------------------------------------------------------
-- Append atomic. Advisory lock per stație: două trimiteri simultane nu pot
-- citi același sold și scrie amândouă peste el. Refuză soldul negativ cu
-- 'insufficient_credits' — CU EXCEPȚIA expirării și a ajustărilor de admin,
-- care taie la zero (clamp), fiindcă ele nu sunt cheltuieli refuzabile.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_ledger_append(
  p_station_id UUID,
  p_delta      INT,
  p_motiv      TEXT,
  p_referinta  TEXT DEFAULT NULL,
  p_descriere  TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INT;
  v_delta   INT := p_delta;
  v_id      UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('credit_ledger'), hashtext(p_station_id::text));

  SELECT COALESCE(SUM(delta), 0) INTO v_balance
  FROM public.credit_ledger WHERE station_id = p_station_id;

  -- refund_purchase intră la clamp: dacă stația a consumat deja creditele
  -- rambursate, nu avem de unde le lua — debităm ce a rămas și linia de
  -- ledger e evidența pentru follow-up-ul comercial.
  IF v_balance + v_delta < 0 THEN
    IF p_motiv IN ('expiry', 'adjust_admin', 'refund_purchase') THEN
      v_delta := -v_balance;                -- clamp la zero
      IF v_delta = 0 THEN
        RETURN jsonb_build_object('ok', true, 'balance', v_balance, 'noop', true);
      END IF;
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'balance', v_balance);
    END IF;
  END IF;

  INSERT INTO public.credit_ledger
    (station_id, delta, motiv, referinta, descriere, sold_rezultat, expires_at)
  VALUES
    (p_station_id, v_delta, p_motiv, p_referinta, p_descriere, v_balance + v_delta, p_expires_at)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'balance', v_balance + v_delta, 'id', v_id);
EXCEPTION
  WHEN unique_violation THEN
    -- Replay (webhook dublu, DLR rejucat, cron reluat) = succes, nu eroare.
    SELECT COALESCE(SUM(delta), 0) INTO v_balance
    FROM public.credit_ledger WHERE station_id = p_station_id;
    RETURN jsonb_build_object('ok', true, 'balance', v_balance, 'duplicate', true);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_ledger_append(UUID, INT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.credit_ledger_balance(p_station_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(delta), 0)::INT FROM public.credit_ledger WHERE station_id = p_station_id;
$$;

-- ----------------------------------------------------------------------------
-- Expirarea FIFO (job zilnic). Pentru fiecare linie purchase expirată și încă
-- neprocesată: partea rămasă = achiziție − ce s-a consumat FIFO din ea.
-- Consumul (toate debitele, inclusiv expirările anterioare) se alocă FIFO pe
-- achiziții în ordinea cumpărării, deci restul achiziției p este:
--   clamp(p.delta − max(0, total_debite − achiziții_anterioare), 0, p.delta)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_ledger_expire()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_debits INT;
  v_prior INT;
  v_remaining INT;
  v_expired_lines INT := 0;
  v_expired_credits INT := 0;
  v_result JSONB;
BEGIN
  FOR r IN
    SELECT p.id, p.station_id, p.delta, p.created_at
    FROM public.credit_ledger p
    WHERE p.motiv = 'purchase'
      AND p.expires_at IS NOT NULL
      AND p.expires_at <= NOW()
      AND NOT EXISTS (
        SELECT 1 FROM public.credit_ledger e
        WHERE e.motiv = 'expiry' AND e.referinta = p.id::text AND e.station_id = p.station_id
      )
    ORDER BY p.station_id, p.created_at
  LOOP
    SELECT COALESCE(SUM(-delta), 0) INTO v_debits
    FROM public.credit_ledger
    WHERE station_id = r.station_id AND delta < 0;

    SELECT COALESCE(SUM(delta), 0) INTO v_prior
    FROM public.credit_ledger
    WHERE station_id = r.station_id AND motiv = 'purchase'
      AND (created_at < r.created_at OR (created_at = r.created_at AND id < r.id));

    v_remaining := LEAST(GREATEST(r.delta - GREATEST(v_debits - v_prior, 0), 0), r.delta);

    IF v_remaining > 0 THEN
      v_result := public.credit_ledger_append(
        r.station_id,
        -v_remaining,
        'expiry',
        r.id::text,
        format('-%s credite · expirate la 12 luni de la achizitie', v_remaining)
      );
      IF (v_result->>'ok')::boolean AND v_result->>'noop' IS NULL THEN
        v_expired_lines := v_expired_lines + 1;
        v_expired_credits := v_expired_credits + v_remaining;
      END IF;
    ELSE
      -- Achiziție consumată integral: marcaj de zero nu are sens; inserăm o
      -- santinelă nu — pur și simplu o excludem prin condiția NOT EXISTS la
      -- rulările viitoare doar dacă există linia expiry. Ca să nu o recalculăm
      -- zilnic pentru totdeauna, inserția santinelei ar încălca CHECK delta<>0,
      -- deci acceptăm recalculul: e ieftin și corect.
      NULL;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('expired_lines', v_expired_lines, 'expired_credits', v_expired_credits);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_ledger_expire() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_ledger_balance(UUID) FROM anon;

DO $$
BEGIN
  RAISE NOTICE 'credit_ledger ready (inert until CREDIT_LEDGER_ENABLED=true)';
END;
$$;
