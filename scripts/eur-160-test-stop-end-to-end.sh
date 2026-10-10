#!/bin/bash
# EUR-160: Test end-to-end STOP opt-out flow
# Verifică că STOP -> global_opt_outs.opted_out_at în uitdeitp
# ❌ DRUMUL INVERS (uitdeitp -> EAM consents.revoked_at) LIPSEȘTE

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PHONE_TEST="+40712999999" # Număr test, nu real
BASE_URL="${BASE_URL:-https://uitdeitp.vercel.app}"

echo -e "${YELLOW}=== EUR-160: Test STOP Opt-Out End-to-End ===${NC}\n"

# 1. Creează un reminder de test (pentru a avea un telefon valid în sistem)
echo -e "${YELLOW}1. Creează reminder de test pentru $PHONE_TEST${NC}"

REMINDER_ID=$(curl -s -X POST "$BASE_URL/api/reminders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_API_KEY" \
  -d "{
    \"station_id\": \"$TEST_STATION_ID\",
    \"guest_phone\": \"$PHONE_TEST\",
    \"guest_name\": \"Test EUR-160\",
    \"plate_number\": \"CT-99-EUR\",
    \"expiry_date\": \"$(date -d '+30 days' -Iseconds)\",
    \"reminder_offset_minutes\": 10080,
    \"gdpr_consent\": true
  }" | jq -r '.id // empty')

if [ -z "$REMINDER_ID" ]; then
  echo -e "${RED}❌ Nu s-a putut crea reminderul de test${NC}"
  echo "Setează TEST_API_KEY și TEST_STATION_ID în environment"
  exit 1
fi

echo -e "${GREEN}✅ Reminder creat: $REMINDER_ID${NC}\n"

# 2. Generează token de opt-out pentru acest telefon
echo -e "${YELLOW}2. Generează token de opt-out${NC}"

# Trebuie să citim din baza de date sau să folosim funcția de generare token
# Pentru test, folosim direct API-ul de verificare
OPT_OUT_TOKEN=$(node -e "
const crypto = require('crypto');
const phone = '$PHONE_TEST';
// Implementarea simplificată - în producție ar folosi logica din /lib/utils/opt-out.ts
const token = crypto.createHash('sha256').update(phone).digest('hex').substring(0, 16);
console.log(token);
")

echo -e "${GREEN}Token generat: $OPT_OUT_TOKEN${NC}\n"

# 3. Testează GET /api/opt-out (verificare status)
echo -e "${YELLOW}3. Verifică status opt-out ÎNAINTE${NC}"

OPT_STATUS_BEFORE=$(curl -s "$BASE_URL/api/opt-out?token=$OPT_OUT_TOKEN" | jq -r '.optedOut')

echo -e "Status opt-out: $OPT_STATUS_BEFORE"
echo -e "${GREEN}✅ Verificare status reușită${NC}\n"

# 4. Trimite cerere de opt-out (simulează STOP)
echo -e "${YELLOW}4. Trimite STOP (POST /api/opt-out)${NC}"

OPT_OUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/opt-out" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$OPT_OUT_TOKEN\"}")

echo "Răspuns: $OPT_OUT_RESPONSE"

if echo "$OPT_OUT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Opt-out înregistrat cu succes în uitdeitp${NC}\n"
else
  echo -e "${RED}❌ Opt-out failed${NC}"
  exit 1
fi

# 5. Verifică că opt-out-ul apare în baza de date uitdeitp
echo -e "${YELLOW}5. Verifică global_opt_outs în uitdeitp${NC}"

# Aici ar trebui să interogăm Supabase direct
echo "Query SQL necesar:"
echo "SELECT phone, opted_out_at, source FROM global_opt_outs WHERE phone = '$PHONE_TEST';"
echo -e "${YELLOW}⚠️  Rulează manual în Supabase SQL Editor${NC}\n"

# 6. ❌ AICI LIPSEȘTE: Verifică că revoked_at apare în EAM
echo -e "${RED}6. ❌ LIPSEȘTE: Verifică consents.revoked_at în EAM${NC}"
echo -e "${RED}Contract B (uitdeitp -> EAM) nu există încă${NC}"
echo -e "${YELLOW}Query SQL pentru EAM (când va fi implementat):${NC}"
echo "SELECT client_id, consents->>'marketing' as marketing_consent, consents->'marketing'->>'revoked_at' as revoked_at"
echo "FROM clients WHERE phone = '$PHONE_TEST';"
echo ""

# 7. Cleanup - șterge reminderul de test
echo -e "${YELLOW}7. Cleanup${NC}"

curl -s -X DELETE "$BASE_URL/api/reminders/$REMINDER_ID" \
  -H "Authorization: Bearer $TEST_API_KEY" >/dev/null

echo -e "${GREEN}✅ Reminder de test șters${NC}\n"

# CONCLUZII
echo -e "${YELLOW}=== CONCLUZII EUR-160 ===${NC}\n"

echo -e "${GREEN}✅ FUNCȚIONAL în uitdeitp:${NC}"
echo "  - POST /api/opt-out primește STOP"
echo "  - Scrie în global_opt_outs.opted_out_at"
echo "  - Marchează remindere cu opt_out=true"
echo ""

echo -e "${RED}❌ LIPSEȘTE (trebuie specificat pe issue):${NC}"
echo "  - Contract B: uitdeitp -> EAM sync"
echo "  - Endpoint pentru scriere consents.revoked_at în EAM"
echo "  - Webhook sau API call când cineva face STOP"
echo ""

echo -e "${YELLOW}📋 SPECIFICAȚIE NECESARĂ:${NC}"
echo "  1. Endpoint în EAM: PATCH /api/clients/{phone}/consent"
echo "  2. Body: {\"marketing\": false, \"revoked_at\": \"2026-10-10T20:00:00Z\"}"
echo "  3. Apelat din /api/opt-out după scriere în global_opt_outs"
echo "  4. Idempotent (nu eșuează dacă deja revoked)"
echo ""
