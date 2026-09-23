# DavCreations — Multi-Vendor Marketplace Testing Environment

[![last commit](https://img.shields.io/github/last-commit/5h4d0wn1k/testingdevenv)](https://github.com/5h4d0wn1k/testingdevenv)
[![issues](https://img.shields.io/github/issues/5h4d0wn1k/testingdevenv)](https://github.com/5h4d0wn1k/testingdevenv)

A Next.js multi-vendor marketplace development and testing environment: seller
storefront with orders, returns, financials, commissions and payouts, plus
Stripe payments, Clerk authentication, and a large suite of integration test
scripts.

## Why

Marketplace money flows are the hardest part to get right — commissions,
coupons, shipping, returns, and per-store payouts interact in edge-case-heavy
ways. This repo is a dedicated dev/test environment for the DavCreations
marketplace stack: it couples a real app (Next.js storefront + seller
dashboard, serverless Postgres via Neon + Prisma, Stripe checkout, Inngest
background jobs) with 19+ standalone test scripts that exercise commission
math, payouts, cross-cutting flows, error handling, validation, search, and
file uploads against a live database. That makes it a practical harness for
verifying money and data-integrity behavior before production.

## Features

- **Seller dashboard** — products, orders, returns, analytics, financials
  (commissions & payouts), branding, bulk upload, onboarding, profile, and
  support pages under `app/store/`.
- **Commission & payout engine** — `CommissionRate` and `Payout` Prisma models
  plus nightly financial aggregation, with dedicated test scripts
  (`test-commission.js`, `test-platform-commission.js`, `comprehensive-commission-test.js`).
- **Stripe payments** — checkout, coupon, and webhook API routes (`app/api/stripe`,
  `app/api/coupon`, `app/api/webhooks`).
- **Clerk authentication** — `clerkMiddleware()` protecting routes and API
  surface; RBAC helpers in `lib/rbac.js`.
- **Inngest background jobs** — user sync, coupon expiry cleanup, nightly
  financial and analytics aggregation, and order/return status updates.
- **Media & uploads** — ImageKit config with a `sharp`-based upload/rating
  pipeline and file-type validation.
- **AI & moderation** — OpenAI-backed moderation and rating features
  (`configs/openai.js`, `lib/moderationEngine.js`).
- **Test harness** — 19+ Node.js test scripts covering commissions, payouts,
  search (`test-enhanced-search`, `test-levenshtein`), notifications, file
  uploads, validation, and error handling.

## Quickstart

### Prerequisites

- Node.js 18+, a Postgres database (Neon works), and env entries for Clerk,
  Stripe, ImageKit, and OpenAI.

### Run the dev environment

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, Clerk, Stripe, ImageKit, OpenAI keys
npm run dev
```

Open `http://localhost:3000`.

### Run the test scripts

```bash
npm run build          # prisma generate + next build
node test-commission.js
node test-payout.js    # plus any of the 19+ test-*.js scripts
```

## Project structure

```
app/            Next.js app (storefront, seller dashboard, API routes)
lib/            engine modules (pricing, commissions, search, RBAC, email, uploads)
inngest/        background job definitions (client.js, functions.js)
prisma/         Database schema (User, Product, Order, CommissionRate, Payout, ...)
configs/        ImageKit and OpenAI client config
test-*.js       Standalone integration/regression test scripts
```

## Contributing

Run `npm run lint` and the relevant `test-*.js` scripts before submitting
changes. Keep money-flow tests green.

## License

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

