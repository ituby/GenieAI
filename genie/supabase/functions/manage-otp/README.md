# 🔐 Manage OTP - Unified OTP Management Function

פונקציה מאוחדת לניהול מלא של OTP (One-Time Password) - הרשמה והתחברות.

## 🎯 תכונות

- **שני סוגי OTP:**
  - `registration` - אימות טלפון ראשוני בהרשמה
  - `login` - אימות דו-שלבי (2FA) בכל התחברות
  
- **ניהול חכם:**
  - שימוש חוזר בקודים תקפים ממתינים
  - ניקוי אוטומטי של קודים ישנים
  - הגבלת ניסיונות (מקסימום 5)
  - תפוגה אוטומטית (10 דקות)

- **אבטחה:**
  - RLS מופעל על `otp_verifications`
  - אימות פרטים לפני שליחת OTP
  - מניעת שליחות מרובות של אותו קוד
  - טריגרים אוטומטיים לעדכון timestamps

## 📡 API

### **שליחת OTP**

```typescript
const { data, error } = await supabase.functions.invoke('manage-otp', {
  body: {
    action: 'send',
    email: 'user@example.com',
    password: 'password123',  // For login flow
    // OR
    phone: '+972501234567'    // For registration flow
  }
});

// Response:
// {
//   success: true,
//   phone: '+972501234567',
//   expiresIn: 600,
//   type: 'registration' | 'login',
//   requestId: '...'
// }
```

### **אימות OTP**

```typescript
const { data, error } = await supabase.functions.invoke('manage-otp', {
  body: {
    action: 'verify',
    email: 'user@example.com',
    phone: '+972501234567',
    otp: '123456'
  }
});

// Response:
// {
//   success: true,
//   userId: '...',
//   requestId: '...'
// }
```

## 🔄 זרימת עבודה

### הרשמה (Registration)
1. משתמש נרשם → `auth.users` נוצר
2. Edge Function שולח REGISTRATION OTP
3. משתמש מזין קוד
4. אחרי אימות → `users.phone_verified = true`
5. משתמש יכול להתחבר

### התחברות (Login)
1. משתמש מתחבר → בדיקה אם `phone_verified = true`
2. אם כן → שליחת LOGIN OTP (2FA)
3. משתמש מזין קוד
4. אחרי אימות → כניסה למערכת

### משתמש שלא סיים הרשמה
1. `phone_verified = false` + REGISTRATION OTP ממתין
2. מערכת מזהה ומציגה מסך OTP אוטומטית
3. חייב לסיים אימות לפני המשך

## 🗄️ מבנה DB

```sql
-- otp_verifications table
CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  type TEXT CHECK (type IN ('registration', 'login')),
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_otp_user_type_verified 
ON otp_verifications(user_id, type, verified, expires_at DESC);
```

## 🔒 אבטחה

- ✅ RLS enabled
- ✅ Search path מוגדר בטריגרים
- ✅ הצפנת OTP בטרנזיט (HTTPS)
- ✅ ניקוי אוטומטי של קודים ישנים
- ✅ הגבלת ניסיונות

## 🧹 ניקיון אוטומטי

פונקציה אוטומטית מנקה קודים שפגו לפני יותר מ-24 שעות:

```sql
SELECT cleanup_expired_otps();
```

מומלץ להריץ דרך Cron Job יומי.

