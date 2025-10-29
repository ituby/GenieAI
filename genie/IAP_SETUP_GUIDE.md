# 📱 מדריך מקיף - הגדרת In-App Purchases (IAP) להעלאת האפליקציה

## 📋 תוכן עניינים
1. [הגדרת App Store Connect (iOS)](#הגדרת-app-store-connect-ios)
2. [הגדרת Google Play Console (Android)](#הגדרת-google-play-console-android)
3. [הגדרת Supabase Edge Functions](#הגדרת-supabase-edge-functions)
4. [בדיקת תשלומים - Sandbox (iOS)](#בדיקת-תשלומים-sandbox-ios)
5. [בדיקת תשלומים - Test Mode (Android)](#בדיקת-תשלומים-test-mode-android)
6. [בניית האפליקציה להעלאה](#בניית-האפליקציה-להעלאה)
7. [פתרון בעיות נפוצות](#פתרון-בעיות-נפוצות)

---

## 🍎 הגדרת App Store Connect (iOS)

### שלב 1: כניסה ל-App Store Connect
1. היכנס ל-[App Store Connect](https://appstoreconnect.apple.com)
2. לחץ על **My Apps**
3. בחר את האפליקציה שלך (Genie)

### שלב 2: הגדרת In-App Purchases

#### 2.1 הוספת Consumable Products (טוקנים)
1. לחץ על **Features** → **In-App Purchases**
2. לחץ על **+** (Create)
3. בחר **Consumable** (למוצרים חד-פעמיים כמו טוקנים)

**צור את המוצרים הבאים:**

| שם המוצר | Product ID | מחיר |
|----------|------------|------|
| 50 Tokens | `com.ituby.genie.ai.tokens.50` | $2.50 |
| 100 Tokens | `com.ituby.genie.ai.tokens.100` | $5.00 |
| 250 Tokens | `com.ituby.genie.ai.tokens.250` | $12.50 |
| 500 Tokens | `com.ituby.genie.ai.tokens.500` | $25.00 |
| 1000 Tokens | `com.ituby.genie.ai.tokens.1000` | $50.00 |
| 2000 Tokens | `com.ituby.genie.ai.tokens.2000` | $100.00 |

**לכל מוצר:**
- **Reference Name**: השם שתראה (למשל "50 Tokens")
- **Product ID**: **חשוב מאוד** - העתק בדיוק מהטבלה למעלה
- **Price**: בחר את המחיר המתאים
- **Localization**: הוסף תיאור בעברית ואנגלית
  - **Display Name**: "50 טוקנים" / "50 Tokens"
  - **Description**: "קנה 50 טוקנים לשימוש באפליקציה"

#### 2.2 הוספת Auto-Renewable Subscription (מנוי)
1. לחץ על **+** → **Auto-Renewable Subscription**
2. **Subscription Group**: צור קבוצה חדשה "Premium Subscriptions"
3. **Product ID**: `com.ituby.genie.ai.premium.monthly`
4. **Duration**: 1 Month
5. **Price**: $15.00
6. **Localization**:
   - **Display Name**: "Premium Monthly" / "מנוי פרימיום חודשי"
   - **Description**: "1,000 טוקנים בחודש + הנחה 15% על רכישות נוספות"

### שלב 3: הגדרת Shared Secret (חובה לולידציה)
1. לך ל-**App Store Connect** → **My Apps** → בחר את האפליקציה
2. לחץ על **App Information**
3. גלול ל-**App-Specific Shared Secret**
4. לחץ **Generate** ושמור את הסוד
5. **חשוב**: שמור את המפתח הזה ל-Supabase Environment Variables

### שלב 4: הוספת Sandbox Testers
1. לך ל-**Users and Access**
2. לחץ על **Sandbox**
3. **Create Tester** → צור משתמש בדיקה עם אימייל ייעודי
4. **חשוב**: השתמש באימייל שלא קשור ל-Apple ID האמיתי שלך!

---

## 🤖 הגדרת Google Play Console (Android)

### שלב 1: כניסה ל-Google Play Console
1. היכנס ל-[Google Play Console](https://play.google.com/console)
2. בחר את האפליקציה שלך

### שלב 2: הגדרת In-App Products

#### 2.1 הוספת Managed Products (טוקנים)
1. לך ל-**Monetization** → **In-app products**
2. לחץ **Create product**
3. **Product type**: Managed product

**צור את המוצרים הבאים:**

| שם המוצר | Product ID | מחיר |
|----------|------------|------|
| 50 Tokens | `com.ituby.genie.ai.tokens.50` | $2.50 |
| 100 Tokens | `com.ituby.genie.ai.tokens.100` | $5.00 |
| 250 Tokens | `com.ituby.genie.ai.tokens.250` | $12.50 |
| 500 Tokens | `com.ituby.genie.ai.tokens.500` | $25.00 |
| 1000 Tokens | `com.ituby.genie.ai.tokens.1000` | $50.00 |
| 2000 Tokens | `com.ituby.genie.ai.tokens.2000` | $100.00 |

**לכל מוצר:**
- **Product ID**: **חשוב מאוד** - בדיוק אותו ID כמו ב-iOS
- **Name**: "50 Tokens"
- **Description**: "קנה 50 טוקנים לשימוש באפליקציה"
- **Price**: הגדר מחיר (Google Play ימיר אוטומטית למטבעות שונים)
- **Status**: Active

#### 2.2 הוספת Subscription (מנוי)
1. לך ל-**Monetization** → **Subscriptions**
2. לחץ **Create subscription**
3. **Product ID**: `com.ituby.genie.ai.premium.monthly`
4. **Name**: "Premium Monthly"
5. **Description**: "1,000 טוקנים בחודש + הנחה 15%"
6. **Billing period**: Monthly
7. **Price**: $15.00
8. **Free trial**: (אופציונלי) 7 ימים
9. **Status**: Active

### שלב 3: הגדרת Google Service Account (לולידציה)
1. לך ל-**Google Cloud Console** → [IAM & Admin](https://console.cloud.google.com/iam-admin)
2. בחר את הפרויקט המקושר ל-Play Console
3. **Service Accounts** → **Create Service Account**
4. שם: "Genie IAP Validator"
5. תפקיד (Role): **Monetization Admin**
6. **Create Key** → **JSON** → שמור את הקובץ!
7. **חשוב**: שמור את תוכן ה-JSON לשימוש ב-Supabase

### שלב 4: הוספת License Testers
1. חזור ל-**Play Console** → **Settings** → **License testing**
2. הוסף את כתובות האימייל של הבודקים
3. בודקים אלה יוכלו לבצע רכישות מבלי לשלם

---

## ☁️ הגדרת Supabase Edge Functions

### שלב 1: העלאת ה-Edge Function
```bash
cd /Users/itamartuby/Desktop/GenieAI/genie

# העלה את פונקצית הולידציה
npx supabase functions deploy validate-iap-receipt
```

### שלב 2: הגדרת Environment Variables ב-Supabase
1. היכנס ל-[Supabase Dashboard](https://app.supabase.com)
2. בחר את הפרויקט שלך
3. לך ל-**Settings** → **Edge Functions**
4. **Secrets** → הוסף את המשתנים הבאים:

```bash
# Apple Shared Secret (מ-App Store Connect)
APPLE_SHARED_SECRET=your_apple_shared_secret_here

# Google Service Account JSON (מ-Google Cloud Console)
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"..."}'
```

**איך להוסיף דרך CLI:**
```bash
# Apple Secret
npx supabase secrets set APPLE_SHARED_SECRET=your_secret

# Google Service Account (שים לב לגרשיים)
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

---

## 🧪 בדיקת תשלומים - Sandbox (iOS)

### הכנה לבדיקה
1. **התנתק** מ-Apple ID האמיתי שלך ב-Settings → App Store
2. **אל תתחבר** עדיין עם Sandbox Tester!
3. בנה והרץ את האפליקציה על מכשיר פיזי (לא סימולטור)

### תהליך הבדיקה
1. הרץ את האפליקציה במכשיר
2. לחץ על "Purchase Tokens"
3. **כאן** תופיע בקשת התחברות - השתמש ב-Sandbox Tester שיצרת
4. בחר חבילת טוקנים
5. אשר את הרכישה (לא יחויב כסף!)
6. בדוק שהטוקנים נוספו למשתמש

### טיפים חשובים
- ✅ **עובד**: מכשיר פיזי עם Sandbox Tester
- ❌ **לא עובד**: סימולטור, Apple ID אמיתי
- 🔄 אם יש בעיה - מחק את האפליקציה והתקן מחדש
- 📱 ניתן לבטל רכישות ב-Settings → App Store → Sandbox Account

---

## 🧪 בדיקת תשלומים - Test Mode (Android)

### הכנה לבדיקה
1. העלה גרסת בדיקה ל-**Internal Testing Track** ב-Play Console
2. הוסף את עצמך כבודק (Settings → License testing)

### תהליך הבדיקה
1. התקן את האפליקציה דרך הקישור של Internal Testing
2. פתח את האפליקציה
3. לחץ על "Purchase Tokens"
4. בחר חבילה - תראה "This is a test purchase"
5. אשר - לא יחויב כסף!
6. בדוק שהטוקנים נוספו

### טיפים חשובים
- ✅ חובה להעלות ל-Internal Testing Track
- ✅ חובה להיות רשום כבודק
- ⚠️ בדיקה מקומית (debug build) לא עובדת!
- 📱 ניתן לבטל דרך Play Store → Subscriptions

---

## 🚀 בניית האפליקציה להעלאה

### iOS - Build עם EAS
```bash
cd /Users/itamartuby/Desktop/GenieAI/genie

# Build production
eas build --platform ios --profile production

# בדיקת סטטוס
eas build:list
```

### Android - Build עם EAS
```bash
# Build production
eas build --platform android --profile production

# Build AAB (מומלץ)
eas build --platform android --profile production
```

### העלאה ל-App Store Connect
1. הורד את קובץ ה-`.ipa` מ-EAS
2. פתח **Transporter** (macOS)
3. גרור את קובץ ה-IPA לחלון
4. המתן לאישור
5. ב-App Store Connect → **TestFlight** תראה את הגרסה
6. הוסף בודקים והתחל בדיקה

### העלאה ל-Google Play Console
1. הורד את קובץ ה-`.aab` מ-EAS
2. ב-Play Console → **Testing** → **Internal testing**
3. **Create new release**
4. העלה את קובץ ה-AAB
5. הוסף **Release notes**
6. **Review release** → **Start rollout**

---

## 🐛 פתרון בעיות נפוצות

### שגיאה: "Product not found"
**פתרון:**
- ודא שה-Product IDs זהים ב-App/Play Console ובקוד
- ודא שהמוצרים ב-status "Ready for Sale" / "Active"
- חכה 2-3 שעות אחרי יצירת מוצרים (Apple!)

### שגיאה: "Cannot connect to iTunes Store" (iOS)
**פתרון:**
- התנתק מ-Apple ID אמיתי
- מחק את האפליקציה והתקן מחדש
- בדוק חיבור אינטרנט
- נסה Sandbox Tester אחר

### שגיאה: "Item already owned" (Android)
**פתרון:**
```bash
# בטל את הרכישה ב-Play Console או במכשיר
# אפשרות 2: צרוך (consume) את הרכישה בקוד
```

### Tokens לא מתעדכנים אחרי רכישה
**פתרון:**
1. בדוק לוגים ב-Supabase Edge Functions
2. ודא שה-APPLE_SHARED_SECRET מוגדר נכון
3. בדוק שה-purchaseUpdatedListener פועל
4. ודא ש-finishTransaction נקרא

### בדיקה לא עובדת בסימולטור (iOS)
**פתרון:**
- IAP לא עובד בסימולטור!
- **חובה** להשתמש במכשיר פיזי
- אפשרות: השתמש ב-StoreKit Configuration File לבדיקה מקומית

---

## ✅ רשימת בדיקות לפני העלאה לפרודקשן

### iOS Checklist
- [ ] כל המוצרים יצורים ב-App Store Connect
- [ ] Shared Secret מוגדר ב-Supabase
- [ ] בדיקת Sandbox Testers עברה בהצלחה
- [ ] Entitlements מוגדרים נכון (`com.apple.developer.in-app-payments`)
- [ ] Bundle ID תואם

### Android Checklist
- [ ] כל המוצרים יצורים ב-Google Play Console
- [ ] Service Account JSON מוגדר ב-Supabase
- [ ] בדיקת License Testers עברה בהצלחה
- [ ] Package Name תואם (`com.ituby.genie.ai`)
- [ ] Billing permission מוגדר ב-AndroidManifest

### Supabase Checklist
- [ ] Edge Function `validate-iap-receipt` deployed
- [ ] Environment Variables מוגדרים (APPLE_SHARED_SECRET, GOOGLE_SERVICE_ACCOUNT_JSON)
- [ ] RPC function `add_tokens` קיימת
- [ ] טבלאות payments ו-subscriptions מוגדרות

---

## 📞 תמיכה ומשאבים

- [Apple IAP Documentation](https://developer.apple.com/in-app-purchase/)
- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [react-native-iap Documentation](https://github.com/dooboolab-community/react-native-iap)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**✨ בהצלחה! אם יש שאלות, אני כאן לעזור! ✨**

