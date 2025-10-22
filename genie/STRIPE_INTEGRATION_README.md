# 💳 Stripe Payment Integration - GenieAI

מערכת תשלומים מלאה עם Stripe Atlas לטעינת טוקנים ומנויים חודשיים.

---

## 📑 תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [ארכיטקטורה](#ארכיטקטורה)
3. [התקנה והגדרה](#התקנה-והגדרה)
4. [Supabase Edge Functions](#supabase-edge-functions)
5. [Client-Side Integration](#client-side-integration)
6. [בדיקות](#בדיקות)
7. [מעבר ל-Production](#מעבר-ל-production)
8. [FAQ](#faq)

---

## 🎯 סקירה כללית

### מה נבנה?

מערכת תשלומים מקיפה התומכת ב:

✅ **רכישת טוקנים חד-פעמית** (Token Top-Up)
- מינימום 50 טוקנים
- מחיר: $0.05 לטוקן
- תשלום באמצעות Stripe Checkout

✅ **מנוי חודשי** (Subscription)
- 3 רמות: Basic ($4.99), Standard ($9.99), Premium ($19.99)
- חיוב אוטומטי חודשי
- ניהול מנויים: שדרוג, הורדת דרגה, ביטול, החזרה

✅ **Webhooks מלאים**
- טיפול בכל אירועי Stripe
- עדכון אוטומטי של DB
- שליחת נוטיפיקציות על כישלונות

✅ **מעקב והיסטוריה**
- היסטוריה מלאה של כל התשלומים
- מעקב אחר כל שינוי במאזן הטוקנים
- Audit trail מלא

---

## 🏗️ ארכיטקטורה

### Database Schema

```
┌─────────────────────┐
│ auth.users          │
└─────────┬───────────┘
          │
          ├─── user_tokens (מאזן טוקנים)
          │
          ├─── stripe_customers (קישור ל-Stripe)
          │
          ├─── subscriptions (מנויים)
          │
          ├─── payments (תשלומים)
          │
          ├─── payment_notifications (התראות)
          │
          └─── token_balance_history (היסטוריה)
```

### Flow Diagrams

#### Token Purchase Flow
```
User → App → create-checkout → Stripe Checkout → Payment → Webhook → Update DB → Notify User
```

#### Subscription Flow
```
User → Subscribe → Stripe → Webhook → Activate → Monthly Billing → Webhook → Add Tokens
```

---

## 🔧 התקנה והגדרה

### שלב 1: הגדרת Stripe Account

1. **יצירת חשבון Stripe Atlas** (אם עדיין לא קיים)
   - עבור ל-[Stripe Atlas](https://stripe.com/atlas)
   - השלם את תהליך ההרשמה

2. **קבלת API Keys**
   ```
   Dashboard > Developers > API keys
   
   Test Keys:
   - Publishable: pk_test_...
   - Secret: sk_test_...
   
   (Live keys יהיו זמינים אחרי אישור Atlas)
   ```

3. **יצירת Products ו-Prices**
   
   **דרך Dashboard:**
   ```
   Products > Add Product
   
   Product 1: Genie Basic
   - Price: $4.99/month
   - Recurring: Monthly
   - Copy price_id: price_xxxxx1
   
   Product 2: Genie Standard
   - Price: $9.99/month
   - Recurring: Monthly
   - Copy price_id: price_xxxxx2
   
   Product 3: Genie Premium
   - Price: $19.99/month
   - Recurring: Monthly
   - Copy price_id: price_xxxxx3
   ```
   
   **דרך CLI:**
   ```bash
   stripe products create --name="Genie Basic" --description="500 tokens/month"
   stripe prices create --product=prod_xxx --unit-amount=499 --currency=usd --recurring[interval]=month
   
   # חזור על התהליך לכל product
   ```

### שלב 2: הגדרת Supabase

1. **הרצת Migration**
   
   ```bash
   cd genie/supabase
   
   # אם משתמשים ב-Supabase CLI
   supabase db push
   
   # או דרך Dashboard
   # SQL Editor > New Query > העתק את migrations/20250122000000_stripe_payment_system.sql
   ```

2. **הגדרת Environment Variables**
   
   ב-Supabase Dashboard > Settings > Edge Functions > Secrets:
   
   ```bash
   # Stripe Keys
   STRIPE_SECRET_KEY=sk_test_51SKnxn9mCMmqa2BSfBCnAlJx0gugq1YaeD2o8ofVBNKbZtxmHoP2mIMJrfoTKIbG3dZUWloVwKZWJfF6PzeptJwF0089UdDLZ3
   STRIPE_PUBLISHABLE_KEY=pk_test_51SKnxn9mCMmqa2BS8WKOYcdLMdy0RySS2vuJ9RukkvloLUXlg68ZFBaPbznlzCOajHb7eSeiKj1xwlbchHKei6Kh00sKsdrzmh
   
   # Webhook Secret (יווצר בשלב הבא)
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Deploy Edge Functions**
   
   ```bash
   # Deploy all functions
   supabase functions deploy stripe-webhook
   supabase functions deploy create-checkout
   supabase functions deploy manage-subscription-advanced
   
   # או deploy הכל ביחד
   supabase functions deploy
   ```

### שלב 3: הגדרת Webhooks

1. **קבלת Webhook URL**
   ```
   https://[YOUR_PROJECT_REF].supabase.co/functions/v1/stripe-webhook
   ```

2. **יצירת Webhook ב-Stripe**
   
   Stripe Dashboard > Developers > Webhooks > Add endpoint
   
   ```
   Endpoint URL: https://[YOUR_PROJECT].supabase.co/functions/v1/stripe-webhook
   
   Events to send:
   ✓ checkout.session.completed
   ✓ payment_intent.succeeded
   ✓ payment_intent.payment_failed
   ✓ invoice.payment_succeeded
   ✓ invoice.payment_failed
   ✓ customer.subscription.created
   ✓ customer.subscription.updated
   ✓ customer.subscription.deleted
   ✓ charge.refunded
   ```

3. **שמירת Webhook Secret**
   
   אחרי יצירת ה-webhook:
   ```
   Click on webhook > Signing secret > Reveal
   Copy: whsec_...
   
   Supabase Dashboard > Settings > Edge Functions > Secrets
   Add: STRIPE_WEBHOOK_SECRET = whsec_...
   ```

### שלב 4: עדכון Client

עדכן את ה-price IDs ב-`src/services/paymentService.ts`:

```typescript
getSubscriptionTiers() {
  return [
    {
      id: 'basic',
      name: 'Basic',
      priceId: 'price_xxxxx1', // <-- שנה כאן
      price: 4.99,
      tokens: 500,
      // ...
    },
    {
      id: 'standard',
      name: 'Standard',
      priceId: 'price_xxxxx2', // <-- שנה כאן
      price: 9.99,
      tokens: 1000,
      // ...
    },
    {
      id: 'premium',
      name: 'Premium',
      priceId: 'price_xxxxx3', // <-- שנה כאן
      price: 19.99,
      tokens: 2500,
      // ...
    },
  ];
}
```

---

## 🚀 Supabase Edge Functions

### 1. create-checkout

יוצר Stripe Checkout Session לרכישת טוקנים או מנוי.

**Endpoint:** `https://[PROJECT].supabase.co/functions/v1/create-checkout`

**Request:**
```typescript
{
  type: 'tokens' | 'subscription',
  amount?: number,        // לטוקנים - כמות
  priceId?: string,       // למנוי - Stripe price ID
  successUrl?: string,    // אופציונלי
  cancelUrl?: string      // אופציונלי
}
```

**Response:**
```typescript
{
  success: true,
  sessionId: 'cs_test_...',
  url: 'https://checkout.stripe.com/...',
  requestId: '...'
}
```

**Example:**
```typescript
const response = await supabase.functions.invoke('create-checkout', {
  body: { type: 'tokens', amount: 100 },
  headers: { Authorization: `Bearer ${token}` }
});
```

### 2. stripe-webhook

מקבל ומעבד webhooks מ-Stripe.

**Events מטופלים:**
- `checkout.session.completed` - תשלום הושלם
- `payment_intent.succeeded` - תשלום הצליח
- `payment_intent.payment_failed` - תשלום נכשל
- `invoice.payment_succeeded` - חיוב חודשי הצליח
- `invoice.payment_failed` - חיוב חודשי נכשל
- `customer.subscription.created` - מנוי נוצר
- `customer.subscription.updated` - מנוי עודכן
- `customer.subscription.deleted` - מנוי בוטל
- `charge.refunded` - החזר כספי

### 3. manage-subscription-advanced

ניהול מנויים: שדרוג, הורדת דרגה, ביטול, החזרה.

**Endpoint:** `https://[PROJECT].supabase.co/functions/v1/manage-subscription-advanced`

**Actions:**
```typescript
{
  action: 'upgrade' | 'downgrade' | 'reinstate' | 'cancel_immediate' | 'cancel_end_of_period',
  newPriceId?: string,    // לשדרוג/הורדה
  proration?: boolean     // ברירת מחדל: true
}
```

**Examples:**

שדרוג מנוי:
```typescript
await supabase.functions.invoke('manage-subscription-advanced', {
  body: {
    action: 'upgrade',
    newPriceId: 'price_premium',
    proration: true
  }
});
```

ביטול בסוף תקופה:
```typescript
await supabase.functions.invoke('manage-subscription-advanced', {
  body: { action: 'cancel_end_of_period' }
});
```

החזרת מנוי:
```typescript
await supabase.functions.invoke('manage-subscription-advanced', {
  body: { action: 'reinstate' }
});
```

---

## 💻 Client-Side Integration

### שימוש ב-Components

#### 1. Token Purchase Modal

```typescript
import { TokenPurchaseModal } from '@/components/domain/TokenPurchaseModal';

function MyScreen() {
  const [showPurchase, setShowPurchase] = useState(false);

  return (
    <>
      <Button onPress={() => setShowPurchase(true)}>
        Buy Tokens
      </Button>

      <TokenPurchaseModal
        visible={showPurchase}
        onClose={() => setShowPurchase(false)}
        onSuccess={() => {
          // Refresh token balance
          console.log('Purchase completed!');
        }}
      />
    </>
  );
}
```

#### 2. Subscription Management Modal

```typescript
import { SubscriptionManagementModal } from '@/components/domain/SubscriptionManagementModal';

function SettingsScreen() {
  const [showSubscription, setShowSubscription] = useState(false);

  return (
    <>
      <Button onPress={() => setShowSubscription(true)}>
        Manage Subscription
      </Button>

      <SubscriptionManagementModal
        visible={showSubscription}
        onClose={() => setShowSubscription(false)}
        onSuccess={() => {
          // Refresh subscription status
          console.log('Subscription updated!');
        }}
      />
    </>
  );
}
```

### שימוש ב-Payment Service

```typescript
import { paymentService } from '@/services/paymentService';

// רכישת טוקנים
const purchaseTokens = async (amount: number) => {
  const response = await paymentService.purchaseTokens(amount);
  if (response.success && response.url) {
    await paymentService.openCheckout(response.url);
  }
};

// קבלת היסטוריית תשלומים
const payments = await paymentService.getPaymentHistory(10);

// קבלת מנוי פעיל
const subscription = await paymentService.getActiveSubscription();

// קבלת היסטוריית טוקנים
const tokenHistory = await paymentService.getTokenHistory(20);
```

### Deep Linking Setup

עדכן את `app.config.ts`:

```typescript
export default {
  // ...
  scheme: "genie",
  ios: {
    bundleIdentifier: "com.yourcompany.genie",
  },
  android: {
    package: "com.yourcompany.genie",
  },
}
```

הוסף listener ב-`App.tsx`:

```typescript
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Listen for deep links
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      const result = await paymentService.handlePaymentCallback(url);
      
      if (result.type === 'success') {
        // Show success message
        // Refresh token balance
      } else if (result.type === 'cancelled') {
        // Show cancellation message
      }
    });

    return () => subscription.remove();
  }, []);

  return <YourApp />;
}
```

---

## 🧪 בדיקות

ראה [STRIPE_TESTING_GUIDE.md](./STRIPE_TESTING_GUIDE.md) למדריך בדיקות מפורט.

### Quick Test Checklist

```bash
# 1. רכישת טוקנים
✓ יצירת checkout session
✓ תשלום עם כרטיס מבחן 4242 4242 4242 4242
✓ webhook מתקבל
✓ טוקנים מתווספים ל-DB

# 2. מנוי
✓ יצירת מנוי חדש
✓ חיוב חודשי (simulate ב-Stripe)
✓ טוקנים חודשיים מתווספים
✓ שינוי תוכנית עם proration
✓ ביטול והחזרה

# 3. כישלונות
✓ תשלום נכשל (כרטיס 4000 0000 0000 0002)
✓ נוטיפיקציה נשלחת
✓ רישום ב-DB
```

---

## 🚀 מעבר ל-Production

### רשימת משימות לפני Launch

- [ ] **Stripe Atlas**
  - [ ] השלמת הליך ההרשמה ל-Atlas
  - [ ] אישור החשבון
  - [ ] מעבר ממצב Test למצב Live

- [ ] **API Keys**
  - [ ] קבלת Live API Keys
  - [ ] עדכון Environment Variables ב-Supabase
  - [ ] עדכון ב-App (אם יש hard-coded keys)

- [ ] **Webhooks**
  - [ ] יצירת webhook endpoint ב-Live mode
  - [ ] עדכון STRIPE_WEBHOOK_SECRET

- [ ] **Products & Prices**
  - [ ] יצירת Products ב-Live mode
  - [ ] עדכון Price IDs ב-`paymentService.ts`
  - [ ] בדיקת מחירים

- [ ] **בדיקות**
  - [ ] בדיקת רכישת טוקנים בסביבה חיה
  - [ ] בדיקת יצירת מנוי
  - [ ] בדיקת webhooks
  - [ ] בדיקת refunds

- [ ] **אבטחה**
  - [ ] ודא ש-RLS policies מוגדרות נכון
  - [ ] בדיקת authorization בכל ה-Edge Functions
  - [ ] Rate limiting על endpoints רגישים

- [ ] **Monitoring**
  - [ ] הגדרת alerts ב-Stripe Dashboard
  - [ ] הגדרת logging ב-Supabase
  - [ ] הגדרת error tracking (Sentry, etc.)

- [ ] **Legal**
  - [ ] Terms of Service
  - [ ] Privacy Policy
  - [ ] Refund Policy
  - [ ] הצגת מחירים בצורה ברורה

### Environment Variables - Production

```bash
# Production Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## ❓ FAQ

### כללי

**Q: כמה עולה Stripe Atlas?**  
A: $500 חד-פעמי + עלויות שוטפות של Stripe (2.9% + $0.30 לכל עסקה).

**Q: מתי אני יכול לעבור ל-Live mode?**  
A: אחרי אישור החשבון ב-Stripe Atlas (בדרך כלל 1-2 שבועות).

**Q: האם אני צריך SSL certificate?**  
A: לא, Supabase מספקת SSL אוטומטית.

### טכני

**Q: מה קורה אם webhook נכשל?**  
A: Stripe מנסה שוב אוטומטית (עד 72 שעות). אפשר לראות ב-Dashboard > Webhooks > Events.

**Q: איך אני יכול לבדוק webhooks מקומית?**  
A: השתמש ב-Stripe CLI:
```bash
stripe listen --forward-to https://[PROJECT].supabase.co/functions/v1/stripe-webhook
```

**Q: מה קורה אם משתמש קונה טוקנים פעמיים במקביל?**  
A: כל webhook מעובד בנפרד. ה-DB functions מטפלות בזה בצורה atomic.

**Q: איך אני מטפל ב-refunds?**  
A: ה-webhook `charge.refunded` מטפל בזה אוטומטית - מפחית את הטוקנים.

**Q: האם יש rate limiting?**  
A: כרגע לא. מומלץ להוסיף rate limiting ב-production.

### מנויים

**Q: מה קורה כשמשתמש משנה תוכנית באמצע החודש?**  
A: Stripe מחשבת proration אוטומטית. המשתמש משלם/מקבל החזר על הזמן שנותר.

**Q: מה קורה לטוקנים כשמשתמש מבטל מנוי?**  
A: הטוקנים נשארים. רק ה-`monthly_tokens` חוזרים ל-100 (free tier).

**Q: האם אפשר להציע trial period?**  
A: כן! ב-Stripe Dashboard > Products > [Product] > Add trial period.

### Debugging

**Q: איך אני רואה logs?**  
```bash
# Supabase logs
supabase functions logs stripe-webhook --tail

# Stripe logs
stripe logs tail
```

**Q: webhook לא מגיע, מה לבדוק?**  
1. Webhook URL נכון?
2. STRIPE_WEBHOOK_SECRET נכון?
3. Events נבחרו נכון?
4. בדוק ב-Stripe Dashboard > Webhooks > [Your webhook] > Events

---

## 📞 תמיכה

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe Support:** https://support.stripe.com
- **Supabase Docs:** https://supabase.com/docs
- **Stripe CLI:** https://stripe.com/docs/stripe-cli

---

## 📝 License

כל הקוד הזה שייך לפרויקט GenieAI.

---

**🎉 מזל טוב! מערכת התשלומים שלך מוכנה!**

עכשיו תוכל להתחיל לבצע בדיקות ולהכין את המערכת ל-production.

