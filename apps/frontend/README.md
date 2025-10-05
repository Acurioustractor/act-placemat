# ACT Community Interface Frontend

Modern React + TypeScript + Vite application powering the community control studio. This app consumes real APIs (Supabase, Xero, LinkedIn, Notion) and exposes empowerment surfaces for projects, network intelligence, finance, stories, and sovereignty.

## Project layout

- `src/App.tsx` – application shell with mission-focused navigation
- `src/components/` – feature verticals (projects, network, revenue, stories, data)
- `src/components/ui/` – shared presentation primitives (`Card`, `SectionHeader`, etc.)
- `src/services/api.ts` – strongly typed API helpers and fetch utilities
- `tailwind.config.js` + `src/index.css` – ACT design language (brand, ocean, clay palettes)

## Prerequisites

- Node.js 20+
- Backend running at `http://localhost:4000` (for `/api` proxy)
- Supabase + integration environment variables configured in `apps/backend/.env`

## Clean build workflow

```bash
# install dependencies (once)
npm install

# wipe previous artifacts to avoid stale assets
npm run clean

# typecheck before bundling for faster failures
npm run typecheck

# lint UI code (optional but recommended)
npm run lint

# production build (includes clean + Vite build with sourcemaps)
npm run build

# preview the production bundle locally
npm run preview
```

The `clean` script removes `dist/` and Vite cache folders so outdated CSS or data scaffolding never leaks into the next build. `vite.config.ts` enforces `emptyOutDir` and sourcemaps for reproducible deployments.

## Design system

- TailwindCSS 3.x with curated palettes (`brand`, `ocean`, `clay`)
- Inter & Plus Jakarta Sans for typography
- Headless UI components built via utility classes to keep bundle slim and easy to audit

## Mission guardrails

Each feature tab reinforces the Beautiful Obsolescence philosophy:

- **Community Projects** – Supabase projects in exportable, sovereignty-first cards
- **Community Network** – CRM analytics with filters and project alignment
- **Revenue Transparency** – Financial snapshots sourced from `/api/v1/financial/*`
- **Story Studio** – Consent-aware storytelling workspace
- **Data Sovereignty** – Independence scoring, export bundles, integration health

Keep new features scoped to community empowerment, data control, and handover readiness. When adding components, extend `src/components/ui/` so styling stays consistent.

## Environment tips

- Use `.env.local` to point the frontend proxy to alternate environments
- Add new API calls to `src/services/api.ts` for a single fetch surface
- Co-locate stateful logic with components; use React Query or Zustand when server state grows
- Run `npm run lint` + `npm run typecheck` in CI to catch regressions before deployment

