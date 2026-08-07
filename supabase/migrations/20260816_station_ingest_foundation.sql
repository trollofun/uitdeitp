-- ============================================================================
-- Contract A foundation: per-station ingest keys + idempotency (PRD F1.1-F1.4).
--
-- Lets the SIRAR automation (and the Lite agent) push inspections into
-- uitdeITP authenticated as a specific station. The Bearer key is stored only
-- as a SHA-256 hash; the HMAC secret is a separate value kept in Supabase
-- Vault (verified available: supabase_vault 0.2.8).
--
-- Everything here is additive and inert until INGEST_ENABLED=true and a
-- station has ingest_enabled=true.
--
-- Safe to run on the live database (dnowyodhffqqhmakjupo). Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Vault wrappers (service_role only). Recoverable secrets never touch the
--    application tables in plaintext.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.secret_put(p_name TEXT, p_secret TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = p_name;

  IF v_id IS NULL THEN
    SELECT vault.create_secret(p_secret, p_name) INTO v_id;
  ELSE
    PERFORM vault.update_secret(v_id, p_secret, p_name);
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.secret_put(TEXT, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.secret_put(TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.secret_get(p_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = p_id;
  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.secret_get(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.secret_get(UUID) TO service_role;

-- ----------------------------------------------------------------------------
-- B) Station columns: RAR code (ecosystem correlation key), per-station
--    notification defaults, and the ingest toggles.
-- ----------------------------------------------------------------------------
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS rar_code TEXT;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS default_intervals JSONB DEFAULT '[5]'::jsonb;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS ingest_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS hmac_mode TEXT DEFAULT 'log';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kiosk_stations_hmac_mode_check'
  ) THEN
    ALTER TABLE public.kiosk_stations
      ADD CONSTRAINT kiosk_stations_hmac_mode_check
      CHECK (hmac_mode IN ('log', 'enforce'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT rar_code FROM public.kiosk_stations
     WHERE rar_code IS NOT NULL GROUP BY rar_code HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Duplicate rar_code values exist — unique index NOT created.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_kiosk_stations_rar_code
      ON public.kiosk_stations (rar_code) WHERE rar_code IS NOT NULL;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- C) station_api_keys — the Bearer identity of a station's automation.
--    Only the hash is stored; the raw key is shown once, at creation.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.station_api_keys (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id     UUID NOT NULL REFERENCES public.kiosk_stations(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  key_prefix     TEXT NOT NULL,
  key_hash       TEXT NOT NULL UNIQUE,
  hmac_secret_id UUID NOT NULL,
  scopes         TEXT[] NOT NULL DEFAULT ARRAY['ingest'],
  last_used_at   TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_station_api_keys_station
  ON public.station_api_keys (station_id) WHERE revoked_at IS NULL;

ALTER TABLE public.station_api_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.station_api_keys FROM anon, authenticated;
GRANT ALL ON public.station_api_keys TO service_role;

-- ----------------------------------------------------------------------------
-- D) reminders: idempotency + provenance + supersede marker.
--    NOTE deliberately no `status` column — the dashboard derives status
--    client-side and a DB column would collide with it.
-- ----------------------------------------------------------------------------
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS external_ref TEXT;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS source_detail TEXT;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS consent_version TEXT;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS inspected_at DATE;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.reminders(id);

-- Idempotency is per station: the same SIRAR event replayed returns the same
-- reminder instead of creating a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_external_ref
  ON public.reminders (station_id, external_ref) WHERE external_ref IS NOT NULL;

-- ----------------------------------------------------------------------------
-- E) integration_request_log — audit trail and the evidence used to move HMAC
--    verification from log-only to enforce. Deliberately stores no raw payload
--    (it contains personal data); only a body hash.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_request_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id        UUID REFERENCES public.kiosk_stations(id) ON DELETE SET NULL,
  key_id            UUID REFERENCES public.station_api_keys(id) ON DELETE SET NULL,
  idempotency_key   TEXT,
  payload_variant   TEXT,
  signature_present BOOLEAN DEFAULT false,
  signature_valid   BOOLEAN,
  signature_form    TEXT,
  rar_code_match    BOOLEAN,
  status_code       INT,
  error_code        TEXT,
  reminder_id       UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  body_sha256       TEXT,
  client_ip         INET,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_request_log_station
  ON public.integration_request_log (station_id, created_at DESC);

ALTER TABLE public.integration_request_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_request_log FROM anon, authenticated;
GRANT ALL ON public.integration_request_log TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'Contract A foundation ready: station_api_keys, integration_request_log, reminders.external_ref, station ingest columns';
END;
$$;
