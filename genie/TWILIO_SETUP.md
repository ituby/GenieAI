# Twilio SMS Setup for Password Reset

מדריך הגדרת Twilio לאיפוס סיסמה באמצעות SMS.

## שלב 1: יצירת חשבון Twilio

1. היכנס ל-[Twilio Console](https://console.twilio.com/)
2. צור חשבון חדש או התחבר לחשבון קיים
3. אמת את מספר הטלפון שלך

## שלב 2: קבלת פרטי חיבור

1. בדשבורד של Twilio, מצא:
   - **Account SID** - מזהה החשבון
   - **Auth Token** - מפתח האימות (לחץ על "show" כדי לראות אותו)

2. רכוש מספר טלפון Twilio:
   - לך ל-**Phone Numbers** → **Buy a Number**
   - בחר מספר שתומך ב-SMS
   - רכוש את המספר

## שלב 3: הגדרת משתני סביבה ב-Supabase

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרויקט **GENIE**
3. לך ל-**Settings** → **Edge Functions** → **Secrets**
4. הוסף את המשתנים הבאים:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

## שלב 4: בדיקה

1. הפעל את האפליקציה
2. נסה לאפס סיסמה עם אימייל רשום
3. בדוק שמגיע SMS למספר הטלפון הרשום

## טיפים

- **פיתוח**: בחשבון Trial, תוכל לשלוח SMS רק למספרים מאומתים
- **פרודקשן**: שדרג לחשבון בתשלום כדי לשלוח לכל מספר
- **עלויות**: בדוק את מחירי ה-SMS לפי מדינה ב-[Twilio Pricing](https://www.twilio.com/sms/pricing)

## פורמט מספרי טלפון

מספרי טלפון צריכים להיות בפורמט E.164:
- ארה"ב: `+1234567890`
- ישראל: `+972501234567`
- בריטניה: `+447700900123`

## תקלות נפוצות

### SMS לא מגיע
1. ודא שמספר הטלפון נמצא בפורמט E.164
2. בדוק שהמספר רשום ב-Twilio Verified Callers (אם בחשבון Trial)
3. בדוק לוגים ב-Supabase Edge Functions

### שגיאת אימות
1. ודא שה-Account SID ו-Auth Token נכונים
2. ודא שה-Auth Token לא פג תוקפו

## לוגים

לצפייה בלוגים של שליחת SMS:
```bash
supabase functions logs manage-password-reset --project-ref mabekpsigcgnszmudxjt
```

## אבטחה

⚠️ **חשוב**: 
- אל תשתף את ה-Auth Token שלך
- אל תעלה את ה-Auth Token ל-Git
- השתמש במשתני סביבה של Supabase בלבד

