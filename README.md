# uitdeITP App - Remindere ITP Inteligente

Platform multi-modal pentru gestionarea reminder-elor ITP cu acces web, kiosk și dashboard admin.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm sau pnpm

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install

# Copy environment variables
cp .env.example .env.local

# Configure Supabase credentials in .env.local
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# NOTIFYHUB_URL=https://ntf.uitdeitp.ro
# NOTIFYHUB_API_KEY=your_api_key

# Run development server
npm run dev
```

Application will start at `http://localhost:3000`

## 📦 Project Structure

```
uitdeitp-app/
├── src/
│   ├── app/              # Next.js 14 App Router pages
│   ├── components/       # React components + shadcn/ui
│   ├── lib/
│   │   ├── supabase/    # Supabase clients (browser, server, middleware)
│   │   ├── validation/  # Zod schemas for form validation
│   │   ├── services/    # Business logic (date, phone, plate, notification)
│   │   └── utils/       # Utility functions (cn)
│   ├── types/           # TypeScript type definitions
│   └── styles/          # Global CSS and Tailwind
├── public/              # Static assets
├── supabase/            # Database migrations & Edge Functions
└── tests/               # Test files
```

## 🔑 Environment Variables

Create `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NotifyHub SMS Gateway
NOTIFYHUB_URL=https://ntf.uitdeitp.ro
NOTIFYHUB_API_KEY=uitp_xxx

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🎨 Features

- **User Dashboard**: Gestionare remindere ITP, RCA, Roviniete
- **Kiosk Mode**: Interfață simplificată pentru stații ITP
- **Admin Panel**: Monitorizare utilizatori și statistici
- **SMS Notifications**: Integrare cu NotifyHub pentru trimitere automată
- **Responsive Design**: Optimizat pentru desktop, tablet, mobile
- **Dark Mode**: Suport pentru tema întunecată

## 🗃️ Database Schema

- `user_profiles` - Profiluri utilizatori
- `reminders` - Remindere ITP/RCA/Roviniete
- `kiosk_stations` - Stații ITP înregistrate
- `notification_log` - Istoric notificări trimise

## 📚 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + shadcn/ui + TailwindCSS
- **Database**: Supabase (PostgreSQL + Auth)
- **Validation**: Zod
- **Date Utils**: date-fns
- **Icons**: lucide-react
- **Styling**: TailwindCSS + Prägnanz design tokens

## 🚀 Deployment - GitHub + Vercel

### 1. Create GitHub Repository

```bash
# Initialize Git
git init
git branch -M main

# Add files
git add .
git commit -m "Initial commit - uitdeitp-app v2.0"

# Link to GitHub (create repo first on github.com)
git remote add origin https://github.com/YOUR_USERNAME/uitdeitp-app.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com/new)
2. Import from GitHub: `your-username/uitdeitp-app`
3. Framework Preset: **Next.js**
4. Root Directory: `./` (default)
5. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NOTIFYHUB_URL`
   - `NOTIFYHUB_API_KEY`
   - `NEXT_PUBLIC_APP_URL`
6. Deploy!

### 3. Configure Custom Domain

1. Vercel Dashboard → Settings → Domains
2. Add domain: `uitdeitp.ro`
3. Update DNS records (A/CNAME)
4. Wait for SSL provisioning (~5 minutes)

## 🧪 Scripts

```bash
# Development
npm run dev          # Start dev server (port 3000)

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm run format       # Format with Prettier
```

## 📖 Documentation

Full documentation available in `/docs`:
- Architecture: `/docs/architecture/IMPLEMENTATION-GUIDE.md`
- Database: `/docs/database/README.md`
- Testing: `/docs/testing/README.md`

## 🤝 Support

For issues or questions, contact: contact@uitdeitp.ro

---

**Version**: 2.0.0
**License**: Private
**Built with**: Next.js 14 + Supabase + TailwindCSS
