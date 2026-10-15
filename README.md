# PennyGrade — Membership & Partner Discount Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.168-orange.svg)](https://tanstack.com/start)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_17-3ecf8e.svg)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.2-38bdf8.svg)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested-green.svg)](https://vitest.dev/)

PennyGrade is an enterprise-grade membership and lifestyle partner discount platform. Members hold exclusive physical and digital cards granting verified discounts across curated partner venues (cafés, dining, hotels, wellness, fitness, and lifestyle).

---

## Key Architecture Principles

### 1. Zero Partner Friction
Normal partner billing operations require **zero device or portal interaction** from venue staff:
* Partners display a permanent venue QR code at checkout.
* The customer scans the QR code on their mobile device, inputs their bill amount, and instantly generates a dynamic, time-limited verification screen.
* Staff visually verifies the discount and payable total on the customer's screen and applies the discount directly into their existing POS or bill book.
* No partner apps, no dedicated staff logins, and no hardware required.

### 2. Server-Enforced Trust Boundary
All discount rules, validity dates, minimum bill requirements, day-of-week eligibility, and verification sessions are evaluated and computed **strictly server-side** (via PostgreSQL security-definer routines and TanStack Start server functions). Clients never compute discounts.

### 3. Anti-Enumeration Membership IDs
Membership numbers and physical card codes use cryptographically secure non-sequential identifiers (`PEN-XXXX-XXXX`) generated via `pgcrypto` and crypto-secure entropy pools. Brute-force guessing is mitigated by server-side sliding-window rate limiting.

### 4. Defense-in-Depth Row-Level Security (RLS)
PostgreSQL Row-Level Security is active across all database tables:
* Public catalog (partners, active categories, published offers) is safely queryable with anon keys.
* Customer identities, membership cards, verification sessions, and admin logs remain strictly compartmentalized and inaccessible without elevated authorization.

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [TanStack Start](https://tanstack.com/start) + [React 19](https://react.dev/) | Full-stack SSR, type-safe routing, and server functions |
| **Runtime & Bundler** | [Vite 8](https://vite.dev/) + [Nitro](https://nitro.unjs.io/) | Fast HMR dev server and optimized multi-target SSR build |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL 17) | Relational persistence, RLS policies, GoTrue authentication |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern high-performance styling engine |
| **UI Components** | [Radix UI](https://www.radix-ui.com/) + [Lucide Icons](https://lucide.dev/) | Accessible primitives, modals, toasts, and iconography |
| **Data Fetching** | [TanStack Query v5](https://tanstack.com/query) | Declarative server-state caching and synchronization |
| **Validation** | [Zod v3](https://zod.dev/) | Runtime schema validation for server functions and API inputs |
| **Testing** | [Vitest](https://vitest.dev/) + React Testing Library | Unit, integration, and routing acceptance test suites |

---

## Project Structure

```
penny-perks-plus/
├── src/
│   ├── components/           # Reusable UI components & layout elements
│   │   ├── ui/               # Radix UI primitives & design tokens
│   │   └── site.tsx          # Shared site header, footer, and navigation
│   ├── integrations/         # External platform adapters
│   │   └── supabase/         # Supabase client, server-admin client, and types
│   ├── lib/                  # Core application services & server functions
│   │   ├── admin.functions.ts  # Privileged administrative server operations
│   │   ├── public.functions.ts # Public partner catalog & verification server functions
│   │   ├── error-logger.ts     # Enterprise structured error telemetry
│   │   └── v1-store.ts         # Member resolution & rate-limiting engine
│   ├── routes/               # TanStack Router file-based route definitions
│   │   ├── _authenticated/   # Protected administrative dashboard routes
│   │   ├── p.$partnerSlug.tsx# Customer venue verification page (QR landing)
│   │   ├── verification.$id.tsx# Live visual verification session screen
│   │   └── index.tsx         # Public marketing home & partner discovery
│   └── test/                 # Acceptance and routing test suites
├── supabase/
│   ├── migrations/           # Versioned SQL migrations (000000_init.sql)
│   └── config.toml           # Supabase CLI project configuration
├── drizzle/                  # Database schema definitions and Drizzle Kit config
└── .env                      # Environment variables (git-ignored)
```

---

## Getting Started

### Prerequisites
* **Node.js** >= 20.x
* **npm**, **pnpm**, or **bun**
* **Supabase CLI** >= 2.x

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd penny-perks-plus
npm install
```

### 2. Configure Environment Variables
Copy or create `.env` in the project root:
```ini
SUPABASE_PROJECT_ID="your-project-ref"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-or-publishable-key"
# Server only; never prefix this key with VITE_ or expose it to the browser.
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
ADMIN_SESSION_SECRET="replace-with-a-long-random-secret"

VITE_SUPABASE_PROJECT_ID="your-project-ref"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-or-publishable-key"
```

### 3. Database Migration
Ensure the remote Supabase database matches the versioned migrations:
```bash
npx supabase db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` (or the port specified by the dev server) to view the application.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local development server with Vite HMR |
| `npm run build` | Compiles the production bundle with Nitro server SSR |
| `npm run preview` | Runs the local preview server against the built bundle |
| `npm run test` | Executes the Vitest test suite |
| `npm run typecheck` | Validates TypeScript types across the entire project |
| `npm run lint` | Lints source code using ESLint |
| `npm run format` | Formats all files using Prettier |

---

## Verification & Discount Calculation Workflow

```
Customer scans venue QR code
           │
           ▼
GET /p/:partnerSlug
           │
           ▼
Customer inputs Membership / Card ID + Total Bill
           │
           ▼
Server RPC / Server Function:
  ├── Verify membership validity & status
  ├── Check day-of-week eligibility & minimum bill
  ├── Calculate discount (Percentage / Fixed, capped by max_discount)
  └── Create 5-minute time-limited Verification Session
           │
           ▼
Display Live Verification Screen (/verification/:sessionId)
  ├── Animated countdown timer
  ├── Venue name & verified badge
  ├── Original bill, discount savings, and final payable amount
           │
           ▼
Venue staff visual confirmation & checkout application
```

---

## Security & Reliability

* **Non-Persistent Browser Secrets**: Neither the database password nor the `service_role` key is ever packaged in client-side bundles.
* **Brute-Force Protection**: Rapid verification requests are throttled with sliding-window rate limiters.
* **Audit Trail**: Administrative actions, card issuances, and member updates record structured logs in the `audit_logs` table.

---

## License

Proprietary and confidential. All rights reserved.
