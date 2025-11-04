# 🚀 מדריך הגדרת Google Play Console - Genie AI

## 📍 קישור לכניסה
**Google Play Console**: https://play.google.com/console

היכנס עם חשבון הגוגל שלך (זה ששייך לחשבון המפתח)

---

## 📋 נתונים שצריך לספק

### 1. Package Name
```
com.ituby.genie.ai
```
זה ה-Package Name של האפליקציה - זה צריך להיות זהה למה שיש בקוד.

### 2. Service Account (חובה לולידציה!)
צריך ליצור Service Account ב-Google Cloud Console כדי לאמת רכישות:
- זה מפתח JSON שישמש את Supabase לוודא שהרכישות אמיתיות
- בלי זה - הרכישות לא יעבדו

---

## 🛍️ מוצרים שצריך ליצור

### שלב 1: יצירת האפליקציה (אם עדיין לא)
1. היכנס ל-[Google Play Console](https://play.google.com/console)
2. לחץ **Create app**
3. מלא פרטים בסיסיים:
   - **App name**: Genie AI
   - **Default language**: English (או עברית)
   - **App or game**: App
   - **Free or paid**: Free (אפליקציה חינמית עם רכישות פנימיות)

---

### שלב 2: יצירת מוצרי טוקנים (Managed Products)

**למה Managed Products?**
- זה מוצרים חד-פעמיים שניתן לקנות שוב ושוב
- כל רכישה צריכה להיות "נצרכת" (consumed) כדי שניתן יהיה לקנות שוב

#### 🎯 הוראות מדויקות - צעד אחר צעד:

**צעד 1: כניסה למוצרים**
1. היכנס ל-[Google Play Console](https://play.google.com/console)
2. בצד שמאל, תחת **Monetization setup** (או פשוט בחיפוש למעלה), לחץ **Monetize** או **Monetization**
3. בתפריט הצד, לחץ **In-app products**
4. תראה רשימה ריקה (או רשימת מוצרים קיימים)
5. לחץ על הכפתור הכחול **+ Create product** (בצד שמאל למעלה)

**צעד 2: בחירת סוג מוצר**
1. תראה חלון עם 3 אפשרויות:
   - **Managed product** ← זה מה שצריך לבחור!
   - **Subscription**
   - **Unmanaged product**
2. לחץ על **Managed product**
3. לחץ **Next**

**צעד 3: מילוי פרטי המוצר הראשון (50 Tokens)**

עכשיו אתה במסך "Product details":

1. **Product ID** (חשוב מאוד - העתק בדיוק!):
   - הקלד: `com.ituby.genie.ai.tokens.50`
   - ⚠️ בדיוק כך, כולל נקודות!

2. **Name**:
   - הקלד: `50 Tokens`
   - או בעברית: `50 טוקנים`

3. **Description**:
   - לחץ על כפתור **+ Add language** או **Manage translations**
   - הוסף עברית (Hebrew) ואנגלית (English):
     - **English**: `Purchase 50 tokens to use in Genie AI app`
     - **עברית**: `קנה 50 טוקנים לשימוש באפליקציה Genie AI`

4. **Price**:
   - לחץ על **Set price** או כפתור המחיר
   - בחר את המחיר: **$2.99** (או המחיר שהגדרת)
   - המחיר ימיר אוטומטית למטבעות אחרים

5. **Status**:
   - בחר **Active** (אם לא מופיע עכשיו, זה יופיע אחרי השמירה)

6. **Save**:
   - לחץ **Save** (בתחתית)
   - תראה הודעת הצלחה או מעבר למסך הבא

**צעד 4: חזור וצור את שאר 5 המוצרים**

עכשיו חזור על התהליך ל-5 המוצרים הנוספים:

**מוצר 2: 100 Tokens**
- **Product ID**: `com.ituby.genie.ai.tokens.100`
- **Name**: `100 Tokens`
- **Description**: `Purchase 100 tokens to use in Genie AI app` / `קנה 100 טוקנים לשימוש באפליקציה Genie AI`
- **Price**: `$4.99`

**מוצר 3: 250 Tokens**
- **Product ID**: `com.ituby.genie.ai.tokens.250`
- **Name**: `250 Tokens`
- **Description**: `Purchase 250 tokens to use in Genie AI app` / `קנה 250 טוקנים לשימוש באפליקציה Genie AI`
- **Price**: `$12.99`

**מוצר 4: 500 Tokens**
- **Product ID**: `com.ituby.genie.ai.tokens.500`
- **Name**: `500 Tokens`
- **Description**: `Purchase 500 tokens to use in Genie AI app` / `קנה 500 טוקנים לשימוש באפליקציה Genie AI`
- **Price**: `$24.99`

**מוצר 5: 1000 Tokens**
- **Product ID**: `com.ituby.genie.ai.tokens.1000`
- **Name**: `1000 Tokens`
- **Description**: `Purchase 1000 tokens to use in Genie AI app` / `קנה 1000 טוקנים לשימוש באפליקציה Genie AI`
- **Price**: `$49.99`

**מוצר 6: 2000 Tokens**
- **Product ID**: `com.ituby.genie.ai.tokens.2000`
- **Name**: `2000 Tokens`
- **Description**: `Purchase 2000 tokens to use in Genie AI app` / `קנה 2000 טוקנים לשימוש באפליקציה Genie AI`
- **Price**: `$99.99`

**לכל מוצר:**
- לך ל-**In-app products** → **+ Create product** → **Managed product**
- מלא את הפרטים המדויקים מהרשימה למעלה
- לחץ **Save**

**⚠️ חשוב מאוד:**
- Product IDs חייבים להיות **זהים בדיוק** למה שיש בקוד!
- אחרת הרכישות לא יעבדו!
- ודא שכל המוצרים ב-Status **Active** (תוכל לראות זאת ברשימת המוצרים)

---

### שלב 3: יצירת מנוי חודשי (Subscription)

#### 🎯 הוראות מדויקות - צעד אחר צעד:

**צעד 1: כניסה למנויים**
1. ב-Google Play Console, בצד שמאל תחת **Monetization**, לחץ **Subscriptions**
   - או לחץ על **Monetize** → **Subscriptions**
2. אם זו הפעם הראשונה, תראה הודעה "Create your first subscription"
3. לחץ **+ Create subscription** (כפתור כחול)

**צעד 2: מילוי פרטי המנוי**

**במסך "Subscription details":**

1. **Product ID** (חשוב מאוד - העתק בדיוק!):
   - הקלד: `com.ituby.genie.ai.premium.monthly`
   - ⚠️ בדיוק כך, כולל נקודות!

2. **Name**:
   - הקלד: `Premium Monthly`
   - או בעברית: `מנוי פרימיום חודשי`

3. **Description**:
   - לחץ **+ Add language** או **Manage translations**
   - הוסף עברית ואנגלית:
     - **English**: `Get 1,000 tokens per month plus access to advanced AI models and priority support`
     - **עברית**: `קבל 1,000 טוקנים בחודש + גישה למודלים מתקדמים + תמיכה עדיפה`

4. **Billing period** (תקופת חיוב):
   - לחץ על התפריט הנפתח
   - בחר: **Monthly** (חודשי)
   - או **1 month**

5. **Price**:
   - לחץ **Set price** או כפתור המחיר
   - בחר: **$14.99**

6. **Free trial** (נסיון חינם - אופציונלי):
   - אם אתה רוצה נסיון חינם, לחץ **Add free trial**
   - בחר: **7 days**
   - או השאר ריק אם לא רוצה נסיון חינם

7. **Grace period** (תקופת חסד - אופציונלי):
   - אם אתה רוצה תקופת חסד (זמן נוסף אחרי ביטול):
   - לחץ **Add grace period**
   - בחר: **3 days**
   - או השאר ריק

8. **Save**:
   - לחץ **Save** בתחתית
   - המנוי ייווצר

**צעד 3: הגדרת Base Plan (אם נדרש)**
- אחרי השמירה, Google עשוי לבקש להגדיר "Base plan"
- אם כן, זה פשוט תוכנית הבסיס שכבר יצרת
- ודא שהמחיר הוא $14.99 והתקופה היא Monthly

**צעד 4: הוספת Offers (הצעות - אופציונלי)**

אם אתה רוצה להוסיף הצעות מיוחדות (למשל הנחות):

1. במסך המנוי, לחץ **+ Add offer** או **Offers**
2. **Offer name**: למשל "New user discount"
3. **Pricing**:
   - בחר **Pay-as-you-go pricing**
   - או **Fixed pricing**
4. **Discount**: בחר הנחה (למשל 50% ל-3 חודשים)
5. **Save**

**⚠️ חשוב:**
- אתה יכול לדלג על Offers אם אתה לא צריך אותם עכשיו
- תמיד אפשר להוסיף אחר כך

---

## 🔐 הגדרת Service Account (לולידציה)

**למה זה חשוב?**
- כדי ש-Supabase יוכל לוודא שהרכישות אמיתיות
- Google דורשת זה כדי לאמת רכישות דרך ה-API

### תהליך - צעד אחר צעד:

**צעד 1: פתח Google Cloud Console**
1. פתח דפדפן חדש או טאב חדש
2. היכנס ל: https://console.cloud.google.com
3. ודא שאתה מחובר לאותו חשבון Google שקשור ל-Play Console
4. בחר את הפרויקט הנכון (אם יש לך כמה פרויקטים)

**צעד 2: כניסה ל-Service Accounts**
1. בתפריט בצד שמאל (☰), לחץ על **IAM & Admin**
   - או חפש בחיפוש למעלה: `Service Accounts`
2. בתפריט התת-תפריט, לחץ **Service Accounts**
3. תראה רשימה של Service Accounts (אם יש)

**צעד 3: יצירת Service Account חדש**
1. לחץ על הכפתור הכחול **+ CREATE SERVICE ACCOUNT** (בצד שמאל למעלה)
2. במסך "Create service account":
   
   **Service account details:**
   - **Service account name**: הקלד `genie-iap-validator`
   - **Service account ID**: ימלא אוטומטית (אפשר לשנות אם צריך)
   - **Description**: הקלד `Service account for validating Google Play IAP purchases`
   
3. לחץ **CREATE AND CONTINUE** (בתחתית)

**צעד 4: הוספת תפקיד (Role)**
1. במסך "Grant this service account access to project":
   - לחץ על **SELECT A ROLE** (תפריט נפתח)
2. חפש בחיפוש: `Monetization Admin`
   - או אם לא מופיע, חפש: `Service Account`
   - אם עדיין לא, בחר **Service Account User** (זה בסדר גם)
3. לחץ על התפקיד שהצגת
4. לחץ **CONTINUE** (בתחתית)
5. במסך הבא, לחץ **DONE**

**צעד 5: יצירת מפתח (Key) JSON**
1. חזור למסך Service Accounts
2. לחץ על ה-Service Account שיצרת (`genie-iap-validator`)
3. תראה טאבים למעלה: **DETAILS**, **PERMISSIONS**, **KEYS**
4. לחץ על הטאב **KEYS**
5. לחץ **ADD KEY** (כפתור כחול) → **Create new key**
6. בחלון שנפתח:
   - בחר **JSON** (יש גם P12, אבל JSON יותר נוח)
7. לחץ **CREATE**
8. **קובץ JSON יורד אוטומטית!** - שמור אותו במקום בטוח

**צעד 6: העתקת תוכן הקובץ**
1. פתח את קובץ ה-JSON שהורדת (בכל עורך טקסט)
2. העתק את **כל התוכן** - זה JSON ארוך שנראה כך:
   ```json
   {
     "type": "service_account",
     "project_id": "...",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     ...
   }
   ```
3. שמור את התוכן הזה - תצטרך אותו ל-Supabase!

**⚠️ חשוב מאוד:**
- שמור את קובץ ה-JSON במקום בטוח
- אל תחלוק אותו עם אף אחד!
- זה כמו סיסמה - מי שיש לו אותו יכול לגשת לחשבון שלך

---

## ☁️ הגדרת Supabase

אחרי שיש לך את ה-Service Account JSON:

#### 🎯 הוראות מדויקות - צעד אחר צעד:

**צעד 1: כניסה ל-Supabase**
1. פתח דפדפן חדש או טאב חדש
2. היכנס ל: https://app.supabase.com
3. התחבר לחשבון שלך
4. בחר את הפרויקט שלך (Genie)

**צעד 2: הוספת Secret**
1. בתפריט בצד שמאל, לחץ **Settings** (⚙️)
2. בתפריט התת, לחץ **Edge Functions**
3. תחת **Secrets**, תראה רשימה של Secrets קיימים
4. לחץ **Add new secret** (כפתור כחול) או **+ New secret**

**צעד 3: מילוי פרטי ה-Secret**
1. **Name**: הקלד בדיוק: `GOOGLE_SERVICE_ACCOUNT_JSON`
   - ⚠️ חשוב: אותיות גדולות וקטנות חשובות!
2. **Value**: הדבק את **כל תוכן קובץ ה-JSON** שהורדת
   - זה כולל את כל הגרשיים, הפסיקים והסוגריים
   - העתק הכל מתחילת ה-`{` עד סוף ה-`}`
3. לחץ **Add secret** או **Save**

**או דרך CLI** (אם אתה מעדיף):
```bash
cd /Users/itamartuby/Desktop/GenieAI/genie
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"..."}'
```

**⚠️ שים לב:**
- אם ה-JSON ארוך, העתק אותו בדיוק כולל כל הגרשיים
- ודא שהשם הוא בדיוק: `GOOGLE_SERVICE_ACCOUNT_JSON` (בלי שגיאות)
- אחרי השמירה, תמתין 1-2 דקות עד שהשינוי ייכנס לתוקף

---

## 🧪 הגדרת בדיקות (Testing)

### הוספת License Testers

#### 🎯 הוראות מדויקות - צעד אחר צעד:

**צעד 1: כניסה להגדרות**
1. ב-Google Play Console, בתפריט בצד שמאל, לחץ **Settings** (⚙️)
2. בתפריט התת, לחץ **License testing**

**צעד 2: הוספת כתובות אימייל**
1. תחת **License testers**, תראה שדה טקסט
2. הוסף כתובות אימייל (אחת בכל שורה):
   - את כתובת האימייל שלך (המפתח)
   - כתובות של בודקים נוספים
3. לחץ **Save changes**

**⚠️ חשוב:**
- משתמשים אלה יוכלו לבצע רכישות **ללא חיוב כספי**
- זה רק לבדיקות - לא יחויבו כסף אמיתי!

---

### העלאת גרסת בדיקה

#### 🎯 הוראות מדויקות - צעד אחר צעד:

**צעד 1: בניית האפליקציה**
1. פתח טרמינל
2. נווט לתיקיית הפרויקט:
   ```bash
   cd /Users/itamartuby/Desktop/GenieAI/genie
   ```
3. בנה את האפליקציה:
   ```bash
   eas build --platform android --profile production
   ```
4. המתן לסיום הבנייה (יכול לקחת 10-20 דקות)
5. **הורד את קובץ ה-.aab** מ-EAS (יופיע קישור בסיום הבנייה)

**צעד 2: העלאת הגרסה ל-Internal Testing**
1. ב-Google Play Console, בתפריט בצד שמאל, לחץ **Testing**
2. לחץ **Internal testing**
3. אם זו הפעם הראשונה:
   - לחץ **Create new release**
   - או לחץ על הכפתור הכחול **+ Create release**
4. אם יש לך כבר release קודם:
   - לחץ **+ New release** או **Edit release**

**צעד 3: העלאת קובץ AAB**
1. תחת **App bundles**, לחץ **Upload** או **Browse files**
2. בחר את קובץ ה-.aab שהורדת מ-EAS
3. המתן שהקובץ יעלה (יכול לקחת כמה דקות)

**צעד 4: הוספת Release Notes**
1. תחת **Release name**: הקלד למשל `1.0.0 - Test Release`
2. תחת **Release notes**:
   - הוסף הערות על מה יש בגרסה
   - למשל: "Initial release with IAP support"

**צעד 5: פרסום הגרסה**
1. לחץ **Save** (בתחתית)
2. תראה מסך סקירה - בדוק שהכל נכון
3. לחץ **Review release**
4. לחץ **Start rollout** או **Rollout to Internal testing**
5. הגרסה עכשיו זמינה לבדיקה!

**צעד 6: הוספת בודקים**
1. במסך **Internal testing**, לחץ על הטאב **Testers**
2. תחת **Email addresses**:
   - הוסף כתובות אימייל של בודקים
   - או תחת **Groups**: צור קבוצת בדיקה חדשה
3. לחץ **Save changes**
4. בודקים יקבלו קישור להורדה דרך אימייל

**⚠️ חשוב:**
- וודא שאתה רשום כ-License Tester (לפי השלב הקודם)
- רק אז תוכל לבצע רכישות ללא חיוב כספי

---

## ✅ רשימת בדיקות

לפני שאתה מפרסם:

- [ ] כל 6 מוצרי הטוקנים יצורים (Managed Products)
- [ ] מנוי חודשי אחד יצור (Subscription)
- [ ] כל ה-Product IDs זהים בדיוק למה שבקוד:
  - `com.ituby.genie.ai.tokens.50`
  - `com.ituby.genie.ai.tokens.100`
  - `com.ituby.genie.ai.tokens.250`
  - `com.ituby.genie.ai.tokens.500`
  - `com.ituby.genie.ai.tokens.1000`
  - `com.ituby.genie.ai.tokens.2000`
  - `com.ituby.genie.ai.premium.monthly`
- [ ] כל המוצרים ב-Status **Active**
- [ ] Service Account נוצר ב-Google Cloud
- [ ] מפתח JSON הועתק ל-Supabase (`GOOGLE_SERVICE_ACCOUNT_JSON`)
- [ ] Edge Function `validate-iap-receipt` deployed
- [ ] בדיקת Internal Testing עברה בהצלחה

---

## 📞 קישורים שימושיים

- **Google Play Console**: https://play.google.com/console
- **Google Cloud Console**: https://console.cloud.google.com
- **Supabase Dashboard**: https://app.supabase.com
- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [Google Play In-App Products](https://support.google.com/googleplay/android-developer/answer/9859453)

---

## 🎯 סיכום מה צריך

1. **חשבון Google Play Console** ✅ (יש לך)
2. **מוצרים ב-Play Console**:
   - 6 Managed Products (טוקנים)
   - 1 Subscription (מנוי חודשי)
3. **Service Account JSON**:
   - ליצור ב-Google Cloud Console
   - להעביר ל-Supabase Secrets
4. **בדיקה**:
   - להעלות גרסת Internal Testing
   - לבדוק רכישות

---

**✨ בהצלחה! אם יש שאלות או בעיות - אני כאן לעזור! ✨**

