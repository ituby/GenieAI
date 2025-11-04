# ✅ IAP Pre-Build Checklist - בדיקה לפני Build

## 📋 תאריך בדיקה: _________________

---

## ✅ 1. Bundle ID תואם

### בקוד:
- ✅ `app.config.ts`: `bundleIdentifier: 'com.ituby.genie.ai'`
- ✅ `app.json`: `bundleIdentifier: "com.ituby.genie.ai"`
- ✅ `Info.plist`: `$(PRODUCT_BUNDLE_IDENTIFIER)`

### ב-App Store Connect:
- [ ] Bundle ID: `com.ituby.genie.ai` (בדיוק כך!)
- [ ] App ID תואם ב-Apple Developer Portal

**✅ תואם:** כן - הכל מוגדר ל-`com.ituby.genie.ai`

---

## ✅ 2. Product IDs תואמים

### בקוד (`iapConfig.ts`):
מוגדרים 6 מוצרי טוקנים:
1. ✅ `com.ituby.genie.ai.tokens.50`
2. ✅ `com.ituby.genie.ai.tokens.100`
3. ✅ `com.ituby.genie.ai.tokens.250`
4. ✅ `com.ituby.genie.ai.tokens.500`
5. ✅ `com.ituby.genie.ai.tokens.1000`
6. ✅ `com.ituby.genie.ai.tokens.2000`

### ב-App Store Connect:
**צריך לבדוק ידנית:**

לך ל-App Store Connect → Features → In-App Purchases

לכל מוצר, בדוק:
- [ ] Product ID בדיוק: `com.ituby.genie.ai.tokens.50`
- [ ] Product ID בדיוק: `com.ituby.genie.ai.tokens.100`
- [ ] Product ID בדיוק: `com.ituby.genie.ai.tokens.250`
- [ ] Product ID בדיוק: `com.ituby.genie.ai.tokens.500`
- [ ] Product ID בדיוק: `com.ituby.genie.ai.tokens.1000`
- [ ] Product ID בדיוק: `com.ituby.genie.ai.tokens.2000`

**⚠️ חשוב:** כל Product ID צריך להיות **זהים בדיוק** (כולל אותיות קטנות/גדולות, נקודות, ללא רווחים)

---

## ✅ 3. סטטוס המוצרים

### ב-App Store Connect:
לכל אחד מ-6 המוצרים, בדוק את ה-Status:

- [ ] `com.ituby.genie.ai.tokens.50` - Status: **Ready to Submit** או **Approved**
- [ ] `com.ituby.genie.ai.tokens.100` - Status: **Ready to Submit** או **Approved**
- [ ] `com.ituby.genie.ai.tokens.250` - Status: **Ready to Submit** או **Approved**
- [ ] `com.ituby.genie.ai.tokens.500` - Status: **Ready to Submit** או **Approved**
- [ ] `com.ituby.genie.ai.tokens.1000` - Status: **Ready to Submit** או **Approved**
- [ ] `com.ituby.genie.ai.tokens.2000` - Status: **Ready to Submit** או **Approved**

**❌ לא תקין אם Status הוא:**
- Missing Metadata
- Waiting for Review (רק אם לא Approved)
- Rejected
- Developer Action Needed

**⏳ זמן:** אם יצרת מוצרים עכשיו, חכה 2-3 שעות עד שהם מסתנכרנים

---

## ✅ 4. Apple Sandbox Account

### בדיקה במכשיר:
- [ ] התנתק מ-App Store הרגיל: Settings → App Store → Sign Out
- [ ] יצרת Sandbox Tester ב-App Store Connect → Users and Access → Sandbox Testers
- [ ] Sandbox Tester עם אימייל אמיתי (לא משויך ל-Apple ID רגיל)
- [ ] במכשיר, כשפותחים רכישה, מתחבר עם Sandbox Tester

