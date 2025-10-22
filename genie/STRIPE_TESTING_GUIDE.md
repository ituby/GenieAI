# 🧪 מדריך בדיקות Stripe - GenieAI Payment System

> **שימו לב:** כל הבדיקות הללו מיועדות לסביבת TEST בלבד!  
> יש להשתמש ב-Test API Keys שמתחילים ב-`sk_test_` ו-`pk_test_`

---

## 📋 תוכן עניינים

1. [הגדרות ראשוניות](#הגדרות-ראשוניות)
2. [בדיקה 1: Checkout - רכישת טוקנים](#בדיקה-1-checkout---רכישת-טוקנים)
3. [בדיקה 2: Subscription Flow - מנוי חודשי](#בדיקה-2-subscription-flow---מנוי-חודשי)
4. [בדיקה 3: Token Top-Up - טעינת טוקנים](#בדיקה-3-token-top-up---טעינת-טוקנים)
5. [בדיקה 4: Failed Payment - תשלום שנכשל](#בדיקה-4-failed-payment---תשלום-שנכשל)
6. [בדיקה 5: End-to-End עם Webhooks](#בדיקה-5-end-to-end-עם-webhooks)
7. [כרטיסי מבחן של Stripe](#כרטיסי-מבחן-של-stripe)
8. [פתרון בעיות נפוצות](#פתרון-בעיות-נפוצות)

---

## 🔧 הגדרות ראשוניות

### 1. הגדרת API Keys

עדכן את ה-environment variables ב-Supabase:

```bash
# ב-Supabase Dashboard > Settings > Edge Functions > Secrets

STRIPE_SECRET_KEY=sk_test_51SKnxn9mCMmqa2BSfBCnAlJx0gugq1YaeD2o8ofVBNKbZtxmHoP2mIMJrfoTKIbG3dZUWloVwKZWJfF6PzeptJwF0089UdDLZ3
STRIPE_PUBLISHABLE_KEY=pk_test_51SKnxn9mCMmqa2BS8WKOYcdLMdy0RySS2vuJ9RukkvloLUXlg68ZFBaPbznlzCOajHb7eSeiKj1xwlbchHKei6Kh00sKsdrzmh
STRIPE_WEBHOOK_SECRET=whsec_... # נוצר אחרי הגדרת ה-webhook
```

### 2. הגדרת Webhook Endpoint

1. עבור ל-[Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. לחץ על "Add endpoint"
3. הזן את ה-URL:
   ```
   https://[YOUR_SUPABASE_PROJECT].supabase.co/functions/v1/stripe-webhook
   ```
4. בחר את האירועים הבאים:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.refunded`

5. שמור את ה-**Signing secret** (`whsec_...`) ב-environment variables

### 3. הרצת Migration

הרץ את ה-migration כדי ליצור את הטבלאות:

```bash
cd genie/supabase
supabase db push
```

או דרך Supabase Dashboard:
1. SQL Editor > New Query
2. העתק את התוכן מ-`migrations/20250122000000_stripe_payment_system.sql`
3. הרץ את ה-query

---

## בדיקה 1: Checkout - רכישת טוקנים

### מטרה
לבדוק את תהליך יצירת session לרכישת טוקנים והפעלת webhook כשהתשלום הושלם.

### שלבים

#### שלב 1: יצירת Checkout Session

```bash
# קריאה ל-Edge Function
curl -X POST https://[YOUR_PROJECT].supabase.co/functions/v1/create-checkout \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "tokens",
    "amount": 100
  }'
```

תקבל תשובה:
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "requestId": "..."
}
```

#### שלב 2: השלמת התשלום

1. פתח את ה-`url` שקיבלת בדפדפן
2. השתמש בכרטיס מבחן:
   - מספר כרטיס: `4242 4242 4242 4242`
   - תוקף: כל תאריך עתידי
   - CVV: כל 3 ספרות
   - ZIP: כל ZIP
3. השלם את התשלום

#### שלב 3: בדיקת Webhook

בדוק ב-Stripe Dashboard > Developers > Webhooks > [Your webhook] > Events

אמור לראות:
- ✅ `checkout.session.completed`
- ✅ `payment_intent.succeeded`

#### שלב 4: בדיקת DB

```sql
-- בדוק שהטוקנים נוספו
SELECT * FROM user_tokens WHERE user_id = '[USER_ID]';

-- בדוק שהתשלום נרשם
SELECT * FROM payments WHERE user_id = '[USER_ID]' ORDER BY created_at DESC LIMIT 1;

-- בדוק את ההיסטוריה
SELECT * FROM token_balance_history WHERE user_id = '[USER_ID]' ORDER BY created_at DESC LIMIT 3;
```

### תוצאה צפויה
- ✅ Checkout session נוצר
- ✅ Webhook התקבל
- ✅ 100 טוקנים נוספו ל-`tokens_remaining`
- ✅ רשומה נוצרה ב-`payments` עם status `succeeded`
- ✅ רשומה נוצרה ב-`token_balance_history`

---

## בדיקה 2: Subscription Flow - מנוי חודשי

### מטרה
לבדוק את כל ה-flow של מנוי: יצירה, חיוב חודשי, ביטול, והחזרה.

### שלב 1: יצירת Product ו-Price ב-Stripe

אם עדיין לא יצרת, צור ב-Stripe Dashboard:

1. Products > Add Product
   - Name: "Genie Monthly Subscription"
   - Description: "1000 tokens per month"
   - Recurring: Monthly
   - Price: $9.99

שמור את ה-`price_id` (מתחיל ב-`price_...`)

### שלב 2: הרשמה למנוי

```bash
curl -X POST https://[YOUR_PROJECT].supabase.co/functions/v1/create-checkout \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subscription",
    "priceId": "price_..."
  }'
```

השלם את התשלום כמו בבדיקה 1.

### שלב 3: בדיקת Subscription

```sql
-- בדוק שהמנוי נוצר
SELECT * FROM subscriptions WHERE user_id = '[USER_ID]';

-- בדוק ש-user_tokens עודכן
SELECT is_subscribed, monthly_tokens FROM user_tokens WHERE user_id = '[USER_ID]';
```

תוצאה צפויה:
```
is_subscribed = true
monthly_tokens = 1000
tokens_remaining = [הטוקנים שהיו + 1000]
```

### שלב 4: סימולציה של חיוב חודשי

ב-Stripe Dashboard:
1. Customers > [Your customer]
2. Subscriptions > [Your subscription]
3. Actions > Update subscription
4. לחץ "Advance billing cycle" (זה ידלג ישירות לחיוב הבא)

בדוק שה-webhook `invoice.payment_succeeded` התקבל ו-1000 טוקנים נוספו.

### שלב 5: בדיקת Proration (שינוי תוכנית)

צור עוד price (למשל $19.99) ואז:

```bash
curl -X POST https://[YOUR_PROJECT].supabase.co/functions/v1/manage-subscription-advanced \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upgrade",
    "newPriceId": "price_...",
    "proration": true
  }'
```

בדוק ב-Stripe Dashboard > Billing > Invoices שנוצר חשבונית proration.

### שלב 6: ביטול מנוי (בסוף תקופה)

```bash
curl -X POST https://[YOUR_PROJECT].supabase.co/functions/v1/manage-subscription-advanced \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cancel_end_of_period"
  }'
```

בדוק:
```sql
SELECT status, cancel_at_period_end FROM subscriptions WHERE user_id = '[USER_ID]';
```

אמור להראות:
```
status = 'active'
cancel_at_period_end = true
```

### שלב 7: החזרת מנוי (Reinstatement)

```bash
curl -X POST https://[YOUR_PROJECT].supabase.co/functions/v1/manage-subscription-advanced \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reinstate"
  }'
```

בדוק שה-`cancel_at_period_end` חזר ל-`false`.

### שלב 8: ביטול מיידי

```bash
curl -X POST https://[YOUR_PROJECT].supabase.co/functions/v1/manage-subscription-advanced \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cancel_immediate"
  }'
```

בדוק:
```sql
SELECT status, is_subscribed FROM subscriptions s
JOIN user_tokens ut ON ut.user_id = s.user_id
WHERE s.user_id = '[USER_ID]';
```

אמור להראות:
```
status = 'canceled'
is_subscribed = false
monthly_tokens = 100  (חזר ל-free tier)
```

---

## בדיקה 3: Token Top-Up - טעינת טוקנים

### מטרה
לבדוק רכישה חד-פעמית של טוקנים ומעקב אחר היסטוריית השינויים.

### שלבים

#### 1. רכישה ראשונה - 50 טוקנים

```bash
curl -X POST https://[YOUR_PROJECT].supabase.co/functions/v1/create-checkout \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "tokens",
    "amount": 50
  }'
```

#### 2. רכישה שנייה - 200 טוקנים

```bash
curl -X POST https://[YOUR_PROJECT].supabase.co/functions/v1/create-checkout \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "tokens",
    "amount": 200
  }'
```

#### 3. בדיקת היסטוריה מלאה

```sql
-- צפייה בכל שינויי הטוקנים
SELECT 
  change_type,
  change_amount,
  balance_before,
  balance_after,
  description,
  created_at
FROM token_balance_history 
WHERE user_id = '[USER_ID]'
ORDER BY created_at ASC;
```

תוצאה צפויה:
```
change_type          | change_amount | balance_before | balance_after | description
---------------------|---------------|----------------|---------------|-------------
purchase             | 50            | 100            | 150           | Purchased 50 tokens for $2.50
purchase             | 200           | 150            | 350           | Purchased 200 tokens for $10.00
```

#### 4. סימולציה של שימוש בטוקנים

```sql
-- דמה יצירת משימה (שמשתמשת ב-10 טוקנים)
SELECT deduct_tokens_from_user(
  '[USER_ID]'::uuid,
  10,
  'task_creation',
  '[TASK_ID]'::uuid,
  'Created new task for goal XYZ'
);
```

בדוק שהטוקנים הופחתו:
```sql
SELECT tokens_remaining, tokens_used FROM user_tokens WHERE user_id = '[USER_ID]';
```

---

## בדיקה 4: Failed Payment - תשלום שנכשל

### מטרה
לבדוק את הטיפול בתשלומים שנכשלו ושליחת נוטיפיקציות.

### שלבים

#### 1. שימוש בכרטיס שנכשל

השתמש באחד מכרטיסי המבחן של Stripe לכישלון:

- **כרטיס שנכשל:** `4000 0000 0000 0002` (סירוב כללי)
- **אין מספיק כסף:** `4000 0000 0000 9995`
- **כרטיס שפג תוקפו:** `4000 0000 0000 0069`

#### 2. ניסיון תשלום

צור checkout session ותשלם עם אחד מהכרטיסים האלה.

#### 3. בדיקת Webhook

ב-Stripe Dashboard > Webhooks > Events, חפש:
- `payment_intent.payment_failed`

#### 4. בדיקת DB

```sql
-- בדוק שהתשלום נרשם כ-failed
SELECT 
  status,
  failure_code,
  failure_message,
  created_at
FROM payments 
WHERE user_id = '[USER_ID]'
ORDER BY created_at DESC 
LIMIT 1;
```

תוצאה צפויה:
```
status = 'failed'
failure_code = 'card_declined' (או אחר)
failure_message = 'Your card was declined.'
```

#### 5. בדיקת נוטיפיקציה

```sql
-- בדוק שנוטיפיקציה נשלחה
SELECT 
  notification_type,
  channel,
  status,
  sent_at
FROM payment_notifications 
WHERE user_id = '[USER_ID]'
ORDER BY sent_at DESC 
LIMIT 1;
```

תוצאה צפויה:
```
notification_type = 'payment_failed'
channel = 'push' או 'email'
status = 'sent'
```

#### 6. סימולציה של failed subscription payment

ב-Stripe Dashboard:
1. לך ל-Customer
2. Subscriptions > [Your subscription]
3. Payment methods > Update
4. הוסף את הכרטיס הכושל `4000 0000 0000 0341` (requires authentication)
5. Advance billing cycle

בדוק שהאירוע `invoice.payment_failed` התקבל ונוטיפיקציה נשלחה.

---

## בדיקה 5: End-to-End עם Webhooks

### מטרה
לבדוק את כל ה-flow מקצה לקצה: רכישת טוקנים → webhook → עדכון DB → יצירת משימה.

### תרחיש: משתמש קונה טוקנים ויוצר מטרה

#### שלב 1: מצב התחלתי

```sql
SELECT tokens_remaining FROM user_tokens WHERE user_id = '[USER_ID]';
-- נניח שיש 10 טוקנים
```

#### שלב 2: רכישת 100 טוקנים

```bash
curl -X POST https://[YOUR_PROJECT].supabase.co/functions/v1/create-checkout \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "tokens",
    "amount": 100
  }'
```

השלם את התשלום.

#### שלב 3: המתן ל-Webhook

חכה כמה שניות ל-webhook processing.

#### שלב 4: בדיקת עדכון DB

```sql
-- בדוק שהטוקנים עודכנו
SELECT tokens_remaining FROM user_tokens WHERE user_id = '[USER_ID]';
-- אמור להיות 110 (10 + 100)
```

#### שלב 5: יצירת מטרה (שמשתמשת ב-20 טוקנים)

```bash
# קריאה ל-Edge Function ליצירת מטרה
curl -X POST https://[YOUR_PROJECT].supabase.co/functions/v1/generate-plan \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn Spanish",
    "description": "Master conversational Spanish in 3 months",
    "category": "education",
    "intensity": "moderate",
    "plan_duration_days": 90
  }'
```

#### שלב 6: בדיקה סופית

```sql
-- בדוק שהטוקנים הופחתו
SELECT tokens_remaining, tokens_used FROM user_tokens WHERE user_id = '[USER_ID]';
-- אמור להיות: remaining=90, used=20

-- בדוק את כל ההיסטוריה
SELECT * FROM token_balance_history 
WHERE user_id = '[USER_ID]'
ORDER BY created_at DESC;
```

תוצאה צפויה:
```
1. plan_generation    | -20  | 110 | 90  | Created plan for "Learn Spanish"
2. purchase           | 100  | 10  | 110 | Purchased 100 tokens for $5.00
```

---

## 🎴 כרטיסי מבחן של Stripe

### כרטיסים שמצליחים

| מספר כרטיס          | תיאור                     |
|---------------------|---------------------------|
| 4242 4242 4242 4242 | ללא בעיות                 |
| 4000 0025 0000 3155 | דורש 3D Secure            |
| 5555 5555 5555 4444 | Mastercard                |
| 3782 822463 10005   | American Express          |

### כרטיסים שנכשלים

| מספר כרטיס          | סיבת כישלון                |
|---------------------|----------------------------|
| 4000 0000 0000 0002 | Card declined (סירוב כללי)  |
| 4000 0000 0000 9995 | Insufficient funds         |
| 4000 0000 0000 0069 | Expired card               |
| 4000 0000 0000 0127 | Incorrect CVC              |
| 4000 0000 0000 0119 | Processing error           |
| 4000 0000 0000 0341 | Requires authentication    |

### סימולציית Webhooks באופן מקומי

אם אתה רוצה לבדוק webhooks מקומית, השתמש ב-Stripe CLI:

```bash
# התקנה
brew install stripe/stripe-cli/stripe

# התחברות
stripe login

# האזנה ל-webhooks
stripe listen --forward-to https://[YOUR_PROJECT].supabase.co/functions/v1/stripe-webhook

# הפעלת אירוע ידנית
stripe trigger payment_intent.succeeded
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
```

---

## 🛠️ פתרון בעיות נפוצות

### בעיה: Webhook לא מגיע

**פתרון:**
1. בדוק ב-Stripe Dashboard > Webhooks > [Your webhook] > Events
2. ודא שה-webhook endpoint נכון
3. בדוק שה-`STRIPE_WEBHOOK_SECRET` נכון ב-environment variables
4. בדוק logs:
   ```bash
   supabase functions logs stripe-webhook
   ```

### בעיה: טוקנים לא מתווספים

**פתרון:**
1. בדוק את logs של stripe-webhook:
   ```bash
   supabase functions logs stripe-webhook --tail
   ```
2. בדוק שהפונקציה `add_tokens_to_user` עובדת:
   ```sql
   SELECT add_tokens_to_user(
     '[USER_ID]'::uuid,
     10,
     'manual_adjustment',
     NULL,
     'Test addition'
   );
   ```

### בעיה: חיוב כפול

**פתרון:**
1. בדוק ב-Stripe Dashboard > Payments שאכן יש חיוב כפול
2. אם כן, עשה refund:
   ```bash
   # דרך Stripe CLI
   stripe refunds create --charge=ch_...
   ```
3. ה-webhook `charge.refunded` יטפל בהחזרת הטוקנים

### בעיה: Metadata חסר ב-webhook

**פתרון:**
ודא שאתה מעביר `user_id` ב-metadata בכל יצירת checkout session:

```javascript
sessionParams.metadata = {
  user_id: user.id,
  type: type,
};

// למנויים, הוסף גם:
sessionParams.subscription_data = {
  metadata: {
    user_id: user.id,
  },
};
```

---

## 📊 Dashboard לבדיקה

צור view זה כדי לראות מבט כולל על כל המערכת:

```sql
CREATE OR REPLACE VIEW payment_dashboard AS
SELECT 
  u.email,
  ut.tokens_remaining,
  ut.tokens_used,
  ut.is_subscribed,
  ut.monthly_tokens,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'succeeded') as successful_payments,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'failed') as failed_payments,
  SUM(p.amount_cents) FILTER (WHERE p.status = 'succeeded') as total_spent_cents,
  s.status as subscription_status,
  s.current_period_end
FROM auth.users u
LEFT JOIN user_tokens ut ON ut.user_id = u.id
LEFT JOIN payments p ON p.user_id = u.id
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status IN ('active', 'trialing')
GROUP BY u.id, u.email, ut.tokens_remaining, ut.tokens_used, 
         ut.is_subscribed, ut.monthly_tokens, s.status, s.current_period_end;

-- שימוש:
SELECT * FROM payment_dashboard WHERE email = '[USER_EMAIL]';
```

---

## ✅ Checklist בדיקות

העתק את הרשימה הזו ושמור בנפרד:

### בדיקות בסיסיות
- [ ] יצירת checkout session לרכישת טוקנים
- [ ] השלמת תשלום עם כרטיס מבחן
- [ ] קבלת webhook `checkout.session.completed`
- [ ] עדכון טוקנים ב-DB
- [ ] רישום תשלום ב-`payments`
- [ ] רישום ב-`token_balance_history`

### בדיקות מנוי
- [ ] יצירת checkout session למנוי
- [ ] הפעלת מנוי
- [ ] קבלת טוקנים חודשיים
- [ ] עדכון status ב-`subscriptions`
- [ ] סימולציה של חיוב חודשי (`invoice.payment_succeeded`)
- [ ] קבלת טוקנים חודשיים נוספים
- [ ] שינוי תוכנית (upgrade/downgrade) עם proration
- [ ] ביטול בסוף תקופה
- [ ] החזרת מנוי (reinstatement)
- [ ] ביטול מיידי

### בדיקות כישלון
- [ ] תשלום שנכשל עם כרטיס מבחן
- [ ] קבלת webhook `payment_intent.payment_failed`
- [ ] רישום ב-`payments` עם status `failed`
- [ ] שליחת נוטיפיקציה למשתמש
- [ ] רישום ב-`payment_notifications`

### בדיקות מתקדמות
- [ ] Refund והחזרת טוקנים
- [ ] שימוש בטוקנים (deduct)
- [ ] היסטוריה מלאה של שינויי טוקנים
- [ ] End-to-end: רכישה → משימה
- [ ] בדיקת RLS policies

---

## 🎯 סיכום

אחרי ביצוע כל הבדיקות, המערכת שלך אמורה לתמוך ב:

✅ רכישת טוקנים חד-פעמית  
✅ מנוי חודשי עם חיוב אוטומטי  
✅ ניהול מנויים (שינוי תוכנית, ביטול, החזרה)  
✅ Proration בשינויי תוכנית  
✅ טיפול בתשלומים שנכשלו  
✅ נוטיפיקציות אוטומטיות  
✅ מעקב מלא אחר היסטוריית טוקנים  
✅ Webhooks מלאים מ-Stripe  
✅ Integration עם Supabase Edge Functions  

---

## 📞 תמיכה

אם נתקלת בבעיות:

1. בדוק את ה-logs:
   ```bash
   supabase functions logs stripe-webhook --tail
   supabase functions logs create-checkout --tail
   ```

2. בדוק ב-Stripe Dashboard > Developers > Events

3. השתמש ב-Stripe CLI לדיבוג:
   ```bash
   stripe logs tail
   ```

4. בדוק את ה-webhook endpoint ב-Stripe Dashboard

---

**🚀 בהצלחה עם הבדיקות!**

