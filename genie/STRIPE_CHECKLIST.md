# ✅ Stripe Integration - Checklist

העתק את הרשימה הזו וסמן כל פעולה שהשלמת.

---

## 📦 Setup - התקנה בסיסית

### Database
- [ ] הרצתי את ה-migration: `supabase db push`
- [ ] בדקתי שהטבלאות נוצרו: `stripe_customers`, `subscriptions`, `payments`, `payment_notifications`, `token_balance_history`
- [ ] בדקתי שה-functions נוצרו: `add_tokens_to_user`, `deduct_tokens_from_user`, `subscribe_user`, `cancel_subscription`, `reinstate_subscription`

### Supabase Edge Functions
- [ ] Deploy `stripe-webhook`: `supabase functions deploy stripe-webhook`
- [ ] Deploy `create-checkout`: `supabase functions deploy create-checkout`
- [ ] Deploy `manage-subscription-advanced`: `supabase functions deploy manage-subscription-advanced`
- [ ] בדקתי ש-3 ה-functions מופיעים ב-Supabase Dashboard

### Environment Variables
- [ ] הוספתי `STRIPE_SECRET_KEY` ב-Supabase Dashboard
- [ ] הוספתי `STRIPE_PUBLISHABLE_KEY` ב-Supabase Dashboard
- [ ] רשמתי את ה-Supabase project URL שלי: `https://_____________.supabase.co`

---

## 🔌 Stripe Configuration

