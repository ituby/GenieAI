# ⚡ Stripe Payment - Quick Start Guide

מדריך מהיר להתחלת עבודה עם מערכת התשלומים.

---

## ✅ Checklist - מה לעשות עכשיו

### שלב 1: הגדרת Database (5 דקות)

```bash
cd /Users/itamartuby/Desktop/GenieAI/genie/supabase

# הרץ את ה-migration
supabase db push

# או דרך Supabase Dashboard:
# SQL Editor > New Query > העתק את migrations/20250122000000_stripe_payment_system.sql
```

**תוצאה צפויה:** טבלאות חדשות נוצרו (`stripe_customers`, `subscriptions`, `payments`, `payment_notifications`, `token_balance_history`)

---

### שלב 2: הגדרת Environment Variables ב-Supabase (2 דקות)

Supabase Dashboard > Settings > Edge Functions > Secrets

הוסף:
```
STRIPE_SECRET_KEY=sk_test_51SKnxn9mCMmqa2BSfBCnAlJx0gugq1YaeD2o8ofVBNKbZtxmHoP2mIMJrfoTKIbG3dZUWloVwKZWJfF6PzeptJwF0089UdDLZ3

STRIPE_PUBLISHABLE_KEY=pk_test_51SKnxn9mCMmqa2BS8WKOYcdLMdy0RySS2vuJ9RukkvloLUXlg68ZFBaPbznlzCOajHb7eSeiKj1xwlbchHKei6Kh00sKsdrzmh
```

*Note: STRIPE_WEBHOOK_SECRET יתווסף בשלב 4*

---

### שלב 3: Deploy Edge Functions (3 דקות)

```bash
cd /Users/itamartuby/Desktop/GenieAI/genie/supabase

# Deploy all Stripe functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout
supabase functions deploy manage-subscription-advanced
```

**בדיקה:** לך ל-Supabase Dashboard > Edge Functions - אתה אמור לראות 3 functions חדשות.

---

### שלב 4: הגדרת Stripe Webhook (5 דקות)

1. **קבל את ה-URL של ה-webhook שלך:**
   ```
   https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/functions/v1/stripe-webhook
   ```
   
   מצא את `YOUR_SUPABASE_PROJECT_REF` ב-Supabase Dashboard > Settings > General > Reference ID

2. **צור webhook ב-Stripe:**
   - לך ל-[Stripe Dashboard > Webhooks](https://dashboard.stripe.com/test/webhooks)
   - לחץ "Add endpoint"
   - Endpoint URL: הדבק את ה-URL מלמעלה
   - Select events to listen to: בחר:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `charge.refunded`

3. **שמור את ה-Webhook Secret:**
   - אחרי יצירת ה-webhook, לחץ עליו
   - Signing secret > Click to reveal
   - העתק את ה-secret (מתחיל ב-`whsec_...`)
   - חזור ל-Supabase Dashboard > Settings > Edge Functions > Secrets
   - הוסף:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_...
     ```

---

### שלב 5: יצירת Products ב-Stripe (5 דקות)

לך ל-[Stripe Dashboard > Products](https://dashboard.stripe.com/test/products)

**צור 3 products:**

1. **Genie Basic**
   - Name: Genie Basic
   - Description: 500 tokens per month
   - Price: $4.99
   - Billing period: Monthly
   - שמור את ה-`price_id` (מתחיל ב-`price_...`)

2. **Genie Standard**
   - Name: Genie Standard
   - Description: 1000 tokens per month
   - Price: $9.99
   - Billing period: Monthly
   - שמור את ה-`price_id`

3. **Genie Premium**
   - Name: Genie Premium
   - Description: 2500 tokens per month
   - Price: $19.99
   - Billing period: Monthly
   - שמור את ה-`price_id`

---

### שלב 6: עדכון Price IDs ב-App (2 דקות)

פתח: `/Users/itamartuby/Desktop/GenieAI/genie/src/services/paymentService.ts`

עדכן את ה-`priceId` בכל tier:

```typescript
getSubscriptionTiers() {
  return [
    {
      id: 'basic',
      name: 'Basic',
      priceId: 'price_xxxxx1', // <-- שים כאן את ה-price_id של Basic
      // ...
    },
    {
      id: 'standard',
      name: 'Standard',
      priceId: 'price_xxxxx2', // <-- שים כאן את ה-price_id של Standard
      // ...
    },
    {
      id: 'premium',
      name: 'Premium',
      priceId: 'price_xxxxx3', // <-- שים כאן את ה-price_id של Premium
      // ...
    },
  ];
}
```

---

## 🧪 בדיקה מהירה (5 דקות)

### Test 1: רכישת טוקנים

```bash
# קח את ה-user token שלך (מהאפליקציה או מ-Supabase Auth)
export USER_TOKEN="eyJhbGciOiJI..."
export PROJECT_REF="your-project-ref"

# צור checkout session
curl -X POST "https://${PROJECT_REF}.supabase.co/functions/v1/create-checkout" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "tokens",
    "amount": 100
  }'
