# NEML Badminton Championship — Full-Stack Platform

**Live Auction + Tournament Management** for NEML Badminton Championship (multi-season).

- **Frontend:** Next.js 14 (App Router, TypeScript, Tailwind) — `/app/frontend`
- **Backend:** Spring Boot 3.2.5 (Java 17, JPA, Spring Security, WebSockets/STOMP) — `/app/backend`
- **Database:** PostgreSQL 15

## Quick Start (local machine)

### 1. Prerequisites
```
Java 17 · Maven 3.8+ · Node 18+ / Yarn · PostgreSQL 15
```

### 2. PostgreSQL
```bash
createdb neml_badminton
# ensure `postgres` user has password `postgres` (or set env vars)
```

### 3. Backend
```bash
cd backend
export DB_URL=jdbc:postgresql://localhost:5432/neml_badminton
export DB_USER=postgres
export DB_PASSWORD=postgres
export JWT_SECRET="change-me-256-bit-secret-value-goes-here-please-make-me-very-long"
mvn -DskipTests package
java -jar target/badminton-0.0.1-SNAPSHOT.jar
# Backend up on :8001
# Data auto-seeded on first boot
```

### 4. Frontend
```bash
cd frontend
cp .env.local.example .env.local  # points to http://localhost:8001
yarn install
yarn dev
# Frontend on http://localhost:3000
```

## Seeded Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@neml.com` | `Admin@123` |
| Team Owner (Chennai) | `owner-che@neml.com` | `Owner@123` |
| Team Owner (Bangalore) | `owner-blr@neml.com` | `Owner@123` |
| Team Owner (Mumbai) | `owner-mum@neml.com` | `Owner@123` |
| Team Owner (Delhi) | `owner-del@neml.com` | `Owner@123` |
| Viewer | `viewer@neml.com` | `Viewer@123` |

Seed data: **4 teams** (₹100 Cr purse each) · **48 players** (36 M + 12 F, uniform base ₹20 L).

## Core API

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/login` | `{email,password}` → `{token,user}` |
| GET | `/api/auth/me` | requires Bearer JWT |
| GET | `/api/teams` · `/api/teams/{id}` · `/api/teams/{id}/players` | public |
| GET | `/api/players` · `/api/players/{id}` | public |
| GET | `/api/auction/state` · `/api/auction/history` | public |
| POST | `/api/auction/bid` | `{playerId,teamId,amount}` — enforces solvency + composition |
| POST | `/api/admin/auction/{start\|pause\|resume\|undo\|sell\|unsold\|next\|set-current\|coin-toss}` | ADMIN only |
| WS | `/ws` (STOMP `/topic/auction`) | live state + events |
