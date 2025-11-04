# 📱 מדריך הגשת First In-App Purchase

## 🎯 הבעיה
כל המוצרים במצב **"Developer Action Needed"** כי זו הקנייה הראשונה באפליקציה.

Apple דורשים שמוצרי IAP ראשונים יוגשו **יחד עם גרסה חדשה** של האפליקציה.

---

## ✅ פתרון - צעד אחר צעד

### שלב 1: בדוק את גרסת האפליקציה

**בקוד:**
- `app.config.ts`: `version: '1.0.4'`
- `Info.plist`: `CFBundleShortVersionString: '1.0.3'`

**⚠️ חשוב:** גרסה חדשה = מספר גרסה גבוה יותר (למשל 1.0.5)

---

### שלב 2: עדכן את גרסת האפליקציה

#### אפשרות א: דרך EAS (מומלץ)
EAS יעדכן אוטומטית את ה-build number, אבל צריך לעדכן את ה-version:

1. פתח `app.config.ts`
2. עדכן את ה-version לגרסה חדשה (למשל 1.0.5)
3. שמור

#### אפשרות ב: ידנית
עדכן גם ב-`Info.plist`:
- `CFBundleShortVersionString` → גרסה חדשה

---

### שלב 3: צור גרסה חדשה ב-App Store Connect

1. היכנס ל-[App Store Connect](https://appstoreconnect.apple.com)
2. בחר את האפליקציה **Genie**
3. לך ל-**App Store** → **Versions**
4. לחץ על **+ Version** (או "+" ליד הגרסה הנוכחית)
5. בחר מספר גרסה חדש (למשל **1.0.5**)
6. מלא את השדות הנדרשים:
   - **What's New in This Version** (תיאור עדכון)
   - Screenshots (אם צריך)
   - וכו'

---

### שלב 4: צרף את המוצרים לגרסה

**זה החלק החשוב!**

1. בגרסה החדשה שיצרת, גלול למטה
2. מצא את הסעיף **"In-App Purchases and Subscriptions"**
3. לחץ על **"+ In-App Purchase"** או **"Select"**
4. בחר את כל 6 המוצרים:
   - `com.ituby.genie.ai.tokens.50`
   - `com.ituby.genie.ai.tokens.100`
   - `com.ituby.genie.ai.tokens.250`
   - `com.ituby.genie.ai.tokens.500`
   - `com.ituby.genie.ai.tokens.1000`
   - `com.ituby.genie.ai.tokens.2000`
5. לחץ **Save** או **Done**

**⚠️ חשוב מאוד:** כל המוצרים צריכים להיות צמודים לגרסה לפני הגשה!

---

### שלב 5: בדוק שהכל תקין

לפני שתגיש, ודא:

#### בגרסה החדשה:
- [ ] כל 6 המוצרים מופיעים ב-"In-App Purchases and Subscriptions"
- [ ] כל מוצר במצב "Ready to Submit" (לא "Developer Action Needed")
- [ ] גרסה חדשה מוגדרת (לא 1.0.0)

#### במוצרים עצמם:
- [ ] כל מוצר עם Status: "Ready to Submit"
- [ ] כל Product ID תואם בדיוק
- [ ] כל מוצר עם תיאור ומחיר

---

### שלב 6: Build והגש

#### Build:
```bash
cd genie
eas build --platform ios --profile production
```

#### Submit:
```bash
eas submit --platform ios
```

**או דרך App Store Connect:**
1. אחרי שה-build מוכן, היכנס ל-App Store Connect
2. בגרסה החדשה, לחץ **Add Build**
3. בחר את ה-build החדש
4. ודא שכל המוצרים צמודים לגרסה
5. לחץ **Submit for Review**

---

## ⚠️ שגיאות נפוצות

### "Developer Action Needed" עדיין מופיע
**סיבה:** המוצרים לא צמודים לגרסה החדשה

**פתרון:**
1. לך לגרסה החדשה ב-App Store Connect
2. ודא שכל המוצרים מופיעים ב-"In-App Purchases and Subscriptions"
3. אם לא - לחץ "+" ובחר אותם

### "Cannot submit version without build"
**סיבה:** לא העלאת build לגרסה

**פתרון:**
1. Build את האפליקציה
2. העלה את ה-build דרך EAS או Xcode
3. הוסף את ה-build לגרסה החדשה

### "In-App Purchase must be approved"
**סיבה:** מוצר לא במצב "Ready to Submit"

**פתרון:**
1. לך ל-Features → In-App Purchases
2. לכל מוצר, ודא שכל השדות מלאים
3. ודא שהמוצר במצב "Ready to Submit"

---

## 📋 Checklist סופי לפני הגשה

### בגרסה החדשה:
- [ ] גרסה חדשה נוצרה (למשל 1.0.5)
- [ ] כל 6 המוצרים צמודים לגרסה
- [ ] Build חדש מועלה
- [ ] Build מצורף לגרסה

### במוצרים:
- [ ] כל 6 המוצרים במצב "Ready to Submit"
- [ ] כל Product ID תואם בדיוק
- [ ] כל מוצר עם תיאור ומחיר

### בקוד:
- [ ] `version` עודכן ב-`app.config.ts`
- [ ] Bundle ID תואם: `com.ituby.genie.ai`
- [ ] Product IDs תואמים

---

## 🎯 סיכום

**הבעיה:** "Developer Action Needed" = צריך להגיש עם גרסה חדשה

**הפתרון:**
1. ✅ עדכן גרסה בקוד (1.0.5)
2. ✅ צור גרסה חדשה ב-App Store Connect
3. ✅ צרף את כל 6 המוצרים לגרסה
4. ✅ Build והגש הכל יחד

**זכור:** אחרי שהגרסה הראשונה עם IAP תאושר, מוצרים נוספים יוכלו להיגשות בנפרד!

---

## 📞 אם יש בעיות

אם אחרי שעשית הכל המוצרים עדיין במצב "Developer Action Needed":

1. ודא שצירפת את המוצרים לגרסה החדשה (לא רק יצרת אותם)
2. ודא שהגרסה החדשה לא ב-"Prepare for Submission" אלא ב-"Ready to Submit"
3. בדוק שכל המוצרים במצב "Ready to Submit" (לא "Missing Metadata")

---

**✅ אחרי שתעשה את זה - הכל אמור לעבוד!**