**📝 הוראות:**
1. App Store Connect → Users and Access → Sandbox Testers → + Create
2. אימייל: (אימייל אמיתי שלא משויך ל-Apple ID)
3. Password: (מורכב)
4. First Name / Last Name: (כל שם)
5. Country/Region: (ישראל או ארה"ב)

**⚠️ חשוב:** לא משתמש ב-Apple ID הרגיל שלך לבדיקות!

---

## ✅ 5. קוד טעינת מוצרים

### בקוד (`iapService.ts`):
- ✅ משתמש ב-`fetchProducts({ skus: tokenProductIds, type: 'inapp' })`
- ✅ Product IDs נטענים מ-`TOKEN_PRODUCTS` 
- ✅ כל ה-Product IDs מוגדרים נכון
- ✅ יש retry logic ו-error handling

**✅ הקוד תקין**

---

## ✅ 6. Paid Apps Agreement

### ב-App Store Connect:
- [ ] Agreements, Tax, and Banking → Paid Apps Agreement → Status: **Active**

**❌ אם לא Active:** תשלומים לא יעבדו גם אם הכל מוגדר נכון!

---

## ✅ 7. בדיקות נוספות

### Capabilities:
- [ ] In-App Purchase מופעל ב-Xcode → Signing & Capabilities
- [ ] App Store Connect → App Information → In-App Purchase: **Enabled**

### Testing:
- [ ] Build ו-run על מכשיר פיזי (לא סימולטור)
- [ ] מכשיר מחובר לאינטרנט
- [ ] App Store נגיש (לא VPN חוסם)

---

## 📝 הוראות בדיקה

### שלב 1: בדוק ב-App Store Connect
1. היכנס ל-[App Store Connect](https://appstoreconnect.apple.com)
2. בחר את האפליקציה Genie
3. לך ל-Features → In-App Purchases
4. בדוק שכל 6 המוצרים קיימים
5. לכל מוצר, בדוק:
   - Product ID תואם בדיוק
   - Status הוא "Ready to Submit" או "Approved"

### שלב 2: בדוק Sandbox Testers
1. App Store Connect → Users and Access → Sandbox Testers
2. ודא שיש לפחות Sandbox Tester אחד
3. אם אין, צור אחד חדש

### שלב 3: בדוק Paid Apps Agreement
1. App Store Connect → Agreements, Tax, and Banking
2. ודא ש-Paid Apps Agreement הוא Active

### שלב 4: בדוק את הקוד
- ✅ Bundle ID: `com.ituby.genie.ai` (תואם)
- ✅ Product IDs: כל 6 המוצרים מוגדרים נכון
- ✅ קוד טעינת מוצרים: תקין

---

## 🚨 אם יש בעיות

### אם מוצרים לא נטענים:

1. **בדוק את הלוגים:**
   - פתח Xcode → Console
   - חפש: `📱 Loading products...`
   - חפש: `⚠️ Product IDs requested:`
   - זה יראה לך בדיוק מה הקוד מחפש

2. **בדוק Product IDs:**
   - השווה בין מה שמופיע בלוגים למה שיש ב-App Store Connect
   - ודא שהם זהים בדיוק (אותיות קטנות/גדולות, נקודות)

3. **בדוק Status:**
   - אם Status הוא "Missing Metadata" - מלא את כל השדות
   - אם Status הוא "Waiting for Review" - זה בסדר, אבל יכול לקחת זמן

4. **בדוק Sandbox:**
   - ודא שאתה מחובר עם Sandbox Tester
   - לא עם Apple ID הרגיל

---

## ✅ רשימת בדיקה סופית לפני Build

- [ ] Bundle ID תואם: `com.ituby.genie.ai`
- [ ] כל 6 המוצרים קיימים ב-App Store Connect
- [ ] כל Product ID תואם בדיוק (כולל אותיות קטנות/גדולות)
- [ ] כל מוצר במצב "Ready to Submit" או "Approved"
- [ ] Paid Apps Agreement הוא Active
- [ ] יש Sandbox Tester מוגדר
- [ ] הקוד משתמש ב-Product IDs הנכונים
- [ ] חיכית 2-3 שעות אחרי יצירת מוצרים (אם יצרת עכשיו)

---

## 📞 תמיכה

אם יש בעיה:
1. העתק את הלוגים מ-Xcode Console
2. צלם מסך של App Store Connect (Features → In-App Purchases)
3. שלח לי את הפרטים

---

**✅ אם כל ה-✅ מסומנים - אפשר לעשות Build!**

