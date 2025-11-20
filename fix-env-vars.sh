#!/bin/bash
# Fix Vercel Environment Variables - Remove Trailing Newlines
# Run this script from the project root directory
# Date: 2025-11-18

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  Fixing Vercel Environment Variables (Removing \n)       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if in correct directory
if [ ! -f "vercel.json" ]; then
    echo -e "${RED}Error: vercel.json not found. Run this script from project root.${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will remove and re-add environment variables.${NC}"
echo -e "${YELLOW}Make sure you're logged in to Vercel CLI (vercel login).${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Environment values (without trailing newlines)
CRON_SECRET="tOcDZJ7VkcRHB5g11FAwQfTykHxyNdVOdvdCleXFfEs="
RESEND_API_KEY="re_A7fxkWFB_9dAfysYrznmK3meRuhcR1ysG"
RESEND_FROM_EMAIL="notificari@uitdeitp.ro"

echo ""
echo "─────────────────────────────────────────────────────────"
echo "Step 1: Removing old environment variables"
echo "─────────────────────────────────────────────────────────"

# Remove old variables from all environments
echo -e "${YELLOW}Removing CRON_SECRET...${NC}"
vercel env rm CRON_SECRET production --yes 2>/dev/null || echo "Not found in production"
vercel env rm CRON_SECRET preview --yes 2>/dev/null || echo "Not found in preview"
vercel env rm CRON_SECRET development --yes 2>/dev/null || echo "Not found in development"

echo -e "${YELLOW}Removing RESEND_API_KEY...${NC}"
vercel env rm RESEND_API_KEY production --yes 2>/dev/null || echo "Not found in production"
vercel env rm RESEND_API_KEY preview --yes 2>/dev/null || echo "Not found in preview"
vercel env rm RESEND_API_KEY development --yes 2>/dev/null || echo "Not found in development"

echo -e "${YELLOW}Removing RESEND_FROM_EMAIL...${NC}"
vercel env rm RESEND_FROM_EMAIL production --yes 2>/dev/null || echo "Not found in production"
vercel env rm RESEND_FROM_EMAIL preview --yes 2>/dev/null || echo "Not found in preview"
vercel env rm RESEND_FROM_EMAIL development --yes 2>/dev/null || echo "Not found in development"

echo -e "${GREEN}✓ Old variables removed${NC}"
echo ""

echo "─────────────────────────────────────────────────────────"
echo "Step 2: Adding new environment variables (without \n)"
echo "─────────────────────────────────────────────────────────"

# Add CRON_SECRET (all environments)
echo -e "${YELLOW}Adding CRON_SECRET...${NC}"
echo -n "$CRON_SECRET" | vercel env add CRON_SECRET production
echo -n "$CRON_SECRET" | vercel env add CRON_SECRET preview
echo -n "$CRON_SECRET" | vercel env add CRON_SECRET development
echo -e "${GREEN}✓ CRON_SECRET added${NC}"

# Add RESEND_API_KEY (production only)
echo -e "${YELLOW}Adding RESEND_API_KEY...${NC}"
echo -n "$RESEND_API_KEY" | vercel env add RESEND_API_KEY production
echo -n "$RESEND_API_KEY" | vercel env add RESEND_API_KEY preview
echo -n "$RESEND_API_KEY" | vercel env add RESEND_API_KEY development
echo -e "${GREEN}✓ RESEND_API_KEY added${NC}"

# Add RESEND_FROM_EMAIL (production only)
echo -e "${YELLOW}Adding RESEND_FROM_EMAIL...${NC}"
echo -n "$RESEND_FROM_EMAIL" | vercel env add RESEND_FROM_EMAIL production
echo -n "$RESEND_FROM_EMAIL" | vercel env add RESEND_FROM_EMAIL preview
echo -n "$RESEND_FROM_EMAIL" | vercel env add RESEND_FROM_EMAIL development
echo -e "${GREEN}✓ RESEND_FROM_EMAIL added${NC}"

echo ""
echo "─────────────────────────────────────────────────────────"
echo "Step 3: Verification"
echo "─────────────────────────────────────────────────────────"

# Pull environment variables to verify
echo -e "${YELLOW}Pulling environment variables...${NC}"
vercel env pull .env.verify

# Check for trailing newlines
echo -e "${YELLOW}Checking for trailing newlines...${NC}"
if grep -q '\\n' .env.verify; then
    echo -e "${RED}✗ WARNING: Still found \\n in variables!${NC}"
    echo "Please check .env.verify file"
else
    echo -e "${GREEN}✓ No trailing newlines found${NC}"
fi

# Show environment variables
echo ""
echo "Current environment variables:"
cat .env.verify | grep -E "^(CRON_SECRET|RESEND_API_KEY|RESEND_FROM_EMAIL)=" || true

# Cleanup
rm .env.verify

echo ""
echo "─────────────────────────────────────────────────────────"
echo "Step 4: Redeploy to Production"
echo "─────────────────────────────────────────────────────────"

read -p "Deploy to production now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deploying to production...${NC}"
    vercel --prod
    echo -e "${GREEN}✓ Deployment started${NC}"
else
    echo -e "${YELLOW}Skipped deployment. Run 'vercel --prod' manually when ready.${NC}"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  Environment Variables Fixed Successfully!                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Next Steps:"
echo "1. Wait for deployment to complete"
echo "2. Test cron endpoint:"
echo "   curl -X POST https://uitdeitp-app-standalone.vercel.app/api/cron/process-reminders \\"
echo "     -H \"Authorization: Bearer $CRON_SECRET\" \\"
echo "     -H \"Content-Type: application/json\""
echo ""
echo "3. Monitor logs:"
echo "   vercel logs uitdeitp-app-standalone.vercel.app --grep \"Cron\""
echo ""
echo "4. Check next scheduled run: Tomorrow 07:00 UTC (09:00 EET)"
echo ""
