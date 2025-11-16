#!/bin/bash
# Fix Script 3: Remove status column usage, use deleted_at for soft deletes
# Critical Issue: Non-existent column in reminders table
# Severity: PRODUCTION BLOCKER
# Estimated Time: 1 hour

set -e  # Exit on error

echo "================================================"
echo "Fix Script 3: Remove 'status' column usage"
echo "Use 'deleted_at' for soft deletes instead"
echo "================================================"
echo ""

# Define files to fix
FILES=(
  "src/app/api/reminders/create/route.ts"
  "src/app/api/reminders/route.ts"
  "src/app/api/reminders/[id]/route.ts"
)

# Backup directory
BACKUP_DIR="audit-reports/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Step 1: Creating backups..."
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    cp "$file" "$BACKUP_DIR/$(basename $file)"
    echo "  ✓ Backed up: $file"
  else
    echo "  ⚠ File not found: $file"
  fi
done
echo ""

echo "Step 2: Applying fixes..."
echo ""

# Fix 1: src/app/api/reminders/create/route.ts
echo "Fixing: src/app/api/reminders/create/route.ts"
if [ -f "src/app/api/reminders/create/route.ts" ]; then
  # Line 48: .eq('status', 'active') → .is('deleted_at', null)
  sed -i "s/.eq('status', 'active')/.is('deleted_at', null)/g" "src/app/api/reminders/create/route.ts"

  # Line 73: Remove status: 'active' from insert
  sed -i "/status: 'active',/d" "src/app/api/reminders/create/route.ts"

  echo "  ✓ Fixed query filter (line 48): .eq('status', 'active') → .is('deleted_at', null)"
  echo "  ✓ Removed status field from insert (line 73)"
else
  echo "  ⚠ File not found"
fi
echo ""

# Fix 2: src/app/api/reminders/route.ts
echo "Fixing: src/app/api/reminders/route.ts"
if [ -f "src/app/api/reminders/route.ts" ]; then
  # Remove status query parameter handling (lines 35, 57-58)
  # This is more complex - show manual instructions
  echo "  ⚠ MANUAL FIX REQUIRED for src/app/api/reminders/route.ts:"
  echo ""
  echo "    Line 35: Remove: const status = searchParams.get('status');"
  echo "    Lines 57-58: Remove status filter block:"
  echo "      if (status) {"
  echo "        query = query.eq('status', status);"
  echo "      }"
  echo ""
  echo "    Replace with:"
  echo "      // Filter only active reminders (not soft-deleted)"
  echo "      query = query.is('deleted_at', null);"
  echo ""
  echo "    Line 156: Remove: status: 'pending',"
  echo ""
else
  echo "  ⚠ File not found"
fi
echo ""

# Fix 3: src/app/api/reminders/[id]/route.ts
echo "Fixing: src/app/api/reminders/[id]/route.ts"
if [ -f "src/app/api/reminders/[id]/route.ts" ]; then
  # Line 167: .update({ status: 'deleted', ...}) → .update({ deleted_at: new Date().toISOString(), ...})
  sed -i "s/status: 'deleted'/deleted_at: new Date().toISOString()/g" "src/app/api/reminders/[id]/route.ts"

  echo "  ✓ Fixed soft delete (line 167): status: 'deleted' → deleted_at: timestamp"
else
  echo "  ⚠ File not found"
fi
echo ""

echo "================================================"
echo "Fix Complete (with manual steps required)"
echo "================================================"
echo ""
echo "Backups saved to: $BACKUP_DIR"
echo ""
echo "⚠️  IMPORTANT: Manual fixes required for src/app/api/reminders/route.ts"
echo "See instructions above."
echo ""
echo "Pattern to follow:"
echo "  ❌ WRONG: .eq('status', 'active')"
echo "  ✅ CORRECT: .is('deleted_at', null)"
echo ""
echo "  ❌ WRONG: .update({ status: 'deleted' })"
echo "  ✅ CORRECT: .update({ deleted_at: new Date().toISOString() })"
echo ""
echo "Next steps:"
echo "  1. Apply manual fixes to src/app/api/reminders/route.ts"
echo "  2. Review changes with: git diff"
echo "  3. Run tests: npm run test"
echo "  4. Test reminder CRUD operations manually"
echo "  5. Verify soft delete works (reminders appear deleted but still in DB)"
echo "  6. If successful, commit: git commit -m 'fix: Remove status column, use deleted_at for soft deletes'"
echo ""
echo "To rollback, restore from: $BACKUP_DIR"
echo ""
