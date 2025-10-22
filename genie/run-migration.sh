#!/bin/bash

# Script to run Stripe migration
# Usage: ./run-migration.sh

cd /Users/itamartuby/Desktop/GenieAI/genie

echo "🚀 Running Stripe Payment System Migration..."
echo ""
echo "⚠️  You will be prompted for your database password"
echo "   Find it in: Supabase Dashboard > Settings > Database > Database Password"
echo ""

supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Check your tables in Dashboard > Table Editor"
    echo "2. Verify functions in Dashboard > Database > Functions"
else
    echo ""
    echo "❌ Migration failed"
    echo ""
    echo "Alternative: Run via Dashboard"
    echo "1. Go to: https://supabase.com/dashboard/project/mabekpsigcgnszmudxjt/sql"
    echo "2. Copy the SQL from: supabase/migrations/20250122000000_stripe_payment_system.sql"
    echo "3. Paste and run"
fi

