-- ============================================================================
-- 20260829_partner_key_lifecycle_scope.sql  (APLICATĂ 2026-08-09)
--
-- Cheia M2M a Academy primește `stations:lifecycle` pe lângă `stations:provision`.
--
-- DE CE pe aceeași cheie și nu una nouă: separarea celor două scope-uri rămâne
-- corectă ca model — provisionarea creează identități de stație, ciclul de viață
-- le modifică — dar la Academy ambele apeluri pleacă din același deployment, din
-- același proces, citind aceeași variabilă de mediu. Două chei ar sta în același
-- loc, cu aceeași rază de explozie; ce ar cumpăra sigur sunt două secrete de
-- rotit și încă o ocazie de a rămâne setate-dar-goale — defect care a lovit
-- ecosistemul de două ori în trei zile.
--
-- Momentul e sigur: `partner_provision_requests` e goală și nicio stație n-are
-- `academy_station_id`, deci scope-ul nu poate atinge nimic până la prima stație
-- reală. Verificat înainte de aplicare (0 cereri, 0 stații corelate).
--
-- ROLLBACK: scoaterea scope-ului, mai jos. Nu revocă cheia, deci provisionarea
-- nu e afectată.
--   UPDATE public.partner_api_keys
--      SET scopes = array_remove(scopes, 'stations:lifecycle')
--    WHERE key_prefix = 'pk_prov_live' AND revoked_at IS NULL;
-- ============================================================================

UPDATE public.partner_api_keys
   SET scopes = array_append(scopes, 'stations:lifecycle'),
       -- Eticheta e singurul loc din care se vede, la o rotire, ce pierde cine
       -- pierde cheia. „claim provisioning" ar minți de acum.
       label = 'Academy (atestareitp) - claim provisioning + station lifecycle'
 WHERE revoked_at IS NULL
   AND 'stations:provision' = ANY(scopes)
   AND NOT ('stations:lifecycle' = ANY(scopes));

COMMENT ON COLUMN public.partner_api_keys.scopes IS
  'Scope-uri verificate la fiecare apel. `stations:provision` creeaza statii, `stations:lifecycle` le modifica dupa claim. Azi Academy le poarta pe amandoua pe aceeasi cheie: la ei pleaca din acelasi proces si aceeasi variabila de mediu, deci doua chei ar dubla secretele fara sa izoleze nimic. Se separa cand livrarea evenimentelor pleaca din alt serviciu.';
