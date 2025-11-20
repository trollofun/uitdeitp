#!/bin/bash

# Notification Flow Test Suite Runner
# Runs all tests and generates comprehensive report

set -e

echo "================================================"
echo "Notification Flow End-to-End Test Suite"
echo "================================================"
echo ""

# Check environment variables
echo "Checking environment variables..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL not set"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "ERROR: SUPABASE_SERVICE_ROLE_KEY not set"
  exit 1
fi

if [ -z "$CRON_SECRET" ]; then
  echo "WARNING: CRON_SECRET not set (using default for tests)"
  export CRON_SECRET="test-secret-key"
fi

echo "Environment variables OK"
echo ""

# Make sure dev server is running
echo "Checking if dev server is running..."
if ! curl -s http://localhost:3000/api/test-simple > /dev/null; then
  echo "ERROR: Dev server not running at http://localhost:3000"
  echo "Please run 'npm run dev' in another terminal"
  exit 1
fi
echo "Dev server is running"
echo ""

# Create results directory
RESULTS_DIR="./test-results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "Test results will be saved to: $RESULTS_DIR"
echo ""

# Run unit tests
echo "================================================"
echo "Running Unit Tests"
echo "================================================"
echo ""

echo "1. Date Calculations Tests..."
npx jest tests/notification-flow/unit/date-calculations.test.ts --json --outputFile="$RESULTS_DIR/unit-date.json" || true

echo ""
echo "2. Notification Interval Tests..."
npx jest tests/notification-flow/unit/notification-intervals.test.ts --json --outputFile="$RESULTS_DIR/unit-intervals.json" || true

echo ""

# Run integration tests
echo "================================================"
echo "Running Integration Tests"
echo "================================================"
echo ""

echo "3. Cron Endpoint Tests..."
npx jest tests/notification-flow/integration/cron-endpoint.test.ts --json --outputFile="$RESULTS_DIR/integration-cron.json" --testTimeout=70000 || true

echo ""
echo "4. Reminder Processor Tests..."
npx jest tests/notification-flow/integration/reminder-processor.test.ts --json --outputFile="$RESULTS_DIR/integration-processor.json" --testTimeout=35000 || true

echo ""
echo "5. NotifyHub Integration Tests..."
npx jest tests/notification-flow/integration/notifyhub.test.ts --json --outputFile="$RESULTS_DIR/integration-notifyhub.json" --testTimeout=20000 || true

echo ""

# Run edge case tests
echo "================================================"
echo "Running Edge Case Tests"
echo "================================================"
echo ""

echo "6. Duplicate Reminders Tests..."
npx jest tests/notification-flow/edge-cases/duplicate-reminders.test.ts --json --outputFile="$RESULTS_DIR/edge-duplicates.json" --testTimeout=35000 || true

echo ""
echo "7. Expired Reminders Tests..."
npx jest tests/notification-flow/edge-cases/expired-reminders.test.ts --json --outputFile="$RESULTS_DIR/edge-expired.json" --testTimeout=35000 || true

echo ""
echo "8. Missing Data Tests..."
npx jest tests/notification-flow/edge-cases/missing-data.test.ts --json --outputFile="$RESULTS_DIR/edge-missing.json" --testTimeout=35000 || true

echo ""

# Generate report
echo "================================================"
echo "Generating Test Report"
echo "================================================"
echo ""

node tests/notification-flow/generate-report.js "$RESULTS_DIR"

echo ""
echo "================================================"
echo "Test Suite Complete!"
echo "================================================"
echo ""
echo "View results at: $RESULTS_DIR/report.txt"
echo "View HTML report at: $RESULTS_DIR/report.html"
echo ""
