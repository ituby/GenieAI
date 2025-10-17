# Send OTP SMS Function

פונקציה זו מוסיפה שכבת אבטחה נוספת של OTP (One-Time Password) להתחברות. הפונקציה מאמתת את האימייל והסיסמה של המשתמש, שולפת את מספר הטלפון שלו מהדאטהבייס, ושולחת קוד אימות SMS.

## זרימת העבודה

1. משתמש מזין אימייל וסיסמה במסך ההתחברות
2. הפונקציה מאמתת את הפרטים
3. הפונקציה שולפת את מספר הטלפון השמור במערכת
4. קוד OTP נשלח למספר הטלפון
5. משתמש מזין את הקוד
6. אם הקוד נכון, המשתמש מתחבר למערכת

## הגדרה

### 1. הפעלת SMS Authentication ב-Supabase

1. היכנס ל-Supabase Dashboard
2. עבור אל **Authentication** → **Providers**
3. אפשר **Phone** authentication
4. בחר ספק SMS (מומלץ: Twilio)

### 2. הגדרת Twilio

1. צור חשבון ב-[Twilio](https://www.twilio.com/)
2. קבל את הפרטים הבאים מה-Dashboard של Twilio:
   - Account SID
   - Auth Token
   - Message Service SID (או Twilio Phone Number)

3. הגדר את המשתנים ב-Supabase:
   - לך ל-**Project Settings** → **API**
   - הוסף את הפרטים של Twilio בסעיף **Auth** → **SMS**

### 3. עדכון קובץ התצורה המקומי

ערוך את הקובץ `genie/supabase/config.toml`:

```toml
[auth.sms.twilio]
enabled = true
account_sid = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
message_service_sid = "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
auth_token = "env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)"
```

### 4. הגדרת משתני סביבה

הוסף למשתני הסביבה:

```bash
SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN="your-twilio-auth-token"
```

### 5. פריסת הפונקציה

```bash
supabase functions deploy send-otp-sms
```

## שימוש

הפונקציה נקראת אוטומטית כאשר משתמש מזין אימייל וסיסמה במסך ההתחברות.

### דוגמה לקריאה

```typescript
const { data, error } = await supabase.functions.invoke('send-otp-sms', {
  body: { 
    email: 'user@example.com',
    password: 'userpassword',
    type: 'sms' // או 'whatsapp' (ברירת מחדל: 'sms')
  },
});

// התשובה תכיל:
// { success: true, phone: '****1234', requestId: '...' }
```

### דרישות

- המשתמש חייב להיות רשום במערכת
- בטבלת `users` חייב להיות שדה `phone` עם מספר טלפון תקין
- מספר הטלפון חייב להיות בפורמט E.164

## פורמט מספר טלפון

השתמש בפורמט E.164:

- ✅ `+972501234567` (ישראל)
- ✅ `+12025551234` (ארה"ב)
- ❌ `0501234567` (לא תקין)
- ❌ `972501234567` (חסר +)

## בדיקה מקומית

לבדיקה מקומית, אפשר להשתמש ב-Test OTP:

```toml
[auth.sms.test_otp]
"+972501234567" = "123456"
```

זה יאפשר להשתמש בקוד `123456` למספר הטלפון שהוגדר ללא שליחת SMS אמיתי.
