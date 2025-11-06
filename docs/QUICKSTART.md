# uitdeitp-app Quick Start

## 🚀 5-Minute Vercel Deployment

### Step 1: Import Repository to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Enter: `https://github.com/trollofun/uitdeitp`
4. Click **"Import"**

### Step 2: Add Environment Variables (Copy-Paste)

Click **"Add Environment Variable"** and paste:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://uitdeitp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Get Supabase keys:**
1. Go to https://app.supabase.com/project/uitdeitp/settings/api
2. Copy **Project URL** → Replace `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon/public key** → Replace `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role key** → Replace `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes ☕
3. Click **"Visit"** to see your app live!

### Step 4: Configure Supabase Redirects

1. Go to https://app.supabase.com/project/uitdeitp/auth/url-configuration
2. Add your Vercel URL to **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/login`
   - `https://your-app.vercel.app/dashboard`

### Step 5: Test Login

1. Visit `https://your-app.vercel.app/login`
2. Register new account
3. Check email for confirmation
4. Login and create first reminder!

---

## 📱 Local Development

```bash
git clone https://github.com/trollofun/uitdeitp.git
cd uitdeitp
npm install
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
npm run dev
```

Open http://localhost:3000

---

## 🆘 Troubleshooting

**Build failed?**
- Check all 4 environment variables are set correctly
- Verify Supabase project is active (not paused)

**Can't login?**
- Add Vercel URL to Supabase redirect URLs
- Check browser console for errors

**Need help?**
- See full guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- GitHub Issues: https://github.com/trollofun/uitdeitp/issues
