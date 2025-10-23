#!/bin/bash

# ============================================================================
# Stripe Payment Test Script
# ============================================================================
# סקריפט לבדיקה מהירה של מערכת התשלומים
# ============================================================================

export STRIPE_API_KEY=sk_test_51SKnxn9mCMmqa2BSfBCnAlJx0gugq1YaeD2o8ofVBNKbZtxmHoP2mIMJrfoTKIbG3dZUWloVwKZWJfF6PzeptJwF0089UdDLZ3

echo "╔══════════════════════════════════════════════════════╗"
echo "║   🧪 Stripe Payment System - Quick Test             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# 1. בדוק Products
# ============================================================================
echo "📦 בודק Products..."
echo ""

stripe products list --limit 3

echo ""
echo "---"
echo ""

# ============================================================================
# 2. בדוק Prices
# ============================================================================
echo "💰 בודק Prices..."
echo ""

stripe prices list --limit 3

echo ""
echo "---"
echo ""

# ============================================================================
# 3. בדוק Webhooks
# ============================================================================
echo "🔗 בודק Webhooks..."
echo ""

stripe webhook_endpoints list

echo ""
echo "---"
echo ""

# ============================================================================
# 4. שלח Test Webhook
# ============================================================================
echo "🧪 שולח test webhook..."
echo ""

stripe trigger checkout.session.completed

echo ""
echo "---"
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "✅ בדיקה הושלמה!"
echo ""
echo "📋 סיכום Price IDs שלך:"
echo "   Basic:    price_1SL0uz9mCMmqa2BSombHKoR7"
echo "   Standard: price_1SL0vF9mCMmqa2BSSDnNUCym"
echo "   Premium:  price_1SL0vU9mCMmqa2BSBedO3lAr"
echo ""
echo "🔗 Webhook URL:"
echo "   https://mabekpsigcgnszmudxjt.supabase.co/functions/v1/stripe-webhook"
echo ""
echo "📚 לבדיקות מקיפות, קרא:"
echo "   STRIPE_TESTING_GUIDE.md"
echo ""





