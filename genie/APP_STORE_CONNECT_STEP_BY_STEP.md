# 📱 הוראות מדויקות - App Store Connect

## 🎯 מצב: First In-App Purchase - צריך להגיש עם גרסה חדשה

---

## 📍 שלב 1: מצא את הדף של האפליקציה

### איפה לחפש:
1. היכנס ל-[App Store Connect](https://appstoreconnect.apple.com)
2. לחץ על **"My Apps"** (בחלק העליון)
3. בחר את האפליקציה **"Genie"** (או השם שלך)

---

## 📍 שלב 2: מצא את "App Store" Tab

### איפה לחפש:
1. בחלק העליון של הדף, תראה טאבים:
   - **App Information**
   - **Pricing and Availability**
   - **App Store** ← **כאן!**
   - **TestFlight**
   - וכו'

2. לחץ על **"App Store"**

---

## 📍 שלב 3: מצא את "Versions" או "App Information"

### איפה לחפש:
בתוך דף **App Store**, תראה:

**אם יש לך גרסה קיימת:**
- תראה רשימה של גרסאות (למשל "1.0.0", "1.0.1")
- ליד כל גרסה יש כפתור **"+"** או **"Add Version"**

**אם אין לך גרסה עדיין:**
- תראה הודעה "Prepare for Submission"
- או תראה **"App Information"** עם כפתור **"Create Version"**

---

## 📍 שלב 4: צור גרסה חדשה

### איפה לחפש - שתי אפשרויות:

#### אפשרות א: אם יש לך גרסה קיימת
1. מצא את הגרסה האחרונה (למשל "1.0.0")
2. ליד הגרסה יש כפתור **"+"** או **"Add Version"**
3. לחץ עליו
4. בחר מספר גרסה חדש (למשל **1.0.5**)

#### אפשרות ב: אם אין לך גרסה עדיין
1. לחץ על **"Create Version"** או **"Prepare for Submission"**
2. בחר מספר גרסה (למשל **1.0.5**)
3. מלא את השדות הנדרשים

---

## 📍 שלב 5: מצא את "In-App Purchases and Subscriptions"

### ⚠️ זה החלק החשוב - איפה לחפש:

**בתוך הגרסה החדשה שיצרת:**

1. גלול למטה בדף הגרסה
2. תראה סעיפים שונים:
   - **Version Information**
   - **What's New in This Version**
   - **App Icon and Screenshots**
   - **App Review Information**
   - **In-App Purchases and Subscriptions** ← **כאן!**

### אם לא רואה את הסעיף:

**אפשרות 1:** גלול עוד יותר למטה - הוא יכול להיות בסוף

**אפשרות 2:** בדוק אם יש טאבים נוספים:
- לחץ על **"Pricing"** או **"Localization"** - יכול להיות שם

**אפשרות 3:** אם אין את הסעיף בכלל:
- זה אומר שהאפליקציה עדיין לא מוכנה לגרסה
- צריך קודם ליצור את הגרסה הראשונה

---

## 📍 שלב 6: הוסף את המוצרים

### איפה לחפש ב-"In-App Purchases and Subscriptions":

1. תראה רשימה (יכול להיות ריקה)
2. תראה כפתור **"+"** או **"Select"** או **"Add In-App Purchase"**
3. לחץ עליו
4. תראה רשימה של כל המוצרים שיצרת
5. **סמן** את כל 6 המוצרים:
   - ☑️ com.ituby.genie.ai.tokens.50
   - ☑️ com.ituby.genie.ai.tokens.100
   - ☑️ com.ituby.genie.ai.tokens.250
   - ☑️ com.ituby.genie.ai.tokens.500
   - ☑️ com.ituby.genie.ai.tokens.1000
   - ☑️ com.ituby.genie.ai.tokens.2000
6. לחץ **"Done"** או **"Save"**

---

## 🔍 אם לא מוצא את הכפתורים

### בדיקה 1: האם האפליקציה מוכנה?
1. לך ל-**App Information**
2. בדוק שיש לך:
   - Bundle ID מוגדר
   - App Name
   - Primary Language
   - Category

### בדיקה 2: האם יש לך גרסה קיימת?
1. לך ל-**App Store**
2. בדוק אם יש רשימה של גרסאות
3. אם אין - צריך ליצור גרסה ראשונה

### בדיקה 3: האם המוצרים קיימים?
1. לך ל-**Features** → **In-App Purchases**
2. בדוק שיש לך 6 מוצרים ברשימה
3. אם אין - צריך ליצור אותם קודם

---

## 📸 איפה בדיוק לחפש - תמונות מפורטות

### 1. דף הראשי של האפליקציה:
```
App Store Connect
├── My Apps
│   └── Genie
│       ├── App Information
│       ├── Pricing and Availability
│       ├── App Store ← כאן!
│       ├── TestFlight
│       └── ...
```

### 2. בתוך דף App Store:
```
App Store
├── App Store Versions
│   ├── 1.0.0 (גרסה קיימת)
│   │   └── + Add Version ← כאן!
│   └── ...
```

### 3. בתוך גרסה חדשה:
```
Version 1.0.5
├── Version Information
├── What's New
├── App Icon
├── Screenshots
├── App Review Information
└── In-App Purchases and Subscriptions ← כאן!
    └── + Select In-App Purchases ← כאן!
```

---

## ⚠️ אם עדיין לא מוצא

### נסה:
1. **רענן את הדף** (F5 או Cmd+R)
2. **נסה בדפדפן אחר** (Chrome, Safari, Firefox)
3. **נסה במצב incognito**
4. **חכה כמה דקות** - לפעמים לוקח זמן לעדכן

### או:
1. **צור טיקט תמיכה** ב-App Store Connect
2. **שאל בפורום** של Apple Developer

---

## 📞 תמיכה

אם אתה לא מוצא את הכפתורים, שלח לי:
1. **צילום מסך** של דף App Store
2. **צילום מסך** של דף Features → In-App Purchases
3. **איזה גרסה** יש לך כרגע באפליקציה

ואני אעזור לך למצוא את זה!

---

## 🎯 סיכום מהיר

1. **App Store Connect** → **My Apps** → **Genie**
2. **App Store** (טאב עליון)
3. **+ Version** (ליד גרסה קיימת) או **Create Version**
4. **גלול למטה** בגרסה החדשה
5. **In-App Purchases and Subscriptions** → **+ Select**
6. **סמן את כל המוצרים** → **Done**

---

**✅ אם עדיין לא מוצא - שלח צילום מסך ואני אעזור!**

