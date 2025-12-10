# uitdeitp-app Deployment Guide

## Overview

This guide covers deploying the **uitdeitp-app-standalone** application to Vercel.

## Prerequisites

- [Vercel Account](https://vercel.com/signup)
- [Vercel CLI](https://vercel.com/cli) (optional but recommended)
- Access to Supabase project credentials
- GitHub repository: https://github.com/trollofun/uitdeitp.git

## Deployment Steps

### 1. Connect GitHub Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `trollofun/uitdeitp`
4. Vercel will auto-detect the Next.js framework

### 2. Configure Environment Variables

In the Vercel project settings, add these environment variables:

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (sensitive) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NEXT_PUBLIC_APP_URL` | Your production URL | `https://uitdeitp.vercel.app` |

#### How to Get Supabase Keys

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: **uitdeitp** (project ref from migrations)
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

### 3. Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (root of repo)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node Version**: 18.x or 20.x

### 4. Deploy

#### Option A: Deploy via Vercel Dashboard

1. Click **"Deploy"** button
2. Wait for build to complete (2-3 minutes)
3. Vercel will provide a production URL: `https://uitdeitp.vercel.app`

#### Option B: Deploy via CLI

```bash
cd /home/johntuca/Desktop/uitdeitp-app-standalone

# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_APP_URL production
```

### 5. Post-Deployment Configuration

#### A. Update Supabase Auth Settings

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Add your Vercel URL to:
   - **Site URL**: `https://uitdeitp.vercel.app`
   - **Redirect URLs**:
     - `https://uitdeitp.vercel.app/auth/callback`
     - `https://uitdeitp.vercel.app/login`
     - `https://uitdeitp.vercel.app/dashboard`

#### B. Test Critical Flows

1. **Authentication**:
   - Register new account → Check email confirmation
   - Login with existing account
   - Password reset flow
   - OAuth (Google/GitHub if enabled)

2. **Reminders CRUD**:
   - Create reminder
   - Edit reminder
   - Delete reminder
   - Real-time updates

3. **Profile Management**:
   - Update profile info
   - Change password
   - Phone verification

4. **Kiosk Mode**:
   - Access `/kiosk/[stationId]`
   - Complete 5-step form
   - Verify guest reminder creation

### 6. Monitoring and Logs

#### Vercel Logs
```bash
# View real-time logs
vercel logs --follow

# View logs for specific deployment
vercel logs [deployment-url]
```

#### Supabase Monitoring

1. Go to **Supabase Dashboard** → **Logs**
2. Monitor:
   - **API Logs**: Track request patterns
   - **Auth Logs**: Monitor login attempts
   - **Database Logs**: Check query performance

### 7. Custom Domain (Optional)

1. Go to **Vercel Project Settings** → **Domains**
2. Add your custom domain: `uitdeitp.ro`
3. Configure DNS records:
   - **A Record**: `76.76.21.21` (Vercel)
   - **CNAME**: `cname.vercel-dns.com`
4. Update environment variable:
   ```bash
   NEXT_PUBLIC_APP_URL=https://uitdeitp.ro
   ```
5. Update Supabase redirect URLs to use custom domain

## Troubleshooting

### Build Failures

#### Error: "Module not found"
```bash
# Clear cache and rebuild
vercel --force

# Or via dashboard: Deployments → [...] → Redeploy
```

#### Error: "NEXT_PUBLIC_* not found"
- Verify all environment variables are set in Vercel project settings
- Variables must start with `NEXT_PUBLIC_` to be exposed to browser
- Redeploy after adding variables

### Runtime Errors

#### Error: "Failed to fetch"
- Check Supabase URL and keys are correct
- Verify Supabase project is active (not paused)
- Check browser console for CORS errors

#### Error: "Invalid redirect URL"
- Add Vercel URL to Supabase redirect URLs
- Format: `https://your-app.vercel.app/auth/callback`

### Performance Issues

#### Slow Page Loads
- Enable Vercel Analytics: **Project Settings** → **Analytics**
- Check Supabase query performance in dashboard
- Use `next/image` for optimized images (already implemented)

## Production Checklist

- [ ] All environment variables configured
- [ ] Supabase redirect URLs updated
- [ ] Authentication flows tested
- [ ] CRUD operations working
- [ ] Real-time updates functioning
- [ ] Kiosk mode accessible
- [ ] Email confirmations received
- [ ] Error monitoring enabled
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic with Vercel)

## Security Recommendations

1. **Never commit** `.env.local` or `.env` files to GitHub
2. **Rotate keys** if accidentally exposed:
   - Generate new Supabase service role key
   - Update Vercel environment variables
3. **Enable Vercel password protection** for staging deployments
4. **Use Supabase RLS policies** (already implemented in migrations)
5. **Review Vercel logs** regularly for suspicious activity

## Cost Estimates

### Vercel (Hobby Plan - Free)
- **Bandwidth**: 100GB/month
- **Builds**: Unlimited
- **Serverless Functions**: 100GB-hours/month

### Vercel (Pro Plan - $20/month)
- **Bandwidth**: 1TB/month
- **Builds**: Unlimited
- **Serverless Functions**: 1000GB-hours/month
- **Password protection**
- **Analytics**

### When to Upgrade
- Traffic > 100GB/month
- Need team collaboration
- Require staging environments with password protection

## Next Steps

1. Deploy **notifyhub-standalone** (see NotifyHub deployment guide)
2. Configure webhooks in Calisero/Twilio to point to NotifyHub URLs
3. Test end-to-end SMS notification flow
4. Set up monitoring and alerting

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **GitHub Issues**: https://github.com/trollofun/uitdeitp/issues
