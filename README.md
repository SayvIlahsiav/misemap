# 🗺️ MiseMap

**Recipe costing, nutrition tracking, and menu pricing for modern kitchens.**

Built by [Sayv Ilahsiav](https://apps.sayvilahsiav.com) · Powered by React, Supabase, and Claude AI.

---

## What is MiseMap?

MiseMap is an internal kitchen management tool that lets your team:

- **Map every ingredient** — raw materials with pack costs, unit conversions, and full nutritional values
- **Build prep recipes** — intermediates like sauces, marinades, and bases
- **Cost every menu item** — live food cost calculations across your full recipe graph
- **Price intelligently** — SP multiplier, packaging cost, and delivery markup at global, category, and per-item level
- **Catch margin problems early** — FC% alerts with colour-coded badges when items breach your threshold
- **Move faster with AI** — type an ingredient name, hit AI Suggest, and MiseMap auto-fills category, unit, conversion, and all 7 nutritional values

All data is shared in real time across your entire team via Supabase.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude API |
| Hosting | Vercel |

---

## Setup Guide

### What You Need (all free tiers work)

| Service | Purpose | URL |
|---------|---------|-----|
| GitHub | Code hosting | github.com |
| Supabase | Shared real-time database | supabase.com |
| Vercel | Hosting + CI/CD | vercel.com |
| Anthropic | AI Suggest feature | console.anthropic.com |

---

### Step 1 — Supabase (~5 min)

1. Sign up at [supabase.com](https://supabase.com) → **New Project** → name it `misemap`
2. Go to **SQL Editor → New Query**, paste and run:

```sql
create table if not exists kv_store (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz default now()
);
alter table kv_store enable row level security;
create policy "Public read"   on kv_store for select using (true);
create policy "Public write"  on kv_store for insert with check (true);
create policy "Public update" on kv_store for update using (true);
create policy "Public delete" on kv_store for delete using (true);
```

3. Go to **Settings → API** and copy your **Project URL** and **anon public key**
4. Under **Settings → API → Data API** enable: Data API ✅, Automatic expose ❌, Automatic RLS ✅

---

### Step 2 — Push to GitHub (~3 min)

Create a new private repo called `misemap` on GitHub, then:

```bash
npm install
git init
git add .
git commit -m "Initial commit — MiseMap v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/misemap.git
git push -u origin main
```

---

### Step 3 — Deploy on Vercel (~3 min)

1. [vercel.com](https://vercel.com) → **Add New Project** → import `misemap`
2. Add these Environment Variables before deploying:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `VITE_ANTHROPIC_API_KEY` | Your Anthropic API key |

3. Click **Deploy** — live URL in ~60 seconds. Share it with your team.

---

### Getting Your Anthropic API Key

Go to [console.anthropic.com](https://console.anthropic.com) → **API Keys → Create Key** → add to Vercel as `VITE_ANTHROPIC_API_KEY`.

---

## Running Locally

```bash
cp .env.example .env   # then fill in your credentials
npm install
npm run dev            # → http://localhost:5173
```

---

## Deploying Updates

```bash
git add .
git commit -m "describe your change"
git push
# Vercel auto-deploys in ~45 seconds
```

---

## Project Structure

```
misemap/
├── src/
│   ├── App.jsx          # All pages, components, and logic
│   ├── main.jsx         # React entry point
│   └── lib/
│       └── storage.js   # Supabase client + KV storage API
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── PRIVACY.md
└── CHANGELOG.md
```

---

## Security Notes

- The Supabase **anon key** is safe client-side — access is controlled by RLS policies
- The Anthropic API key is used client-side for AI Suggest
- Never commit your `.env` file — it is git-ignored
- Never expose your Supabase **service_role** key

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Stuck on "Connecting to database" | Check Supabase URL and anon key in env vars |
| Data not persisting | Confirm `kv_store` table exists with RLS policies in Supabase |
| AI Suggest fails | Check Anthropic API key and account credits |
| Build fails | Run `npm run build` locally to see errors |

---

## Author

**Sayv Ilahsiav** · [apps.sayvilahsiav.com](https://apps.sayvilahsiav.com)

© 2025 Sayv Ilahsiav. All rights reserved. Proprietary — internal use only.
