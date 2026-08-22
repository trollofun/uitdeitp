-- ============================================================================
-- Tokenuri opace de opt-out (scurtarea linkului din SMS + închiderea găurii
-- de enumerare).
--
-- Vechiul token era telefonul codat reversibil în base36: oricine putea
-- enumera numere reale prin GET /api/opt-out?token= și dezabona pe oricine.
-- Noul token e aleator (6 caractere a-z0-9 — GSM-7 pur), unic per telefon și
-- REFOLOSIT: același client primește mereu același link (itp.vin/xxxxxx).
--
-- Linkurile vechi rămân valabile pentru totdeauna prin decodarea legacy —
-- SMS-urile deja trimise nu expiră.
--
-- Service-role-only, ca notification_log. Idempotent, inert până la deploy.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.opt_out_tokens (
  token      TEXT PRIMARY KEY CHECK (token ~ '^[a-z0-9]{6,12}$'),
  phone      TEXT NOT NULL UNIQUE CHECK (phone ~ '^\+40\d{9}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.opt_out_tokens ENABLE ROW LEVEL SECURITY;

-- Nicio politică pentru anon/authenticated: tabelul leagă tokenuri de numere
-- de telefon — exact ce nu are voie să citească nimeni în afara serverului.
REVOKE ALL ON public.opt_out_tokens FROM anon, authenticated;
GRANT ALL ON public.opt_out_tokens TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'opt_out_tokens ready';
END;
$$;
