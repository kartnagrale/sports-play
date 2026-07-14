# NEML Badminton Championship — PRD

## Problem Statement (verbatim)
Build a modern, responsive, real-time Badminton Auction and Tournament Management Platform for NEML Badminton Championship (multi-season) — an IPL-style live auction combined with badminton league management, analytics, scoreboard, matches, teams, top performers, etc. 4 teams, 48 players, live auction via WebSockets, 3 roles (Admin / Team Owner / Viewer). Every team buys exactly 12 players (min 3 female, 9 male). Base price uniform but configurable. Purse ₹100 Cr per team. Prevent bidding that leaves team unable to complete squad. Rich analytics, dark & light themes, real-time. Tech: Next.js + Spring Boot + PostgreSQL.

## User Choices
- Stack: **Next.js + Spring Boot + PostgreSQL** (option b — user insisted)
- Auth: **JWT-based custom auth**
- Scope Phase 1 (MVP): Core Auction Engine + Dashboard + Auth ✅ **Done**
- Scope Phase 2: Matches + Scoreboard + Analytics ✅ **Done**
- Real-time: WebSockets (STOMP over SockJS)
- Seed data: YES — 4 teams, 48 players, admin/owners/viewer

## What's Implemented

### Phase 1 (2026-07-14)
- JWT auth (login, me), Spring Security role-based endpoints.
- 4 teams (₹100 Cr each) + 48 players (36 M + 12 F, uniform ₹20 L base).
- Auction engine: start / pause / resume / place bid / undo / sell / manual sell / mark unsold / next / set specific / random coin toss.
- Solvency + composition guards on every bid.
- Live WebSocket broadcasts (`/topic/auction`).
- Pages: Login, Dashboard, Live Auction, Teams, Auction History.

### Phase 2 (2026-07-14)
- **Match entity** with 5 playing formats per match (MS + WS + MD + XD + MD2 — realistic PBL scheme that fits 9M+3F squads).
- **MatchService**: create match (auto-creates 5 formats), assign players to a format (validates gender + affiliation + no-double-play), report result, auto-derive match winner when all 5 formats decided.
- **AnalyticsService**:
  - `standings` — points (3 per win), head-to-head, format wins, format diff, **auto-applied –2 pt penalty per unplayed squad member**.
  - `format-leaders` — team leading each of 5 formats by wins.
  - `team analysis` — win %, format breakdown, strongest/weakest format, head-to-head, squad participation %, unplayed list.
  - `top performers` — player-level: matches played, W/L, win %, longest streak, avg margin.
- **DemoService**: one-click `/api/admin/demo/populate?autoPlay=N` — assigns 48 players to 4 teams (9M+3F each), creates 6 round-robin fixtures, auto-plays N matches with random scores. Removes need to run full auction manually to see analytics.
- **Frontend pages upgraded**: Scoreboard (with penalty toggle + populate button), Matches (list + detail with per-format assignment & score entry), Format Leaders (5 cards), Top Performers (MVP table + mini leaderboards), Team Analysis (KPIs + format bars + head-to-head + participation).

## Architecture

### Backend (`/app/backend`, Spring Boot 3.2.5 / Java 17 / PostgreSQL 15)
- Package `com.neml.badminton`
- Layers: `entity` · `repository` · `dto` · `service` · `controller` · `websocket` · `security` · `seed`
- WebSocket STOMP `/ws` broadcasting to `/topic/auction`.
- REST base `/api/*` routed via ingress.
- New entities: `Match`, `MatchFormat`, `FormatType`, `MatchStatus`.
- New services: `MatchService`, `AnalyticsService`, `DemoService`.
- New controllers: `MatchController` (GET public), `AdminMatchController` (admin CRUD), `AnalyticsController` (GET public), `AdminDemoController`.

### Frontend (`/app/frontend`, Next.js 14 App Router + TypeScript)
- App Router route groups: `/login`, `(authed)/{dashboard,auction,scoreboard,matches,teams,analysis,format-leaders,top-performers,history,announcements}`.
- `zustand` auth store, `axios` client, `@stomp/stompjs` + `sockjs-client` for realtime.
- Design: dark-primary "Performance Pro" theme, Oswald + Outfit, Lime + Cyan accents, grain overlay, glassmorphism cards, bid flash + live glow animations.

## User Personas
1. **Tournament Admin** — Runs auction, schedules matches, records scores, resolves ties, monitors penalties.
2. **Team Owner** — Bids for own team, monitors purse and squad composition, views team analytics.
3. **Viewer / Player** — Read-only public view of live auction, standings, matches, analytics.

## Prioritized Backlog

### P0 — polish
- [ ] Real-time scoreboard/matches updates (broadcast events on match result — currently only auction is realtime).
- [ ] Team-owner-scoped bid restriction (owner can only bid for own team).
- [ ] Per-player countdown timer during auction with auto-unsold on expiry.
- [ ] Configurable per-player base price UI.

### P1 — nice to have
- [ ] Announcements CRUD (admin).
- [ ] Multi-season selector.
- [ ] Player profile pages with avatars.
- [ ] Light theme toggle.
- [ ] Public "Broadcast Mode" fullscreen view for venue projector.

## Deployment Notes
- Postgres 15 running (`neml_badminton` DB, `postgres/postgres`).
- Spring Boot JAR at `/app/backend/target/badminton-0.0.1-SNAPSHOT.jar` launched by supervisor.
- Next.js `next dev` on `:3000` (supervisor).
- Env: see `/app/backend/src/main/resources/application.yml` + `/app/frontend/.env`.

## Code Review Round 1 (2026-07-14)

### Security fix — httpOnly cookie auth (replaces localStorage token storage)
- Backend `AuthController.login` now emits `Set-Cookie: neml_auth=<jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`.
- Backend `AuthController.logout` clears cookie.
- Backend `JwtAuthFilter` prefers `Authorization: Bearer` header (for curl/tools) and falls back to the `neml_auth` cookie.
- Frontend `axios` client uses `withCredentials: true`; auth store no longer touches `localStorage`.
- Auth hydration on page load calls `/api/auth/me` — cookie survives refresh, JS can't read the token.
- Verified via Playwright: `Object.keys(localStorage) === []` before and after login; cookie flagged httpOnly/Secure.

### Hook dependency + error-handling fixes
- `useAuth().hydrate` now returns a Promise; JSON.parse try/catch replaced by explicit `console.warn` for non-401 errors.
- `AuctionPage`, `DashboardPage`, `MatchesPage`, `ScoreboardPage`: extracted `load()` into `useCallback` and added to effect dependency arrays. Removed all `eslint-disable-next-line` escapes.
- Added `handleEvent` `useCallback` for the WebSocket handler in the auction page so React can safely track it.

### Auction page refactor
- Extracted 3 sub-components to their own files under `src/components/auction/`:
  - `BidPanel.tsx`
  - `CoinTossDialog.tsx`
  - `BasePriceDialog.tsx`
- Split the page-level `AuctionPage()` into `AuctionHeader`, `StatusPill`, `LivePlayerCard`, `TimerOrLeader`, `EmptyPlayerState`, `AdminControlPanel`, `BidHistoryList`, `TeamPurseCard`. Total complexity drops significantly.
