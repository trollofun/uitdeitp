#!/bin/bash
# Schema Verification Script
# Run this to verify all migrations and documentation are in place

echo "================================================"
echo "Database Schema Verification"
echo "================================================"
echo ""

# Check migration files
echo "✓ Checking migration files..."
migrations=(
  "002_unified_reminders.sql"
  "003_kiosk_stations.sql"
  "004_notification_log.sql"
  "005_cleanup_and_utilities.sql"
)

for migration in "${migrations[@]}"; do
  if [ -f "supabase/migrations/$migration" ]; then
    size=$(ls -lh "supabase/migrations/$migration" | awk '{print $5}')
    echo "  ✅ $migration ($size)"
  else
    echo "  ❌ $migration (NOT FOUND)"
  fi
done

echo ""
echo "✓ Checking documentation files..."
docs=(
  "database-schema-v2.md"
  "migration-guide.md"
  "DATABASE_ARCHITECT_DELIVERABLES.md"
)

for doc in "${docs[@]}"; do
  if [ -f "docs/$doc" ]; then
    size=$(ls -lh "docs/$doc" | awk '{print $5}')
    echo "  ✅ $doc ($size)"
  else
    echo "  ❌ $doc (NOT FOUND)"
  fi
done

echo ""
echo "✓ Checking TypeScript types..."
if [ -f "src/types/database.types.ts" ]; then
  size=$(ls -lh "src/types/database.types.ts" | awk '{print $5}')
  echo "  ✅ database.types.ts ($size)"
else
  echo "  ❌ database.types.ts (NOT FOUND)"
fi

echo ""
echo "================================================"
echo "Verification Complete!"
echo "================================================"
echo ""
echo "Next Steps:"
echo "1. Review docs/database-schema-v2.md"
echo "2. Review docs/migration-guide.md"
echo "3. Backup database: npx supabase db dump > backup.sql"
echo "4. Apply migrations: npx supabase migration up"
echo "5. Generate types: npx supabase gen types typescript --local"
echo ""
