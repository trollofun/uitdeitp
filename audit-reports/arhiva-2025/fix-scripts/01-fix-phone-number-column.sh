#!/bin/bash
# Fix Script 1: Replace phone_number with guest_phone in reminders table queries
# Critical Issue: Database column mismatch
# Severity: PRODUCTION BLOCKER
# Estimated Time: 30 minutes

set -e  # Exit on error

echo "========================================="
echo "Fix Script 1: phone_number → guest_phone"
echo "========================================="
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
  # Line 47: .eq('phone_number', ...) → .eq('guest_phone', ...)
  sed -i "s/.eq('phone_number', user.phone || user.email)/.eq('guest_phone', user.phone || user.email)/g" "src/app/api/reminders/create/route.ts"

  # Line 65: phone_number: → guest_phone:
  sed -i "s/phone_number: user.phone || user.email,/guest_phone: user.phone || user.email,/g" "src/app/api/reminders/create/route.ts"

  echo "  ✓ Fixed .eq() query (line 47)"
  echo "  ✓ Fixed insert field (line 65)"
else
  echo "  ⚠ File not found"
fi
echo ""

# Fix 2: src/app/api/reminders/[id]/route.ts
echo "Fixing: src/app/api/reminders/[id]/route.ts"
if [ -f "src/app/api/reminders/[id]/route.ts" ]; then
  # Lines 36, 82, 160: reminder.phone_number → reminder.guest_phone
  sed -i "s/reminder\.phone_number/reminder.guest_phone/g" "src/app/api/reminders/[id]/route.ts"
  sed -i "s/existingReminder\.phone_number/existingReminder.guest_phone/g" "src/app/api/reminders/[id]/route.ts"

  echo "  ✓ Fixed reminder.phone_number references (lines 36, 82, 160)"
else
  echo "  ⚠ File not found"
fi
echo ""

# Fix 3: src/app/api/notifications/send-bulk-sms/route.ts
echo "Fixing: src/app/api/notifications/send-bulk-sms/route.ts"
if [ -f "src/app/api/notifications/send-bulk-sms/route.ts" ]; then
  # Line 71: .select('id, phone_number, ...') → .select('id, guest_phone, ...')
  sed -i "s/.select('id, phone_number, plate_number, reminder_type, itp_expiry_date')/.select('id, guest_phone, plate_number, reminder_type, expiry_date')/g" "src/app/api/notifications/send-bulk-sms/route.ts"

  # Lines 104, 110, 128: reminder.phone_number → reminder.guest_phone
  sed -i "s/reminder\.phone_number/reminder.guest_phone/g" "src/app/api/notifications/send-bulk-sms/route.ts"

  echo "  ✓ Fixed .select() query (line 71)"
  echo "  ✓ Fixed reminder.phone_number references (lines 104, 110, 128)"
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
echo "  2. Run tests: npm run test"
echo "  3. Test reminder creation manually"
echo "  4. If successful, commit: git commit -m 'fix: Replace phone_number with guest_phone in reminders queries'"
echo ""
echo "To rollback, restore from: $BACKUP_DIR"
echo ""
