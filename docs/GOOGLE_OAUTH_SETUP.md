# Google OAuth Configuration Guide

## Overview
This guide will help you configure Google OAuth authentication for the uitdeITP application in Supabase.

## Prerequisites
- Supabase project access (https://dnowyodhffqqhmakjupo.supabase.co)
- Google Cloud Console account
- Application deployed at: https://uitdeitp.vercel.app

---

## Step 1: Create Google OAuth Credentials

### 1.1 Access Google Cloud Console
1. Go to https://console.cloud.google.com
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**

### 1.2 Create OAuth 2.0 Client ID
1. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
2. If prompted, configure the OAuth consent screen first:
   - **Application type**: External
   - **Application name**: uitdeITP
   - **User support email**: Your email
   - **Application logo**: (Optional) Upload logo
   - **Application home page**: https://uitdeitp.ro
   - **Authorized domains**:
     - `uitdeitp.ro`
     - `uitdeitp.vercel.app`
     - `supabase.co`
   - **Developer contact**: Your email
   - Click **SAVE AND CONTINUE**

3. **Application type**: Web application
4. **Name**: uitdeITP OAuth Client
5. **Authorized JavaScript origins**:
   ```
   https://uitdeitp.ro
   https://uitdeitp.vercel.app
   https://dnowyodhffqqhmakjupo.supabase.co
   ```

6. **Authorized redirect URIs**:
   ```
   https://dnowyodhffqqhmakjupo.supabase.co/auth/v1/callback
   https://uitdeitp.vercel.app/auth/callback
   https://uitdeitp.ro/auth/callback
   ```

7. Click **CREATE**
8. **Copy the following**:
   - Client ID (e.g., `123456789-abc123.apps.googleusercontent.com`)
   - Client Secret (e.g., `GOCSPX-abc123xyz`)

---

## Step 2: Configure Supabase

### 2.1 Enable Google Provider
1. Go to Supabase Dashboard: https://app.supabase.com/project/dnowyodhffqqhmakjupo
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list
4. Toggle **Enable Sign in with Google** to ON

### 2.2 Add Google Credentials
1. In the Google provider settings:
   - **Client ID**: Paste the Client ID from Step 1.2
   - **Client Secret**: Paste the Client Secret from Step 1.2
2. Click **Save**

### 2.3 Verify Redirect URLs
Supabase should automatically configure:
- **Callback URL**: `https://dnowyodhffqqhmakjupo.supabase.co/auth/v1/callback`

This should match what you added in Google Cloud Console.

---

## Step 3: Test Google OAuth

### 3.1 Test on Local Development
1. Make sure your `.env.local` has:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://dnowyodhffqqhmakjupo.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Navigate to: http://localhost:3000/auth/login

4. Click **"Continuă cu Google"** button

5. **Expected Flow**:
   ```
   Click Google button
   → Redirect to Google sign-in
   → Select Google account
   → Grant permissions
   → Redirect to /auth/callback
   → Create user_profile (if new user)
   → Redirect to /dashboard
   ```

### 3.2 Test on Production
1. Navigate to: https://uitdeitp.vercel.app/auth/login
2. Follow same flow as Step 3.1

### 3.3 Verify User Profile Creation
After successful login, check Supabase:

1. Go to **Authentication** → **Users**
2. Find your test user
3. Verify:
   - ✅ User exists in `auth.users`
   - ✅ Provider = `google`
   - ✅ Email confirmed automatically

4. Go to **Table Editor** → **user_profiles**
5. Verify user profile was created automatically via trigger:
   - ✅ `id` matches `auth.users.id`
   - ✅ `email` matches Google email
   - ✅ `full_name` populated from Google
   - ✅ `phone_verified = false` (default)

---

## Step 4: Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause**: Redirect URI in Google Console doesn't match Supabase callback URL

**Fix**:
1. Verify exact URL in Google Console includes:
   ```
   https://dnowyodhffqqhmakjupo.supabase.co/auth/v1/callback
   ```
2. No trailing slashes
3. Must be exact match

### Error: "Invalid client ID"
**Cause**: Client ID incorrect or not saved in Supabase

**Fix**:
1. Double-check Client ID in Supabase matches Google Console
2. Click **Save** in Supabase after pasting

### Error: "User profile not created"
**Cause**: Database trigger `create_user_profile_on_signup` not working

**Fix**:
1. Check trigger exists:
   ```sql
   SELECT * FROM pg_trigger
   WHERE tgname = 'on_auth_user_created';
   ```

2. Manually create profile if needed:
   ```sql
   INSERT INTO user_profiles (id, email, full_name)
   SELECT id, email, raw_user_meta_data->>'full_name'
   FROM auth.users
   WHERE id = 'user-uuid-here';
   ```

### Button Not Showing/Working
**Cause**: GoogleSignInButton component may have issues

**Check**:
1. Component exists at: `src/components/auth/GoogleSignInButton.tsx`
2. Imported in login/register pages
3. Console for JavaScript errors

---

## Step 5: Security Best Practices

### 5.1 Restrict OAuth Consent Screen
1. In Google Cloud Console → **OAuth consent screen**
2. **Publishing status**: Keep as **Testing** initially
3. **Test users**: Add specific email addresses
4. When ready for production: Submit for verification

### 5.2 Rotate Credentials Regularly
- Rotate Client Secret every 90 days
- Update in both Google Console and Supabase

### 5.3 Monitor Usage
- Check Google Cloud Console → **APIs & Services** → **Credentials**
- Monitor quota usage and errors

---

## Verification Checklist

Before considering Google OAuth complete:

- [ ] Google OAuth Client ID created in Google Cloud Console
- [ ] Authorized redirect URIs include Supabase callback URL
- [ ] Client ID and Secret added to Supabase
- [ ] Google provider enabled in Supabase
- [ ] Test login works on localhost
- [ ] Test login works on production
- [ ] User profile automatically created after Google sign-in
- [ ] Email verified automatically (no verification email needed)
- [ ] User can access dashboard after Google login
- [ ] Phone verification modal appears (since phone not provided by Google)

---

## Current Implementation Details

### Files Using Google OAuth

1. **`src/components/auth/GoogleSignInButton.tsx`**
   - Google sign-in button component
   - Calls `oauthLogin('google')` on click

2. **`src/lib/auth/actions.ts`** (lines 269-300)
   - `oauthLogin()` function
   - Handles OAuth redirect

3. **`src/app/(auth)/callback/route.ts`**
   - OAuth callback handler
   - Exchanges code for session
   - Redirects to dashboard

4. **`src/app/(auth)/login/page.tsx`**
   - Login page with Google button
   - Includes `<GoogleSignInButton />`

5. **`src/app/(auth)/register/page.tsx`**
   - Register page with Google button
   - Same component

### Database Trigger

**Trigger Name**: `on_auth_user_created`
**Function**: `create_user_profile_on_signup()`
**Location**: `supabase/migrations/`

```sql
CREATE OR REPLACE FUNCTION public.create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile_on_signup();
```

---

## Support

For issues with Google OAuth configuration:
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/social-login/auth-google
- **Project Issues**: contact@uitdeitp.ro

---

**Last Updated**: 2025-11-12
**Status**: ⚠️ Configuration Required
**Estimated Time**: 20-30 minutes
