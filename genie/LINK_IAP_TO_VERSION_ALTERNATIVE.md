# 🔗 איך לשייך מוצרי IAP לגרסה - דרכים חלופיות

## 🎯 הבעיה: לא מוצא איפה לשייך מוצרים לבנייה

---

## ✅ דרך 1: דרך המוצרים עצמם (הכי פשוט)

### שלב 1: לך למוצרים
1. **App Store Connect** → **My Apps** → **Genie**
2. לחץ על **Features** (בתפריט השמאלי)
3. לחץ על **In-App Purchases**

### שלב 2: לך לכל מוצר
1. לחץ על אחד מהמוצרים (למשל `com.ituby.genie.ai.tokens.50`)
2. גלול למטה בדף המוצר
3. חפש סעיף **"App Store Versions"** או **"Versions"**
4. שם תראה רשימה של גרסאות
5. לחץ **"+ Add to Version"** או **"Select Version"**
6. בחר את הגרסה החדשה (למשל 1.0.5)
7. שמור

**חזור על זה לכל אחד מ-6 המוצרים!**

---

## ✅ דרך 2: דרך הגרסה (אם יש)

### שלב 1: בדוק אם יש גרסה
1. **App Store Connect** → **My Apps** → **Genie**
2. לחץ על **App Store** (טאב עליון)
3. בדוק אם יש רשימה של גרסאות

### אם יש גרסה:
1. לחץ על הגרסה (למשל "1.0.0")
2. גלול למטה
3. חפש **"In-App Purchases"** או **"Associated In-App Purchases"**
4. לחץ **"+ Add"** או **"Select"**

### אם אין גרסה:
**צריך ליצור גרסה ראשונה!**

---

## ✅ דרך 3: דרך TestFlight (אם יש build)

### שלב 1: לך ל-TestFlight
1. **App Store Connect** → **My Apps** → **Genie**
2. לחץ על **TestFlight** (טאב עליון)

### שלב 2: אם יש build
1. בחר את ה-build
2. לחץ **"Submit for Review"**
3. במסך ההגשה, תראה אפשרות להוסיף In-App Purchases
4. שם תוכל לבחור את המוצרים

---

## ✅ דרך 4: דרך App Review Information

### שלב 1: לך ל-App Information
1. **App Store Connect** → **My Apps** → **Genie**
2. לחץ על **App Store** → **App Information**

### שלב 2: חפש App Review Information
1. גלול למטה
2. חפש **"App Review Information"**
3. שם יכול להיות מקום לשייך מוצרים

---

## ✅ דרך 5: דרך ה-Build עצמו (אחרי העלאה)

### שלב 1: העלה build
1. Build את האפליקציה:
```bash
eas build --platform ios --profile production
```

### שלב 2: אחרי שה-build מוכן
1. לך ל-**TestFlight**
2. בחר את ה-build החדש
3. לחץ **"Submit for Review"**
4. במסך ההגשה, תראה:
   - **"In-App Purchases"** או
   - **"Associated Purchases"** או
   - **"Select In-App Purchases"**
5. שם תוכל לבחור את המוצרים

---

## 🔍 בדיקה: האם המוצרים מוכנים?

### לך לבדוק:
1. **Features** → **In-App Purchases**
2. לכל מוצר, בדוק:
   - Status: **"Ready to Submit"** (לא "Developer Action Needed")
   - כל השדות מלאים (תיאור, מחיר, וכו')

### אם Status הוא "Developer Action Needed":
**זה אומר שצריך לשייך אותם לגרסה!**

---

## 💡 רעיון: אולי זה אוטומטי?

### נסה:
1. **צור גרסה חדשה** (אם אין)
2. **Build והעלה** את האפליקציה
3. **הגש ל-App Review**
4. **במסך ההגשה** - שם תראה אפשרות להוסיף מוצרים

**אולי Apple מאפשרים להוסיף את המוצרים רק בזמן ההגשה!**

---

## 📸 מה לעשות עכשיו

### שלב 1: בדוק את המצב
1. לך ל-**Features** → **In-App Purchases**
2. צלם מסך של הרשימה
3. לחץ על מוצר אחד
4. צלם מסך של דף המוצר (גלול למטה)

### שלב 2: בדוק את הגרסה
1. לך ל-**App Store**
2. צלם מסך של מה שאתה רואה
3. אם יש גרסה - צלם אותה

### שלב 3: שלח לי
שלח את הצילומי מסך ואני אעזור לך למצוא את המקום הנכון!

---

## 🎯 סיכום - מה לנסות

1. **Features → In-App Purchases** → לחץ על מוצר → חפש "Versions"
2. **App Store** → גרסה → גלול למטה → חפש "In-App Purchases"
3. **TestFlight** → Build → Submit for Review → שם תראה אפשרות
4. **Build והגש** → במסך ההגשה תראה אפשרות להוסיף מוצרים

---

**אם עדיין לא מוצא - שלח צילום מסך ואני אעזור!**

