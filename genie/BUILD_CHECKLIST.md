# ✅ Build Checklist - גרסה 1.0.5

## 📱 Entitlements (מה שהמשתמש הראה)

✅ **application-identifier**: `NBCWD9X4G4.com.ituby.genie.ai`
- Bundle ID: `com.ituby.genie.ai` ✅
- Team ID: `NBCWD9X4G4` ✅

✅ **get-task-allow**: `false`
- זה אומר שזה production build (לא development) ✅

✅ **beta-reports-active**: `true`
- זה אומר שזה ב-TestFlight/App Store ✅

✅ **aps-environment**: `production`
- Push Notifications מוגדרים ל-production ✅

✅ **com.apple.developer.team-identifier**: `NBCWD9X4G4`
- Team ID תואם ✅

---

## 📋 הגדרות בקוד

### Bundle ID
✅ `app.config.ts`: `bundleIdentifier: 'com.ituby.genie.ai'`
✅ `app.json`: `bundleIdentifier: "com.ituby.genie.ai"`
✅ `Info.plist`: `$(PRODUCT_BUNDLE_IDENTIFIER)` (נקבע מ-app.config.ts)
✅ `eas.json`: `appleTeamId: "NBCWD9X4G4"`

### Version
✅ `app.config.ts`: `version: '1.0.5'`
✅ `package.json`: `"version": "1.0.5"`
✅ `Info.plist`: `CFBundleShortVersionString: '1.0.5'`

### iOS Configuration
✅ `supportsTablet: false` - אפליקציה רק לאייפון
✅ `UIRequiresFullScreen: true` - רץ במסך מלא על אייפד
✅ `ITSAppUsesNonExemptEncryption: false` - לא צריך export compliance

---

## 🛍️ IAP Product IDs

### מוצרי טוקנים (6 מוצרים):
1. ✅ `com.ituby.genie.ai.tokens.50`
2. ✅ `com.ituby.genie.ai.tokens.100`
3. ✅ `com.ituby.genie.ai.tokens.250`
4. ✅ `com.ituby.genie.ai.tokens.500`
5. ✅ `com.ituby.genie.ai.tokens.1000`
6. ✅ `com.ituby.genie.ai.tokens.2000`

### מנוי (1 מוצר):
7. ✅ `com.ituby.genie.ai.premium.monthly`

---

## ✅ סיכום - הכל מוגדר נכון!

### מה שצריך לבדוק ב-App Store Connect:

1. **מוצרי IAP:**
   - ✅ כל 6 מוצרי הטוקנים קיימים
   - ✅ מנוי חודשי קיים
   - ⚠️ **חשוב**: הלוקליזציה תוקנה? (פחות מ-55 תווים, ללא "Buy")
   - ⚠️ **חשוב**: כל המוצרים במצב "Ready to Submit"?

2. **גרסה חדשה:**
   - ⚠️ **חשוב**: האם יש גרסה 1.0.5 ב-App Store Connect?
   - ⚠️ **חשוב**: האם המוצרים משויכים לגרסה החדשה?

3. **Capabilities:**
   - ✅ In-App Purchase - צריך להיות מופעל
   - ✅ Push Notifications - מופעל (aps-environment: production)

---

## 🎯 מה שצריך לעשות לפני הבילד:

1. **תיקון לוקליזציה** (אם עדיין לא):
   - עבור לכל מוצר ב-App Store Connect
   - תיקון התיאורים (פחות מ-55 תווים, ללא "Buy")
   - שמור ומתן לאישור

2. **יצירת גרסה חדשה** (אם עדיין לא):
   - App Store Connect → My Apps → Genie
   - Versions → + Create New Version
   - גרסה: 1.0.5

3. **שיוך מוצרים לגרסה:**
   - בעת ה-submission, תוכל לשייך את המוצרים לגרסה החדשה

---

## ✅ הכל מוכן לבילד!

כל ההגדרות בקוד נכונות:
- ✅ Bundle ID תואם
- ✅ Version: 1.0.5
- ✅ Team ID: NBCWD9X4G4
- ✅ Product IDs תואמים
- ✅ Info.plist מוגדר נכון
- ✅ EAS Build מוגדר נכון

**השאר תלוי ב-App Store Connect:**
- לוקליזציה מאושרת
- מוצרים במצב "Ready to Submit"
- גרסה חדשה נוצרה



