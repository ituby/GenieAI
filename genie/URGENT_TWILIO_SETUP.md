# 🚨 הגדרת Twilio דחופה - נדרש לאיפוס סיסמה!

## הבעיה הנוכחית
SMS לא נשלח כי Twilio לא מוגדר ב-Supabase.

## פתרון מהיר (5 דקות)

### שלב 1: קבל פרטי Twilio
1. היכנס ל-https://console.twilio.com/
2. העתק:
   - **Account SID** (מתחיל ב-AC...)
   - **Auth Token** (לחץ "show")
   - **Phone Number** (מספר שרכשת, פורמט: +1234567890)

### שלב 2: הגדר ב-Supabase
1. לך ל-https://supabase.com/dashboard/project/mabekpsigcgnszmudxjt/settings/functions
2. לחץ על **"Edge Functions"** → **"Secrets"**
3. הוסף 3 משתנים:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### שלב 3: בדיקה
נסה לאפס סיסמה באפליקציה - אמור להגיע SMS!

---

## אם אין לך Twilio

### אופציה A: חשבון Trial (חינם)
1. הרשם ב-https://www.twilio.com/try-twilio
2. אמת מספר טלפון
3. **חשוב**: בחשבון Trial, SMS יישלח רק למספרים מאומתים
   - לך ל-**Verified Caller IDs** והוסף את המספרים:
   - +972525830613 (ituby)
   - +972525830611 (daniel)

### אופציה B: חשבון בתשלום
- $20 = ~600 SMS לישראל
- אפשר לשלוח לכל מספר

---

## מצב נוכחי
✅ טבלת `password_reset_verifications` - קיימת  
✅ Edge Function `manage-password-reset` - פרוס  
✅ עמודת `phone_number` בטבלת users - נוספה  
✅ מספרי טלפון למשתמשים:
   - ituby@icloud.com → +972525830613
   - danielnoamtuby@gmail.com → +972525830611  
❌ **Twilio לא מוגדר** ← זו הבעיה!

---

## בדיקת לוגים
```bash
# בדוק שה-Function רץ
supabase functions logs manage-password-reset --project-ref mabekpsigcgnszmudxjt

# בדוק שנוצר רשומה
SELECT * FROM password_reset_verifications ORDER BY created_at DESC LIMIT 1;
```

---

## שאלות נפוצות

**ש: כמה עולה SMS?**  
ת: ישראל: $0.033 לכל SMS (~11 אגורות)

**ש: אפשר להשתמש בשירות אחר?**  
ת: כן, אבל צריך לשנות את הקוד. Twilio הוא הכי פשוט.

**ש: למה לא עובד בלי Twilio?**  
ת: ה-Edge Function מנסה לשלוח SMS דרך Twilio API. בלי פרטי חיבור, זה נכשל.

