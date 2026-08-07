#!/usr/bin/env bash
# Contract A acceptance matrix — drives POST /api/integrations/reminders the way
# the SIRAR automation will.
#
#   BASE_URL=https://uitdeitp.ro \
#   INGEST_KEY=sk_ing_... HMAC_SECRET=... ./scripts/fake-sirar.sh
#
# Expected: 201 -> 200 (replay) -> 202 (no recipient) -> 422 (past date)
#           -> 401/logged (bad signature, depends on hmac_mode) -> 403 (revoked)

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
INGEST_KEY="${INGEST_KEY:?set INGEST_KEY}"
HMAC_SECRET="${HMAC_SECRET:?set HMAC_SECRET}"
ENDPOINT="$BASE_URL/api/integrations/reminders"

sign() { printf '%s' "$1" | openssl dgst -sha256 -hmac "$HMAC_SECRET" -hex | awk '{print $2}'; }

send() {
  local body="$1" idem="$2" sig="${3:-}"
  [ -z "$sig" ] && sig="$(sign "$body")"
  curl -sS -o /tmp/fake-sirar-out.json -w '%{http_code}' -X POST "$ENDPOINT" \
    -H "Authorization: Bearer $INGEST_KEY" \
    -H "X-SIRAR-Signature: sha256=$sig" \
    -H "X-SIRAR-Idempotency-Key: $idem" \
    -H 'Content-Type: application/json' \
    -d "$body"
}

check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "  OK   $1 -> $3"; else echo "  FAIL $1 -> got $3, expected $2"; cat /tmp/fake-sirar-out.json; echo; fi
}

IDEM="fake-sirar-$(date +%s)"
FUTURE=$(date -d '+11 months' +%Y-%m-%d)

LITE=$(cat <<JSON
{"payload_variant":"lite","plate_number":"CT99XYZ","expiry_date":"$FUTURE",
 "destinatar":{"telefon":"0712345678","consimtamant_la":"$(date -Iseconds)","consimtamant_versiune":"v1","nume":"Client Test"},
 "statie_ref":{"rar_code":"CT060"}}
JSON
)

echo "Contract A matrix against $ENDPOINT"
check "create (lite)"        201 "$(send "$LITE" "$IDEM")"
check "replay same key"      200 "$(send "$LITE" "$IDEM")"

NO_RECIPIENT=$(cat <<JSON
{"payload_variant":"full","inspectie":{"expirare":"$FUTURE","rezultat":"ADMIS"},
 "vehicul":{"numar_inmatriculare":"CT88ABC"}}
JSON
)
check "no destinatar"        202 "$(send "$NO_RECIPIENT" "$IDEM-nr")"

PAST=$(echo "$LITE" | sed "s/$FUTURE/2020-01-01/")
check "past expiry"          422 "$(send "$PAST" "$IDEM-past")"

check "bad signature"        "${EXPECT_BAD_SIG:-201}" "$(send "$LITE" "$IDEM-badsig" "$(printf '%064d' 0)")"

echo "Done. Inspect: select status_code, error_code, signature_valid, signature_form from integration_request_log order by created_at desc limit 10;"
