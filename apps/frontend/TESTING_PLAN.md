# Frontend MVP Testing Plan

## Prerequisites
- Backend intelligence server running and accessible at the URL configured in `VITE_API_BASE_URL` (defaults to `http://localhost:4000`).
- Frontend dependencies installed in `apps/frontend` (`npm install`).

## Environment
1. Create or update `.env` in `apps/frontend` with:
   ```bash
   VITE_API_BASE_URL=http://localhost:4000
   # Optional: force mock data when backend endpoints are unavailable
    VITE_USE_MOCK_DATA=true
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Access the app at the host/port reported by Vite (usually `http://localhost:5173`).

## Smoke Tests
- **Tab navigation**: Verify `Morning Brief`, `Contacts`, `Projects`, and `Research` tabs render without errors and update the `?tab=` query parameter.
- **Morning Brief data**: Confirm the brief loads from `/api/intelligence/morning-brief`. Disconnect the backend to ensure fallback stub data renders with the loading/error states.
- **Contact Hub search**: Check `/api/contacts/stats` and `/api/contacts/search` requests fire when filtering; validate the “has email” filter and quick search chips.
- **Projects view**: Ensure `/api/real/projects` and `/api/calendar/events` (if available) responses populate the Community Projects cards. Validate empty/error messaging if endpoints fail.
- **AI Agent**: Open the floating AI button, send a test prompt, and confirm `/api/v2/agent/ask` responses append to the chat. Verify graceful error message when offline.

## Regression Checks
- Run `npm run lint` and `npm run typecheck` inside `apps/frontend`.
- Optionally execute Playwright smoke tests (`npm run test` if available) once data connections are verified.

## Post-Test Actions
- Capture any API failures with reproduction steps and log them for backend follow-up.
- Note UX or performance feedback for subsequent sprint planning.
