# Mozopost — Full-Stack Shipping Aggregator

A genuinely runnable backend (Express + TypeScript + PostgreSQL) and frontend
(Next.js 14) for an Indian multi-courier shipping aggregator. Every courier
and payment integration works in **mock mode** out of the box — you can run
the entire order → fraud-check → book → track → wallet flow with zero API
keys. Add real keys later, one courier at a time, with no code changes.

---

## 1. What you get

- **Auth** — JWT access + refresh tokens, bcrypt password hashing, login lockout after 5 failed attempts
- **Orders** — full creation flow: fraud check → rate calculation → auto courier allocation → wallet debit → AWB booking → tracking event
- **Fraud engine** — real backend logic (not just UI): blacklist check, duplicate customer detection, RTO history, address quality scoring
- **Couriers** — pluggable adapter per courier; runs in mock mode (fake AWB + realistic tracking timeline) until you add that courier's API key
- **Wallet** — balance, transaction history, recharge via Razorpay (or instant mock credit if no Razorpay keys set)
- **NDR** — non-delivery report tracking and resolution actions
- **3 dashboards** — Seller, Master Admin, Super Admin, each with role-based routes and UI
- **Webhooks** — `/api/v1/webhooks/courier-status` endpoint ready to receive real courier callbacks
- **NDR testing** — `POST /api/v1/ndr/:orderId/simulate` lets you manually trigger a non-delivery report on any order, so you can test the full NDR resolution flow without waiting for a real courier event

## 2. Prerequisites

- Node.js 20+
- A PostgreSQL database — free options: [neon.tech](https://neon.tech), [supabase.com](https://supabase.com), or run locally with Docker:
  ```bash
  docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres --name mozopost-db postgres:16
  ```

## 3. Setup (one-time)

```bash
# 1. Install all dependencies (root + both apps)
npm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 3. Edit apps/api/.env — at minimum set:
#    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mozopost
#    JWT_SECRET=<run: openssl rand -base64 48>
#    CREDENTIALS_ENCRYPTION_KEY=<run: openssl rand -hex 32>

# 4. Create all database tables + seed reference data (couriers, rate cards, pincodes)
npm run db:push

# 5. Create demo login accounts
npm run db:seed
```

## 4. Run it

```bash
npm run dev
```

This starts both servers concurrently:
- API → http://localhost:3001 (health check at `/health`)
- Web → http://localhost:3000

Open http://localhost:3000 and log in with one of the seeded demo accounts:

| Role | Email | Password |
|---|---|---|
| Seller | `seller@demo.com` | `Demo@1234` |
| Master Admin | `admin@demo.com` | `Demo@1234` |
| Super Admin | `superadmin@demo.com` | `Demo@1234` |

You can immediately create an order, watch the live fraud score, book a
shipment (gets a real-looking mock AWB), and track it — all without any
courier or payment API keys.

## 5. Adding real integrations

Everything below is **optional**. The platform is fully testable without any of it.

### Courier APIs
Open `apps/api/.env` and fill in the key block for whichever courier you've
onboarded with (e.g. `DELHIVERY_API_KEY=...`). The moment a key is present,
that courier's adapter automatically switches from mock to live — no code
or restart-logic changes needed beyond restarting the API process to reload
env vars.

A full reference implementation is included for **Delhivery**
(`apps/api/src/couriers/adapter.ts` → `bookDelhivery` / `trackDelhivery`) as
a template. To wire up another courier, add a similar method following
their API docs and a `case` in the `bookLive`/`trackLive` switch statements.

### Payments (wallet recharge)
Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `apps/api/.env`, and
`NEXT_PUBLIC_RAZORPAY_KEY_ID` to `apps/web/.env.local`. Without these, wallet
recharge instantly credits the wallet in mock mode so you can test order
flows that require balance.

### SMS / OTP
Add `MSG91_AUTH_KEY` etc. to send real OTPs. The fraud-check flow on the
frontend doesn't currently call out to SMS (the original prototype panel's
OTP demo code `472819` was UI-only); wiring a real `services/sms.ts` using
`generateOtp()` from `apps/api/src/fraud/engine.ts` is the next step if you
need OTP verification gating order creation.

## 6. Project structure

```
mozopost/
├── apps/
│   ├── api/                  Express + TypeScript backend
│   │   ├── .env.example      ← the file you edit
│   │   └── src/
│   │       ├── auth/         login, register, JWT, refresh tokens
│   │       ├── orders/       order creation, rating, auto-allocation
│   │       ├── couriers/     courier adapter (mock ⇄ live switch)
│   │       ├── fraud/        fraud scoring engine
│   │       ├── wallet/       balance, transactions, Razorpay
│   │       ├── ndr/          non-delivery report handling
│   │       ├── tracking/     AWB tracking
│   │       ├── webhooks/     courier status callback receiver
│   │       └── admin/        master admin + super admin routes
│   └── web/                  Next.js 14 frontend
│       └── src/app/
│           ├── login, register/
│           └── dashboard/    seller UI
│               └── admin/    master/super admin UI
└── packages/
    └── db/
        ├── schema.sql        full Postgres schema (idempotent)
        ├── push.js           applies schema.sql
        └── seed/run.js       creates demo accounts
```

## 7. Deployment

**Database:** Neon or Supabase (free tier works for testing)

**API:** Railway or Render
- Point at `apps/api`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Set all env vars from `.env.example` in the platform's dashboard

**Web:** Vercel
- Point at `apps/web`
- Set `NEXT_PUBLIC_API_URL` to your deployed API URL + `/api/v1`

After deploying, run `npm run db:push && npm run db:seed` once against your
production `DATABASE_URL` (or run the equivalent SQL/seed manually).

## 8. Known limitations (by design, for a first deployment)

- **COD settlement batching** — the `cod_remittances` table and admin UI exist, but no scheduled job auto-creates settlement batches yet. In production this is normally a daily cron job; add one before relying on COD settlement reporting.
- **OTP verification** is computed (`generateOtp()`) but not yet wired to an SMS send + verify gate in the order flow — currently advisory only via the fraud engine's flags.
- **Refresh token lookup** scans all active tokens and bcrypt-compares each one. Fine at small-to-medium scale; if you have thousands of concurrent users, switch to storing a lookup-friendly token ID alongside the hash.
- **Only Delhivery has a real courier API implementation** as a working reference. All other couriers run in mock mode until you add their live implementation following the same pattern.
