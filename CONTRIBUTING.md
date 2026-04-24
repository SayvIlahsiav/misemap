# Contributing to MiseMap

MiseMap is a private internal tool maintained by Sayv Ilahsiav. This guide is for developers making changes to the codebase.

---

## Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/misemap.git
cd misemap
npm install
cp .env.example .env
# Fill in .env with Supabase and Anthropic credentials
npm run dev
```

App runs at `http://localhost:5173` and connects to the shared Supabase database.

---

## Project Conventions

- All components are in `src/App.jsx` — this is intentional for simplicity; no sub-folder component splitting unless the file exceeds ~2000 lines
- Styles are inline JavaScript objects — no CSS files, no Tailwind in production build
- Storage is abstracted through `src/lib/storage.js` — never call Supabase directly from `App.jsx`
- All monetary values are in Indian Rupees (₹)
- All IDs are generated client-side with `uid()` — no server-side ID generation

---

## Making Changes

1. Create a branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test locally: `npm run dev`
4. Build check: `npm run build` (must pass with zero errors)
5. Commit with a clear message: `git commit -m "feat: describe what you added"`
6. Push and open a pull request to `main`

---

## Commit Message Format

```
feat: add export to Excel
fix: packaging cost not applying to delivery price
refactor: extract IngPicker into separate file
docs: update README setup steps
chore: update dependencies
```

---

## Deployment

Vercel automatically deploys every push to `main`. No manual deployment steps needed.

---

*Questions? Contact Sayv Ilahsiav at [apps.sayvilahsiav.com](https://apps.sayvilahsiav.com)*
