# DeployOne

Next.js 14 (App Router) + TypeScript + Tailwind CSS project with two parts:

- `/` — Company landing page (Linear/Vercel-style glassmorphism)
- `/dashboard` — Deploy management dashboard (rebuilt 1:1 from the original HTML artifact's logic)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Notes

- **Auth is a dummy flow.** No NextAuth/real OAuth — "Login with Google" opens an account
  chooser with two fake accounts, simulates an 800ms load, then stores `{name, email, avatar, color}`
  in `localStorage` under `deployone-user`. Logout clears it and returns to `/`.
- **Theme** persists in `localStorage` under `deployone-theme` via `next-themes`, driving the
  `data-theme="dark" | "light"` attribute and the CSS variables in `app/globals.css`.
- **Dashboard state** (`lib/deploy-context.tsx`) mirrors the original artifact exactly:
  - Seed stats: `total=3, ready=2, failed=1`
  - GitHub repo validation regex: `^https:\/\/github\.com\/[^/]+\/[^/]+`
  - History caps at 10 entries (oldest dropped); a confirm modal appears when you deploy while
    already at the cap
  - Deploy simulation: 5 steps, one every 700ms, progress bar `step/5 * 100%`, then a 300ms
    delay before showing the result panel
  - Slugify + domain resolution: `.pages.dev` for Cloudflare, `.vercel.app` otherwise
