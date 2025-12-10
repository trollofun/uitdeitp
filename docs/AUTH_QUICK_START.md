# Authentication Quick Start Guide

## 🚀 Getting Started

### 1. Environment Setup

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Start Development Server

```bash
npm run dev
# Visit http://localhost:3000/auth/login
```

## 📍 Auth Routes

| Route | Purpose | Access |
|-------|---------|--------|
| `/auth/login` | Email/password login | Public |
| `/auth/register` | New user registration | Public |
| `/auth/forgot-password` | Request password reset | Public |
| `/auth/reset-password` | Set new password | Token required |
| `/auth/callback` | OAuth callback handler | Auto-redirect |
| `/api/auth/logout` | Sign out endpoint | Authenticated |

## 🔐 Protected Routes

Automatically protected by middleware:
- `/dashboard/*`
- `/reminders/*`
- `/profile/*`
- `/settings/*`

## 💡 Code Examples

### Check Auth in Server Component

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  return <div>Hello {user.email}</div>;
}
```

### Check Auth in Client Component

```tsx
'use client';
import { useAuth } from '@/hooks/use-auth';

export function UserProfile() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;

  return <div>Welcome {user.email}</div>;
}
```

### Call Auth Actions

```tsx
'use client';
import { login } from '@/lib/auth/actions';
import { useToast } from '@/hooks/use-toast';

export function LoginButton() {
  const { toast } = useToast();

  async function handleLogin() {
    const result = await login({
      email: 'user@example.com',
      password: 'SecurePass123',
      remember: true
    });

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error
      });
    }
  }

  return <button onClick={handleLogin}>Login</button>;
}
```

### Show Toast Notifications

```tsx
'use client';
import { useToast } from '@/hooks/use-toast';

export function MyComponent() {
  const { toast } = useToast();

  // Success toast
  toast({
    variant: 'success',
    title: 'Success',
    description: 'Action completed successfully'
  });

  // Error toast
  toast({
    variant: 'destructive',
    title: 'Error',
    description: 'Something went wrong'
  });

  // Default toast
  toast({
    title: 'Notice',
    description: 'Information message'
  });
}
```

## 🛡️ Security Features

### Password Requirements
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter
- ✅ At least 1 number

### Rate Limiting
- ✅ 5 attempts per 15 minutes
- ✅ Applied to login, register, reset

### Protection
- ✅ CSRF via Server Actions
- ✅ Secure HTTP-only cookies
- ✅ Middleware route guards

## 🧪 Testing Checklist

### Registration Flow
- [ ] Register with valid data
- [ ] Try duplicate email
- [ ] Test weak password
- [ ] Uncheck terms checkbox
- [ ] Verify email sent

### Login Flow
- [ ] Login with valid credentials
- [ ] Try wrong password
- [ ] Test rate limiting (6 attempts)
- [ ] Check "remember me"
- [ ] Verify redirect to dashboard

### Password Reset
- [ ] Request reset for existing email
- [ ] Request reset for non-existent email
- [ ] Click email link and reset
- [ ] Try expired token

### Session Management
- [ ] Access protected route when logged out
- [ ] Session persists on refresh
- [ ] Logout clears session
- [ ] Auto-redirect after login/logout

## 📦 Components Available

### Form Components
```tsx
import { Input } from '@/components/auth/input';
import { Label } from '@/components/auth/label';
import { Button } from '@/components/components/button';
import { Card, CardContent, CardHeader } from '@/components/auth/card';
```

### Hooks
```tsx
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
```

### Actions
```tsx
import {
  login,
  register,
  logout,
  requestPasswordReset,
  resetPassword,
  oauthLogin
} from '@/lib/auth/actions';
```

## 🔧 Supabase Configuration

### Enable Email Auth
1. Go to Supabase Dashboard
2. Authentication → Providers
3. Enable Email provider
4. Configure email templates (optional)

### Enable OAuth (Optional)
1. Authentication → Providers
2. Enable Google/GitHub
3. Add OAuth credentials
4. Set redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

## 🚨 Troubleshooting

### "Invalid login credentials"
- Check email/password are correct
- Verify user exists in Supabase Auth dashboard
- Check rate limiting hasn't blocked user

### OAuth not working
- Ensure provider is enabled in Supabase
- Verify redirect URLs are configured
- Check OAuth credentials are correct

### Session not persisting
- Check cookies are enabled
- Verify middleware is running
- Check `NEXT_PUBLIC_APP_URL` matches your domain

### Rate limiting blocking legitimate users
- Clear rate limit store (restart server in dev)
- Implement Redis for production
- Adjust limits in `/src/lib/auth/actions.ts`

## 📚 Next Steps

1. **Test all flows** - Use checklist above
2. **Configure email templates** - In Supabase Dashboard
3. **Enable OAuth** - Add Google/GitHub providers
4. **Customize UI** - Update colors, text, logos
5. **Add 2FA** - Optional enhanced security
6. **Setup Redis** - For production rate limiting

## 🆘 Support

- **Full Documentation**: `/docs/AUTH_IMPLEMENTATION.md`
- **Supabase Docs**: https://supabase.com/docs/guides/auth
- **Next.js Docs**: https://nextjs.org/docs/app

---

**Status**: ✅ Complete and ready for testing
**Last Updated**: 2025-11-03
