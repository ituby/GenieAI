#!/bin/bash

# =============================================================================
# Stripe Payment System - Setup Script
# =============================================================================
# סקריפט להתקנה מהירה של מערכת התשלומים
# 
# Usage: ./setup-stripe.sh
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "לא נמצא package.json. אנא הרץ את הסקריפט מתיקיית genie/"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Stripe Payment System - Setup                     ║"
echo "║   GenieAI                                            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# Step 1: Check prerequisites
# =============================================================================
print_step "בודק דרישות מקדימות..."

if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI לא מותקן"
    echo "התקן עם: brew install supabase/tap/supabase"
    exit 1
fi
print_success "Supabase CLI מותקן"

if ! command -v stripe &> /dev/null; then
    print_warning "Stripe CLI לא מותקן (אופציונלי)"
    echo "להתקנה: brew install stripe/stripe-cli/stripe"
else
    print_success "Stripe CLI מותקן"
fi

# =============================================================================
# Step 2: Run database migration
# =============================================================================
echo ""
print_step "מריץ migration למסד הנתונים..."

cd supabase

if supabase db push; then
    print_success "Migration הושלם בהצלחה"
else
    print_error "Migration נכשל"
    exit 1
fi

# =============================================================================
# Step 3: Deploy Edge Functions
# =============================================================================
echo ""
print_step "מעלה Edge Functions..."

FUNCTIONS=("stripe-webhook" "create-checkout" "manage-subscription-advanced")

for func in "${FUNCTIONS[@]}"; do
    print_step "מעלה $func..."
    if supabase functions deploy "$func" --no-verify-jwt; then
        print_success "$func הועלה בהצלחה"
    else
        print_error "העלאת $func נכשלה"
        exit 1
    fi
done

cd ..

# =============================================================================
# Step 4: Environment Variables Check
# =============================================================================
echo ""
print_step "בודק environment variables..."

REQUIRED_VARS=("STRIPE_SECRET_KEY" "STRIPE_PUBLISHABLE_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    # Note: This won't actually check Supabase secrets, just inform the user
    echo "  - $var: יש להגדיר ב-Supabase Dashboard"
done

print_warning "ודא שהגדרת את המשתנים הבאים ב-Supabase Dashboard > Settings > Edge Functions > Secrets:"
echo "  - STRIPE_SECRET_KEY"
echo "  - STRIPE_PUBLISHABLE_KEY"
echo "  - STRIPE_WEBHOOK_SECRET (אחרי יצירת webhook ב-Stripe)"

# =============================================================================
# Step 5: Show next steps
# =============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✓ Setup הושלם בהצלחה!                             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

print_step "צעדים הבאים:"
echo ""
echo "1️⃣  הגדר Environment Variables ב-Supabase:"
echo "   Dashboard > Settings > Edge Functions > Secrets"
echo ""
echo "2️⃣  צור Webhook ב-Stripe Dashboard:"
echo "   https://dashboard.stripe.com/test/webhooks"
echo "   URL: https://[YOUR_PROJECT].supabase.co/functions/v1/stripe-webhook"
echo ""
echo "3️⃣  צור Products ב-Stripe Dashboard:"
echo "   https://dashboard.stripe.com/test/products"
echo "   - Basic: \$4.99/month"
echo "   - Standard: \$9.99/month"
echo "   - Premium: \$19.99/month"
echo ""
echo "4️⃣  עדכן Price IDs ב-App:"
echo "   src/services/paymentService.ts"
echo ""
echo "5️⃣  הרץ בדיקות:"
echo "   קרא את STRIPE_TESTING_GUIDE.md"
echo ""

print_success "למדריך מפורט, ראה: STRIPE_QUICKSTART.md"
echo ""

