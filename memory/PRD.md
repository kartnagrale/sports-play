# NEML Badminton Championship — PRD

## Problem Statement (verbatim)
Build a modern, responsive, real-time Badminton Auction and Tournament Management Platform for NEML Badminton Championship (multi-season) — an IPL-style live auction combined with badminton league management, analytics, scoreboard, matches, teams, top performers, etc. 4 teams, 48 players, live auction via WebSockets, 3 roles (Admin / Team Owner / Viewer). Every team buys exactly 12 players (min 3 female, 9 male). Base price uniform but configurable. Purse ₹100 Cr per team. Prevent bidding that leaves team unable to complete squad. Rich analytics, dark & light themes, real-time. Tech: Next.js + Spring Boot + PostgreSQL.

## User Choices
- Stack: **Next.js + Spring Boot + PostgreSQL** (option b — user insisted)
- Auth: **JWT-based custom auth**
- Scope for MVP: **Core Auction Engine + Dashboard + Auth** (option a)
- Real-time: **WebSockets** (STOMP over SockJS)
- Seed data: **YES** — 4 teams, 48 players, admin/owners/viewer

## Architecture

### Backend (`/app/backend`, Spring Boot 3.2.5 / Java 17 / PostgreSQL 15)
- **Package:** `com.neml.badminton`
- **Layers:** `entity` · `repository` · `dto` · `service` · `controller` · `websocket` · `security` · `seed`
- **Auth:** JWT via `jjwt-0.12.5`. `JwtAuthFilter` sets `Authentication` from `Authorization: Bearer …`.
- **REST base:** every endpoint is `/api/*` (routed via ingress).
- **WebSocket:** STOMP endpoint at `/ws` (SockJS fallback). Broadcast topic `/topic/auction`.
- **DB:** JPA/Hibernate `ddl-auto=update`, PostgreSQL. Idempotent `DataSeeder` runs once when Users table is empty.

### Frontend (`/app/frontend`, Next.js 14 App Router / TypeScript)
- **App Router** with route groups: `/login`, `(authed)/dashboard`, `(authed)/auction`, `(authed)/teams`, plus placeholder stubs for scoreboard, matches, analysis, format-leaders, top-performers, announcements, and a live auction-history table.
- **State:** `zustand` for auth (persisted in `localStorage`).
- **HTTP:** `axios` with baseURL from `NEXT_PUBLIC_BACKEND_URL`, auto-attaches JWT.
- **WebSocket client:** `@stomp/stompjs` + `sockjs-client` — reconnecting, subscribes to `/topic/auction`.
- **Design:** Dark-primary "Performance Pro" theme; Oswald headings + Outfit body; Lime (#D3FF24) & Cyan (#00F0FF) accents; grain overlay, glassmorphism cards.

## What's Implemented (2026-07-14)
- ✅ JWT auth (login, me), Spring Security with role-based endpoint protection.
- ✅ 4 teams seeded (Chennai / Bangalore / Mumbai / Delhi) with ₹100 Cr purse each.
- ✅ 48 players seeded (36 male + 12 female, uniform base price ₹20 L, stored in DB — configurable per-player later).
- ✅ Auction engine: start / pause / resume / place bid / undo last bid / sell to highest / manual sell to specific team / mark unsold / next player / set specific player on block / coin toss (random).
- ✅ Solvency guard: rejects bid if remaining purse can't cover remaining slots × base price.
- ✅ Composition guard: rejects bid if squad can't still meet 3F/9M with remaining slots.
- ✅ Live WebSocket broadcasts on every state change and event (BID_PLACED / PLAYER_SOLD / PLAYER_UNSOLD / BID_UNDONE / COIN_TOSS / STATE).
- ✅ Frontend pages: Login (with 3 quick-fill role buttons), Dashboard (KPIs, team purse cards, announcements, schedule), Auction Arena (live player card with bid flash, admin controls, bid panel, live purse sidebar, history feed, coin-toss dialog), Teams (tabs per team + squad table), Auction History (chronological).
- ✅ Placeholder tabs for Scoreboard / Matches / Team Analysis / Format Leaders / Top Performers / Announcements (Phase 2).
- ✅ Sonner toast notifications on every auction event.

## User Personas
1. **Tournament Admin** — Runs the auction, controls state, resolves ties, enforces rules.
2. **Team Owner** — Bids on players from their own team purse; monitors squad composition.
3. **Viewer / Player** — Public read-only view of live auction, standings, and analytics.

## Prioritized Backlog

### P0 — Auction quality-of-life
- [ ] Manual sell dialog for admin (pick team + amount when the auto-sell logic isn't right).
- [ ] Configurable per-player base price UI in admin.
- [ ] Auction timer (countdown per player), auto-mark unsold when timer expires.
- [ ] Team-owner scoped bid restriction (owner can only bid for own team).

### P1 — League management (Phase 2)
- [ ] Matches module: fixtures, 5-format scoring, live match entry.
- [ ] Scoreboard: points, W/L, penalties (auto-deduct 2 pts if a squad member didn't play any league match).
- [ ] Team Analysis: win %, format wins, head-to-head, strongest/weakest formats.
- [ ] Format Leaders (5 formats).
- [ ] Top Performers (streaks, MVP, win margins).

### P2 — Nice-to-haves
- [ ] Light theme toggle.
- [ ] Announcements CRUD (admin).
- [ ] Multi-season support (season selector on all data).
- [ ] Player profile pages with avatars + stats.

## Deployment Notes
- Backend needs PostgreSQL. Container has Postgres 15 running (`neml_badminton` DB, `postgres/postgres` creds).
- Spring Boot JAR is prebuilt at `/app/backend/target/badminton-0.0.1-SNAPSHOT.jar` and launched by supervisor (wrapper at `/root/.venv/bin/uvicorn`).
- Next.js runs `next dev` on `:3000` (managed by supervisor).
- Env vars used at runtime — see `/app/backend/src/main/resources/application.yml` and `/app/frontend/.env`.