### Webhook
- [ ] יצרתי webhook endpoint ב-Stripe Dashboard
- [ ] הגדרתי את ה-URL: `https://[PROJECT].supabase.co/functions/v1/stripe-webhook`
- [ ] בחרתי את כל 9 האירועים:
  - [ ] `checkout.session.completed`
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.payment_failed`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `charge.refunded`
- [ ] העתקתי את ה-webhook secret (מתחיל ב-`whsec_`)
- [ ] הוספתי `STRIPE_WEBHOOK_SECRET` ב-Supabase Dashboard

### Products
- [ ] יצרתי product: **Genie Basic** ($4.99/month)
- [ ] רשמתי את ה-price_id: `price_____________`
- [ ] יצרתי product: **Genie Standard** ($9.99/month)
- [ ] רשמתי את ה-price_id: `price_____________`
- [ ] יצרתי product: **Genie Premium** ($19.99/month)
- [ ] רשמתי את ה-price_id: `price_____________`

---

## 💻 Client Code

### Payment Service
- [ ] עדכנתי את ה-price IDs ב-`src/services/paymentService.ts`
  - [ ] Basic price ID
  - [ ] Standard price ID
  - [ ] Premium price ID
- [ ] בדקתי שה-import של `paymentService` עובד

### Components
- [ ] בדקתי שה-`TokenPurchaseModal` קיים ב-`src/components/domain/`
- [ ] בדקתי שה-`SubscriptionManagementModal` קיים ב-`src/components/domain/`
- [ ] הוספתי את ה-components למסך רלוונטי (אופציונלי כרגע)

### Deep Linking
- [ ] בדקתי שיש `scheme: "genie"` ב-`app.config.ts`
- [ ] הוספתי listener ל-deep links ב-`App.tsx` (אופציונלי כרגע)

---

## 🧪 Testing - בדיקות

### בדיקה מהירה (5 דקות)
- [ ] יצרתי checkout session דרך curl/Postman
- [ ] קיבלתי URL ל-Stripe Checkout
- [ ] שילמתי עם כרטיס מבחן `4242 4242 4242 4242`
- [ ] בדקתי ב-Stripe Dashboard שה-webhook הגיע
- [ ] בדקתי בDB שהטוקנים התווספו

### בדיקה 1: Token Purchase
- [ ] רכישת 50 טוקנים
- [ ] רכישת 100 טוקנים
- [ ] רכישת 500 טוקנים
- [ ] בדיקת היסטוריה ב-`token_balance_history`
- [ ] בדיקת רשומות ב-`payments`

### בדיקה 2: Subscription
- [ ] יצירת מנוי חדש (Basic/Standard/Premium)
- [ ] בדיקה ש-1000 טוקנים נוספו
- [ ] בדיקה ב-`subscriptions` שהסטטוס `active`
- [ ] סימולציה של חיוב חודשי (Stripe Dashboard > Advance billing cycle)
- [ ] בדיקה שטוקנים חודשיים נוספו

### בדיקה 3: Subscription Management
- [ ] שדרוג לתוכנית יקרה יותר (upgrade)
- [ ] בדיקת proration ב-Stripe
- [ ] הורדת דרגה לתוכנית זולה יותר (downgrade)
- [ ] ביטול מנוי (cancel at end of period)
- [ ] החזרת מנוי (reinstate)
- [ ] ביטול מיידי (cancel immediate)

### בדיקה 4: Failed Payments
- [ ] ניסיון תשלום עם כרטיס שנכשל `4000 0000 0000 0002`
- [ ] בדיקה שה-webhook `payment_intent.payment_failed` הגיע
- [ ] בדיקה ב-`payments` שהסטטוס `failed`
- [ ] בדיקה ב-`payment_notifications` שנוטיפיקציה נשלחה

### בדיקה 5: Refunds
- [ ] ביצוע refund ב-Stripe Dashboard
- [ ] בדיקה שה-webhook `charge.refunded` הגיע
- [ ] בדיקה שהטוקנים הופחתו

### בדיקה 6: End-to-End
- [ ] משתמש קונה טוקנים
- [ ] Webhook מעדכן DB
- [ ] משתמש יוצר goal (משתמש בטוקנים)
- [ ] בדיקת היסטוריה מלאה

---

## 📊 Monitoring & Analytics

### Queries
- [ ] יצרתי query לסה"כ הכנסות
- [ ] יצרתי query למספר מנויים פעילים
- [ ] יצרתי query ל-conversion rate
- [ ] יצרתי query לתשלומים שנכשלו

### Alerts (אופציונלי)
- [ ] הגדרתי alert על תשלום שנכשל
- [ ] הגדרתי alert על מנוי שבוטל
- [ ] הגדרתי alert על שגיאה ב-webhook

---

## 📝 Documentation & Legal

### Internal Docs
- [ ] קראתי את `STRIPE_QUICKSTART.md`
- [ ] קראתי את `STRIPE_INTEGRATION_README.md`
- [ ] קראתי את `STRIPE_TESTING_GUIDE.md`
- [ ] קראתי את `STRIPE_SUMMARY.md`

### Legal (לפני production)
- [ ] הכנתי Terms of Service
- [ ] הכנתי Privacy Policy
- [ ] הכנתי Refund Policy
- [ ] הוספתי הצגת מחירים ברורה באפליקציה

---

## 🚀 Production Readiness

### Stripe Atlas
- [ ] השלמתי את תהליך ההרשמה ל-Stripe Atlas
- [ ] קיבלתי אישור לחשבון
- [ ] עברתי ממצב Test ל-Live mode

### Production Setup
- [ ] קיבלתי Live API Keys מ-Stripe
- [ ] עדכנתי Environment Variables ב-Supabase (Live keys)
- [ ] יצרתי webhook endpoint ב-Live mode
- [ ] יצרתי Products ב-Live mode
- [ ] עדכנתי Price IDs ב-App (Live)

### Testing in Production
- [ ] בדיקת רכישת טוקנים ב-Live mode
- [ ] בדיקת יצירת מנוי ב-Live mode
- [ ] בדיקת webhooks ב-Live mode
- [ ] בדיקת failed payments ב-Live mode

### Security
- [ ] ודאתי ש-RLS policies מוגדרות נכון
- [ ] בדקתי authorization בכל ה-Edge Functions
- [ ] הוספתי rate limiting (אופציונלי)
- [ ] הגדרתי error tracking (Sentry, etc.)

### Monitoring
- [ ] הגדרתי logging ב-Supabase
- [ ] הגדרתי alerts ב-Stripe Dashboard
- [ ] יצרתי dashboard לניטור תשלומים
- [ ] הגדרתי backup של DB

---

## 🎯 Launch Checklist

סמן את כל הפריטים הבאים לפני שאתה עובר ל-production:

- [ ] כל הבדיקות ב-Test mode עברו בהצלחה ✅
- [ ] Stripe Atlas approved ✅
- [ ] Live API keys מוגדרים ✅
- [ ] Products יצורו ב-Live mode ✅
- [ ] Webhook עובד ב-Live mode ✅
- [ ] Terms of Service פורסמו ✅
- [ ] Privacy Policy פורסמה ✅
- [ ] Refund Policy פורסמה ✅
- [ ] Monitoring מוגדר ✅
- [ ] Customer support מוכן ✅

---

## 📈 Post-Launch

אחרי ש-launched:

- [ ] ניטור יומי של תשלומים
- [ ] תגובה מהירה ל-failed payments
- [ ] מעקב אחר conversion rates
- [ ] A/B testing של מחירים
- [ ] איסוף feedback ממשתמשים
- [ ] אופטימיזציה של ה-checkout flow

---

## 🎊 סיימת!

אם סימנת את כל הפריטים למעלה - מזל טוב! 🎉

**מערכת התשלומים שלך מוכנה לייצור!**

---

*Last updated: January 22, 2025*

---

## 📞 צריך עזרה?

אם נתקלת בבעיה:

1. בדוק את ה-logs:
   ```bash
   supabase functions logs stripe-webhook --tail
   ```

2. בדוק ב-Stripe Dashboard > Webhooks > Events

3. קרא את ה-FAQ ב-STRIPE_INTEGRATION_README.md

4. בדוק את ה-troubleshooting guide ב-STRIPE_TESTING_GUIDE.md

