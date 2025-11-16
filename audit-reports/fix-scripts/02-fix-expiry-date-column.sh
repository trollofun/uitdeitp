#!/bin/bash
# Fix Script 2: Replace itp_expiry_date with expiry_date in reminders table queries
# Critical Issue: Database column mismatch
# Severity: PRODUCTION BLOCKER
# Estimated Time: 30 minutes

set -e  # Exit on error

echo "=========================================="
echo "Fix Script 2: itp_expiry_date → expiry_date"
echo "=========================================="
echo ""

# Define files to fix
FILES=(
  "src/app/api/reminders/create/route.ts"
  "src/app/api/reminders/[id]/route.ts"
  "src/app/api/notifications/send-bulk-sms/route.ts"
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
  # Replace all occurrences of itp_expiry_date with expiry_date
  sed -i "s/itp_expiry_date/expiry_date/g" "src/app/api/reminders/create/route.ts"

  echo "  ✓ Fixed all itp_expiry_date references (lines 23, 26, 34, 67)"
else
  echo "  ⚠ File not found"
fi
echo ""

# Fix 2: src/app/api/reminders/[id]/route.ts
echo "Fixing: src/app/api/reminders/[id]/route.ts"
if [ -f "src/app/api/reminders/[id]/route.ts" ]; then
  # Replace all occurrences
  sed -i "s/itp_expiry_date/expiry_date/g" "src/app/api/reminders/[id]/route.ts"

  echo "  ✓ Fixed all itp_expiry_date references (lines 88, 91, 92, 103)"
else
  echo "  ⚠ File not found"
fi
echo ""

# Fix 3: src/app/api/notifications/send-bulk-sms/route.ts
echo "Fixing: src/app/api/notifications/send-bulk-sms/route.ts"
if [ -f "src/app/api/notifications/send-bulk-sms/route.ts" ]; then
  # Already fixed in script 01, but apply again to be safe
  sed -i "s/itp_expiry_date/expiry_date/g" "src/app/api/notifications/send-bulk-sms/route.ts"

  echo "  ✓ Fixed all itp_expiry_date references (lines 71, 118)"
else
  echo "  ⚠ File not found"
fi
echo ""

echo "========================================="
echo "Fix Complete!"
echo "========================================="
echo ""
echo "Backups saved to: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "  1. Review changes with: git diff"
echo "  2. Update frontend forms to use 'expiry_date' field name"
echo "  3. Run tests: npm run test"
echo "  4. Test reminder creation and updates manually"
echo "  5. If successful, commit: git commit -m 'fix: Replace itp_expiry_date with expiry_date in reminders queries'"
echo ""
echo "To rollback, restore from: $BACKUP_DIR"
echo ""