```

אמור לקבל תשובה עם `url` ל-Stripe Checkout.

פתח את ה-URL בדפדפן ותשלם עם:
- כרטיס: `4242 4242 4242 4242`
- תוקף: `12/34`
- CVV: `123`

### Test 2: בדיקת Webhook

אחרי התשלום:
1. לך ל-Stripe Dashboard > Webhooks > [Your webhook] > Events
2. אמור לראות `checkout.session.completed` עם ✓ ירוק

### Test 3: בדיקת DB

```sql
-- ב-Supabase SQL Editor
SELECT * FROM payments ORDER BY created_at DESC LIMIT 1;
SELECT * FROM token_balance_history ORDER BY created_at DESC LIMIT 3;
SELECT tokens_remaining FROM user_tokens WHERE user_id = '[YOUR_USER_ID]';
```

אמור לראות:
- תשלום חדש ב-`payments` עם status `succeeded`
- רשומה ב-`token_balance_history` עם `+100`
- `tokens_remaining` גדל ב-100

---

## 📚 המשך קריאה

כל המערכת מוכנה! עכשיו תוכל:

1. **לבצע בדיקות מקיפות:** קרא את [STRIPE_TESTING_GUIDE.md](./STRIPE_TESTING_GUIDE.md)
2. **להבין את המערכת:** קרא את [STRIPE_INTEGRATION_README.md](./STRIPE_INTEGRATION_README.md)
3. **להשתמש ב-Components:** השתמש ב-`TokenPurchaseModal` ו-`SubscriptionManagementModal`

---

## 🎯 הבא

רשימת משימות לפני production:

- [ ] בדיקת כל התרחישים מ-STRIPE_TESTING_GUIDE.md
- [ ] הוספת מחירים אמיתיים
- [ ] הוספת Terms of Service
- [ ] הוספת Privacy Policy
- [ ] בדיקת אבטחה (RLS policies)
- [ ] הגדרת monitoring/alerts
- [ ] השלמת Stripe Atlas והעברה ל-Live mode

---

## ⚠️ חשוב לזכור

1. **אלה test keys** - אל תעבור ל-production עד שאתה מוכן
2. **Webhooks חייבים לעבוד** - בלי webhooks, טוקנים לא יתווספו
3. **שמור backup** של כל ה-price IDs ו-secrets
4. **בדוק את ה-logs** אם משהו לא עובד:
   ```bash
   supabase functions logs stripe-webhook --tail
   ```

---

**🚀 בהצלחה עם הבדיקות!**

אם יש בעיות, בדוק את:
1. Logs ב-Supabase: `supabase functions logs stripe-webhook`
2. Events ב-Stripe Dashboard > Webhooks
3. FAQ ב-STRIPE_INTEGRATION_README.md

