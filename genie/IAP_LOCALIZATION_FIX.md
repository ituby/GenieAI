# 🔧 תיקון לוקליזציה - IAP Products

## ❌ הבעיה
הלוקליזציה של כל המוצרים נדחתה (Rejected), מה שגורם לסטטוס "Developer Action Needed".

## ✅ מה צריך לתקן

### כללי אפל עבור IAP Localization:

1. **Display Name** - צריך להיות קצר וברור (עד 30 תווים)
2. **Description** - **חייב להיות פחות מ-55 תווים** ⚠️
3. **Description** - צריך להיות ללא מילים "מכירתיות" כמו "Buy" או "Purchase"
4. **תיאור צריך להסביר מה המשתמש מקבל** - לא מה הוא עושה

---

## 📝 תיאורים מומלצים לכל מוצר

### מוצר 1: 50 Tokens

**Display Name:**
```
50 Tokens
```

**Description (English) - 46 תווים:**
```
50 tokens for goals, tasks, and AI in Genie AI
```

**Description (עברית - אם תרצה להוסיף):**
```
50 טוקנים ליצירת מטרות, משימות ותכונות AI ב-Genie AI
```

---

### מוצר 2: 100 Tokens

**Display Name:**
```
100 Tokens
```

**Description (English) - 47 תווים:**
```
100 tokens for goals, tasks, and AI in Genie AI
```

**Description (עברית):**
```
100 טוקנים ליצירת מטרות, משימות ותכונות AI ב-Genie AI
```

---

### מוצר 3: 250 Tokens

**Display Name:**
```
250 Tokens
```

**Description (English) - 47 תווים:**
```
250 tokens for goals, tasks, and AI in Genie AI
```

**Description (עברית):**
```
250 טוקנים ליצירת מטרות, משימות ותכונות AI ב-Genie AI
```

---

### מוצר 4: 500 Tokens

**Display Name:**
```
500 Tokens
```

**Description (English) - 47 תווים:**
```
500 tokens for goals, tasks, and AI in Genie AI
```

**Description (עברית):**
```
500 טוקנים ליצירת מטרות, משימות ותכונות AI ב-Genie AI
```

---

### מוצר 5: 1000 Tokens

**Display Name:**
```
1000 Tokens
```

**Description (English) - 48 תווים:**
```
1000 tokens for goals, tasks, and AI in Genie AI
```

**Description (עברית):**
```
1000 טוקנים ליצירת מטרות, משימות ותכונות AI ב-Genie AI
```

---

### מוצר 6: 2000 Tokens

**Display Name:**
```
2000 Tokens
```

**Description (English) - 48 תווים:**
```
2000 tokens for goals, tasks, and AI in Genie AI
```

**Description (עברית):**
```
2000 טוקנים ליצירת מטרות, משימות ותכונות AI ב-Genie AI
```

---

## 🔧 איך לתקן ב-App Store Connect

### לכל מוצר:

1. **היכנס ל-App Store Connect**
   - Features → In-App Purchases
   - לחץ על המוצר (למשל "100 Tokens")

2. **עבור ל-App Store Localization**
   - לחץ על "English (U.S.)" (הטקסט הכחול שנדחה)

3. **ערוך את התיאור**
   - מחק את התיאור הישן: `"Buy 100 tokens to create goals and tasks with Genie AI"`
   - העתק את התיאור החדש מהרשימה למעלה

4. **שמור**
   - לחץ "Save"
   - אפל יבדוק מחדש את הלוקליזציה

5. **חזור על הפעולה לכל 6 המוצרים**

---

## ⚠️ חשוב

1. **אל תשתמש במילים:**
   - ❌ "Buy"
   - ❌ "Purchase" 
   - ❌ "Get"
   - ❌ מילים מכירתיות אחרות

2. **תשתמש במילים:**
   - ✅ "to use for"
   - ✅ "allows you to"
   - ✅ "unlock"
   - ✅ תיאור מפורט של מה המשתמש מקבל

3. **תיאור צריך להיות:**
   - **פחות מ-55 תווים** ⚠️ (חובה!)
   - מסביר מה המשתמש מקבל
   - לא מכירתי

---

## ✅ לאחר התיקון

1. **המתן 1-2 שעות** - אפל צריך לבדוק מחדש
2. **בדוק את הסטטוס** - הלוקליזציה אמורה להיות "Approved"
3. **המוצרים יעברו ל-"Ready to Submit"** - רק אז הם ייטענו באפליקציה

---

## 🎯 סיכום

**הבעיה:** הלוקליזציה נדחתה כי התיאור מכיל את המילה "Buy" או ארוך מדי (יותר מ-55 תווים).

**הפתרון:** החלף את התיאור בתיאור קצר (פחות מ-55 תווים) ללא מילים מכירתיות, שמסביר מה המשתמש מקבל.

**הפעולה:** ערוך את הלוקליזציה של כל 6 המוצרים ב-App Store Connect.

