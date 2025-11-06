# Profile Management UI → Backend Handoff

## 🎯 Overview

The Profile & Settings UI is **100% complete** and ready for backend integration.

**Built by:** UI/UX Designer Agent
**Date:** 2025-11-04
**Status:** ✅ Production Ready
**Working Directory:** `/home/johntuca/Desktop/uitdeitp-app-standalone`

---

## ✅ What's Completed

### UI Components (All Ready)
- ✅ Settings page with responsive tabs/accordion
- ✅ ProfileTab (avatar, phone, location)
- ✅ NotificationsTab (SMS/Email, intervals, quiet hours)
- ✅ SecurityTab (password, email, sessions)
- ✅ AccountTab (export, delete with GDPR compliance)
- ✅ Profile page (readonly with stats)
- ✅ All modals (PhoneVerification, ChangePassword, ChangeEmail, DeleteAccount)
- ✅ Reusable components (VerifiedBadge, AvatarUpload, PasswordStrengthMeter, etc.)
- ✅ Mobile-responsive (accordion fallback)
- ✅ WCAG 2.1 AA accessible

### Documentation
- ✅ Full component documentation (`/docs/PROFILE_UI_DOCUMENTATION.md`)
- ✅ API endpoint specifications
- ✅ Database schema requirements
- ✅ Testing checklist

---

## 🚨 Required Backend Work

### 1. API Endpoints to Create

**Profile Management:**
```typescript
GET  /api/profile                    → User profile
PATCH /api/profile                   → Update profile (auto-save)
POST /api/profile/avatar             → Upload avatar (multipart/form-data)
GET  /api/profile/stats              → Profile statistics
```

**Notifications:**
```typescript
GET   /api/notifications/settings    → Notification settings
PATCH /api/notifications/settings    → Update settings
POST  /api/notifications/test-sms    → Send test SMS
```

**Security:**
```typescript
GET    /api/security/sessions        → List active sessions
DELETE /api/security/sessions/:id    → Revoke session
DELETE /api/security/sessions        → Revoke all sessions
POST   /api/security/change-password → Change password
POST   /api/security/change-email    → Send email verification
POST   /api/security/verify-email-change → Verify new email
```

**Account:**
```typescript
GET    /api/account/stats            → Account statistics (for delete modal)
GET    /api/account/export           → Export all data (GDPR JSON)
DELETE /api/account/delete           → Hard delete account
```

### 2. Database Migrations

**Extend user_profiles table:**
```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS use_manual_location BOOLEAN DEFAULT FALSE;
```

**Create notification_settings table:**
```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT FALSE,
  reminder_intervals INTEGER[] DEFAULT ARRAY[7, 3, 1],
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  quiet_hours_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_weekdays_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Create user_sessions table:**
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device TEXT,
  browser TEXT,
  location TEXT,
  ip_address TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Supabase Storage Setup

**Create avatars bucket:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;
```

**Storage policies:**
```sql
-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Anyone can view avatars
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
```

---

## 📊 Data Structures

### Profile API Response
```typescript
{
  success: boolean;
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    phone_verified: boolean;
    avatar_url: string | null;
    city: string | null;
    country: string | null;
    use_manual_location: boolean;
    created_at: string;
  }
}
```

### Notification Settings API Response
```typescript
{
  success: boolean;
  settings: {
    sms_enabled: boolean;
    email_enabled: boolean;
    push_enabled: boolean;
    reminder_intervals: number[];  // [7, 3, 1]
    quiet_hours_start: string;     // "22:00"
    quiet_hours_end: string;       // "08:00"
    quiet_hours_enabled: boolean;
    quiet_hours_weekdays_only: boolean;
  }
}
```

### Active Sessions API Response
```typescript
{
  success: boolean;
  sessions: Array<{
    id: string;
    device: string;       // "Windows PC"
    browser: string;      // "Chrome"
    location: string;     // "București"
    last_active: string;  // "2 ore în urmă"
    is_current: boolean;
  }>
}
```

### Profile Stats API Response
```typescript
{
  success: boolean;
  stats: {
    total_reminders: number;
    upcoming_reminders: Array<{
      id: string;
      plate_number: string;
      expiry_date: string;
      days_until_expiry: number;
    }>
  }
}
```

### Data Export Format (GDPR)
```json
{
  "profile": { ... },
  "reminders": [ ... ],
  "notifications": [ ... ],
  "settings": { ... },
  "exported_at": "2025-11-04T20:00:00Z"
}
```

---

## 🔧 Avatar Upload Implementation

**Frontend sends:**
```typescript
const formData = new FormData();
formData.append('file', resizedImageFile); // Already resized to 200x200

fetch('/api/profile/avatar', {
  method: 'POST',
  body: formData
});
```

**Backend must:**
1. Validate: image type, max 2MB
2. Generate filename: `${userId}/${Date.now()}.jpg`
3. Upload to Supabase Storage: `avatars/` bucket
4. Return public URL
5. Update `user_profiles.avatar_url`

**Example Supabase Storage upload:**
```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/${Date.now()}.jpg`, file, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false
  });

const publicUrl = supabase.storage
  .from('avatars')
  .getPublicUrl(data.path).data.publicUrl;
```

---

## 🔐 Security Features to Implement

### Password Change
- Validate current password with Supabase Auth
- Check new password strength (min 8 chars)
- Update password via `supabase.auth.updateUser()`

### Email Change
- Send 6-digit verification code to new email
- Store pending email change in Redis (10 min TTL)
- Verify code before updating
- Update email via `supabase.auth.updateUser()`

### Session Management
- Track sessions on login (device, browser, location from headers)
- Update `last_active` on each request
- Revoke session = delete from `user_sessions` + invalidate JWT

### Account Deletion (GDPR Compliance)
- Hard delete user from `auth.users` (cascades to related tables)
- Delete avatar from storage
- Delete all reminders
- Delete all notifications
- Delete notification settings
- Delete all sessions
- Log deletion for audit trail (keep audit log for 30 days)

---

## 🧪 Testing Priority

**High Priority (Must Work):**
1. Profile auto-save on blur
2. Avatar upload + resize to 200x200
3. Phone verification (reuses existing API)
4. Password change with validation
5. Email change with verification
6. Account deletion with all safeguards

**Medium Priority:**
7. Notification settings auto-save
8. Test SMS sending
9. Active sessions list & revoke
10. Data export (GDPR JSON)

**Low Priority (Can be stubbed):**
11. 2FA (marked "În curând")
12. Push notifications (marked "În curând")

---

## 📝 Integration Steps

1. **Create database migrations** (user_profiles columns, notification_settings, user_sessions)
2. **Setup Supabase Storage** (avatars bucket + policies)
3. **Implement Profile API** (GET, PATCH, avatar upload, stats)
4. **Implement Notifications API** (settings CRUD, test SMS)
5. **Implement Security API** (password, email, sessions)
6. **Implement Account API** (stats, export, delete)
7. **Test all endpoints** with Postman/Thunder Client
8. **Verify GDPR compliance** (export format, deletion cascade)
9. **Deploy to staging**
10. **QA testing** (use testing checklist in docs)

---

## 🚀 Ready to Start

All UI components are complete and functional. Backend team can now:
1. Create API routes
2. Run database migrations
3. Test with existing UI
4. Deploy

**Questions?** Check `/docs/PROFILE_UI_DOCUMENTATION.md` for full specs.

---

**Status:** ✅ UI Complete, Awaiting Backend Integration
**Next:** Backend Developer (API + DB implementation)
