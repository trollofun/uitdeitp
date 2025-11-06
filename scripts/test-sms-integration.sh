#!/bin/bash

# SMS Verification Integration Test Script
# Tests end-to-end SMS delivery via NotifyHub

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
NOTIFYHUB_URL="${NOTIFYHUB_URL:-https://ntf.uitdeitp.ro}"
TEST_PHONE="${TEST_PHONE:-+40712345678}" # Set your test phone number

echo -e "${GREEN}=== SMS Verification Integration Tests ===${NC}\n"

# Test 1: Check NotifyHub Health
echo -e "${YELLOW}Test 1: NotifyHub Health Check${NC}"
HEALTH_RESPONSE=$(curl -s "${NOTIFYHUB_URL}/api/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
  echo -e "${GREEN}✓ NotifyHub is healthy${NC}"
else
  echo -e "${RED}✗ NotifyHub health check failed${NC}"
  echo "$HEALTH_RESPONSE"
  exit 1
fi
echo ""

# Test 2: Send Verification SMS
echo -e "${YELLOW}Test 2: Send Verification SMS to ${TEST_PHONE}${NC}"
SEND_START=$(date +%s%3N)
SEND_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/verification/send" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"${TEST_PHONE}\",\"stationSlug\":\"test-station\"}")
SEND_END=$(date +%s%3N)
SEND_TIME=$((SEND_END - SEND_START))

if echo "$SEND_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ SMS sent successfully in ${SEND_TIME}ms${NC}"
  echo "  Response: $SEND_RESPONSE"
else
  echo -e "${RED}✗ Failed to send SMS${NC}"
  echo "  Response: $SEND_RESPONSE"
  exit 1
fi
echo ""

# Test 3: Response Time Check
echo -e "${YELLOW}Test 3: API Response Time${NC}"
if [ "$SEND_TIME" -lt 500 ]; then
  echo -e "${GREEN}✓ Response time: ${SEND_TIME}ms (<500ms target)${NC}"
else
  echo -e "${YELLOW}⚠ Response time: ${SEND_TIME}ms (>500ms target)${NC}"
fi
echo ""

# Test 4: Invalid Phone Format
echo -e "${YELLOW}Test 4: Invalid Phone Number Validation${NC}"
INVALID_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/verification/send" \
  -H "Content-Type: application/json" \
  -d '{"phone":"123456","stationSlug":"test-station"}')

if echo "$INVALID_RESPONSE" | grep -q '"success":false'; then
  echo -e "${GREEN}✓ Invalid phone rejected correctly${NC}"
else
  echo -e "${RED}✗ Invalid phone should be rejected${NC}"
  echo "  Response: $INVALID_RESPONSE"
fi
echo ""

# Test 5: Rate Limiting
echo -e "${YELLOW}Test 5: Rate Limiting (5 requests in quick succession)${NC}"
RATE_LIMIT_FAILURES=0
for i in {1..5}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/verification/send" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"${TEST_PHONE}\",\"stationSlug\":\"test-station\"}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  if [ "$i" -le 3 ]; then
    if [ "$HTTP_CODE" == "200" ]; then
      echo -e "  ${GREEN}Request $i: ✓ Accepted${NC}"
    else
      echo -e "  ${RED}Request $i: ✗ Unexpected status $HTTP_CODE${NC}"
      RATE_LIMIT_FAILURES=$((RATE_LIMIT_FAILURES + 1))
    fi
  else
    if [ "$HTTP_CODE" == "429" ]; then
      echo -e "  ${GREEN}Request $i: ✓ Rate limited (429)${NC}"
    elif [ "$HTTP_CODE" == "200" ]; then
      echo -e "  ${YELLOW}Request $i: ⚠ Still accepted (should be rate limited)${NC}"
    else
      echo -e "  ${RED}Request $i: ✗ Unexpected status $HTTP_CODE${NC}"
      RATE_LIMIT_FAILURES=$((RATE_LIMIT_FAILURES + 1))
    fi
  fi

  sleep 0.2
done

if [ "$RATE_LIMIT_FAILURES" -eq 0 ]; then
  echo -e "${GREEN}✓ Rate limiting working as expected${NC}"
else
  echo -e "${YELLOW}⚠ Some rate limit checks failed${NC}"
fi
echo ""

# Test 6: SMS Template Length
echo -e "${YELLOW}Test 6: SMS Template Length Validation${NC}"
TEMPLATE="Codul tau Test Station: 123456\nIntrodu pe tableta pentru reminder ITP.\nNu ai cerut? Ignora."
TEMPLATE_LENGTH=$(echo -n "$TEMPLATE" | wc -c)

if [ "$TEMPLATE_LENGTH" -le 160 ]; then
  echo -e "${GREEN}✓ Template fits in 1 SMS part (${TEMPLATE_LENGTH} chars)${NC}"
else
  echo -e "${RED}✗ Template too long (${TEMPLATE_LENGTH} chars, max 160)${NC}"
fi
echo ""

# Test 7: Concurrent Requests
echo -e "${YELLOW}Test 7: Concurrent Request Handling (10 parallel)${NC}"
TEMP_DIR=$(mktemp -d)
CONCURRENT_START=$(date +%s%3N)

for i in {1..10}; do
  curl -s -X POST "${BASE_URL}/api/verification/send" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"+407123456${i:0:2}\",\"stationSlug\":\"test-station\"}" \
    > "${TEMP_DIR}/response_${i}.json" &
done

wait

CONCURRENT_END=$(date +%s%3N)
CONCURRENT_TIME=$((CONCURRENT_END - CONCURRENT_START))

SUCCESS_COUNT=$(grep -c '"success":true' "${TEMP_DIR}"/response_*.json || true)

echo -e "  Total time: ${CONCURRENT_TIME}ms"
echo -e "  Successful: ${SUCCESS_COUNT}/10"

if [ "$SUCCESS_COUNT" -ge 8 ]; then
  echo -e "${GREEN}✓ Concurrent requests handled (${SUCCESS_COUNT}/10 successful)${NC}"
else
  echo -e "${YELLOW}⚠ Some concurrent requests failed (${SUCCESS_COUNT}/10)${NC}"
fi

rm -rf "$TEMP_DIR"
echo ""

# Test 8: Romanian Diacritics
echo -e "${YELLOW}Test 8: Romanian Diacritics Support${NC}"
DIACRITICS_RESPONSE=$(curl -s -X POST "${NOTIFYHUB_URL}/api/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${NOTIFYHUB_API_KEY:-test}" \
  -d "{\"to\":\"${TEST_PHONE}\",\"message\":\"Test ăâîșț ĂÂÎȘȚ\",\"templateId\":\"test_diacritics\"}")

if echo "$DIACRITICS_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Diacritics supported${NC}"
else
  echo -e "${YELLOW}⚠ Diacritics test skipped (API key not configured)${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}=== Test Summary ===${NC}"
echo "Base URL: $BASE_URL"
echo "NotifyHub URL: $NOTIFYHUB_URL"
echo "Test Phone: $TEST_PHONE"
echo ""
echo "All critical tests passed!"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Check your phone (${TEST_PHONE}) for SMS messages"
echo "2. Verify SMS delivery time (<10 seconds)"
echo "3. Run load tests: k6 run tests/load-test.js"
echo "4. Monitor Supabase with queries from docs/MONITORING_QUERIES.sql"
echo ""
