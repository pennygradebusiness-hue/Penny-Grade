# PennyGrade SEO Architecture & Production Error Handling Guide

## 1. Architecture Overview

PennyGrade is an enterprise-grade membership and partner discount verification platform built with:
- **Framework**: TanStack Start + React 19
- **Routing**: TanStack Router (file-based routing with server functions)
- **Bundler & Server Runtime**: Vite 8 + Nitro (`nitro.unjs.io`)
- **Styling**: Tailwind CSS v4
- **Database & Auth**: Supabase PostgreSQL 17 + RLS policies + GoTrue Auth
- **Data Querying**: TanStack Query v5
- **Input Validation**: Zod v3

---

## 2. Technical SEO & Metadata Architecture

### 2.1 Centralized Metadata Helper (`src/lib/seo.ts`)
Route-level document head metadata is constructed via `buildPageHead`:
- **Canonical URLs**: Built via `buildCanonicalUrl(path)`, normalizing pathnames, enforcing HTTPS production origins, stripping query parameters, and eliminating duplicate trailing slashes (except root `/`).
- **Open Graph**: `og:site_name`, `og:type`, `og:title`, `og:description`, `og:url`, and absolute `og:image` (`/pennygrade-card.png` fallback or verified partner cover image).
- **Twitter / X Cards**: `twitter:card: summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`.
- **Indexing Directives**:
  - Public pages: `index, follow, max-image-preview:large, max-snippet:-1`
  - Sensitive / Authenticated pages: `noindex, nofollow`

### 2.2 Route Indexing Policy Matrix

| Route | Classification | Robots Directive | XML Sitemap | Structured Data (JSON-LD) |
| :--- | :--- | :--- | :--- | :--- |
| `/` | Public Marketing | `index, follow` | Included (`1.0`) | `Organization`, `WebSite`, `FAQPage` |
| `/how-it-works` | Public Discovery | `index, follow` | Included (`0.8`) | `BreadcrumbList` |
| `/partners` | Public Directory | `index, follow` | Included (`0.9`) | `BreadcrumbList` |
| `/partners/$slug` | Public Partner Profile | `index, follow` | Included (`0.7–0.8`) | `BreadcrumbList`, `LocalBusiness` |
| `/offers` | Public Offer Catalog | `index, follow` | Included (`0.9`) | `BreadcrumbList` |
| `/become-a-member` | Public Onboarding | `index, follow` | Included (`0.8`) | `BreadcrumbList` |
| `/partner-with-us` | Merchant Onboarding | `index, follow` | Included (`0.8`) | `BreadcrumbList` |
| `/terms` | Legal Terms | `index, follow` | Included (`0.3`) | `BreadcrumbList` |
| `/privacy` | Privacy Policy | `index, follow` | Included (`0.3`) | `BreadcrumbList` |
| `/history` | Customer Lookup | `noindex, nofollow` | **Excluded** | None |
| `/p/$partnerSlug` | Counter QR Flow | `noindex, nofollow` | **Excluded** | None |
| `/verification/$sessionId` | Ephemeral Session | `noindex, nofollow` | **Excluded** | None |
| `/login` | Deprecated Info | `noindex, nofollow` | **Excluded** | None |
| `/register` | Deprecated Info | `noindex, nofollow` | **Excluded** | None |
| `/admin/login` | Admin Authentication | `noindex, nofollow` | **Excluded** | None |
| `/_authenticated/*` | Admin & Account Panels | `noindex, nofollow` | **Excluded** | None |

---

## 3. Robots.txt & XML Sitemap Implementation

### 3.1 Robots.txt (`public/robots.txt`)
- Allows public assets (`.css`, `.js`, `.png`, `.jpg`, `.svg`, etc.).
- Proactively disallows sensitive and session routes:
  - `/admin/`
  - `/account/`
  - `/verification/`
  - `/p/`
  - `/history/`
  - `/login`
  - `/register`
- Explicitly declares production sitemap: `Sitemap: https://your-production-domain.example/sitemap.xml`.

### 3.2 Dynamic XML Sitemap (`src/routes/sitemap[.]xml.ts`)
- Serves compliant XML adhering to standard Sitemap Schema 0.9.
- Dynamic partner loading queries **ACTIVE** partners only (`status = 'ACTIVE'`).
- Sanitizes and XML-escapes partner slugs (`escapeXml`).
- Generates valid ISO `YYYY-MM-DD` timestamps for `<lastmod>`.
- Cache-Control header: `public, max-age=3600, s-maxage=3600`.
- Defensively wrapped in try/catch to ensure database outages never break core static sitemap delivery.

---

## 4. Structured Data (Schema.org JSON-LD)

Structured data is rendered into server-rendered HTML via `scripts: [{ type: "application/ld+json", children: JSON.stringify(...) }]`:
1. **Organization**: Declares PennyGrade identity, brand assets, contact email, and official presence.
2. **WebSite**: Declares platform name and `SearchAction` deep-link into partner directory (`/partners?q={search_term_string}`).
3. **BreadcrumbList**: Establishes navigation hierarchy for all nested public routes.
4. **LocalBusiness**: Categorizes partner outlets (e.g., `CafeOrCoffeeShop`, `Restaurant`, `Hotel`, `BeautySalon`, `HealthClub`, `Store`) with verified street address, phone, and geo coordinates.
5. **FAQPage**: Encodes verified member FAQs visible on the homepage.

---

## 5. Professional Error Handling Architecture

### 5.1 Root & Route-Level Error Boundaries
- **Root Error Boundary** (`src/routes/__root.tsx`):
  - Captures uncaught runtime exceptions before application collapse.
  - Generates and displays a unique correlation `Reference ID` for support tickets.
  - Offers accessible recovery controls (`Try Again` via `router.invalidate()`, `Return Home`).
  - Emits ARIA live region announcements (`role="alert"`, `aria-live="assertive"`).
  - Never exposes stack traces, SQL errors, or sensitive payload details to users.
- **Root 404 Not Found Boundary**:
  - High-contrast, brand-aligned 404 screen.
  - Direct links to homepage and partner directory.
- **Route-Level Boundaries** (`src/routes/partners.$slug.tsx`):
  - Handles missing or deleted partner records gracefully with `notFoundComponent` and localized retry buttons.

### 5.2 Server Functions & API Error Contracts (`src/lib/errors.ts`)
- Standardized response envelope:
  ```json
  {
    "ok": false,
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Please check the information you entered.",
      "requestId": "550e8400-e29b-41d4-a716-446655440000",
      "details": { "field": "billAmount" }
    }
  }
  ```
- Error codes:
  - `VALIDATION_ERROR` (HTTP 400/422)
  - `AUTHENTICATION_REQUIRED` (HTTP 401)
  - `FORBIDDEN` (HTTP 403)
  - `NOT_FOUND` (HTTP 404)
  - `SESSION_EXPIRED` (HTTP 410)
  - `RATE_LIMIT_EXCEEDED` (HTTP 429)
  - `INTERNAL_SERVER_ERROR` (HTTP 500)

### 5.3 Nitro Server Entry & HTTP Security Headers (`src/server.ts`)
- Catches catastrophic SSR failures from Nitro/h3.
- Renders branded static fallback HTML (`renderErrorPage(requestId)`) with 500 status.
- Consistently injects HTTP defensive security headers onto **both success and failure responses**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Request-Id: <correlation-id>`

### 5.4 Production Telemetry & Log Sanitization (`src/lib/error-logger.ts`)
- Automatically redacts sensitive fields before logging:
  - Passwords, OTPs, PINs
  - Bearer tokens, JWTs, Supabase secrets
  - Session cookies and authorization headers
- Attaches timestamp, boundary identifier, pathname, and correlation ID.

---

## 6. Critical Business Flow Error Guards

1. **Membership Verification (`verifyMemberInput`)**:
   - Enforces anti-enumeration: returns identical, generic error text for non-existent and malformed codes.
   - Sliding-window rate limiter prevents automated brute-force attacks.
2. **Discount Calculation (`createPublicVerification`)**:
   - Enforces strict server-side calculation.
   - Prevents negative and zero bills.
   - Validates minimum spend requirements.
   - Caps discounts at `max_discount` and ensures `discount <= bill_amount`.
   - India day-of-week offer validation.
3. **Counter QR Flow (`/p/$partnerSlug`)**:
   - Explicitly noindexed to prevent search indexing of venue counter landing screens.
   - Validates active partner status and eligible offers.
4. **Temporary Verification Sessions (`/verification/$sessionId`)**:
   - 5-minute cryptographic lifetime.
   - Status automatically transitions to `EXPIRED` once validity timestamp lapses.
   - Marked `ssr: false` and `noindex, nofollow` to prevent crawler caching.
5. **Customer History Lookup (`/history`)**:
   - Requires second-factor verification (membership number + registered mobile number).
   - Rate limited with generic lookup rejection to prevent number enumeration.
   - Marked `noindex, nofollow` to guarantee complete privacy.
6. **Admin Panel & RBAC (`src/lib/admin-auth.server.ts`)**:
   - Authoritative server-side authorization checks on all mutating server functions.
   - All `_authenticated` routes protected by layout guards and server checks.

---

## 7. Environment Variables & Production Configuration

Configure the following environment variables in your hosting environment (e.g., Cloudflare Pages, Netlify, Vercel, or Nitro Node server):

```ini
# Production Origin (Authoritative Canonical Domain)
SITE_URL="https://your-production-domain.example"
VITE_SITE_URL="https://your-production-domain.example"

# Supabase Project Credentials (Publishable anon key only for client)
SUPABASE_PROJECT_ID="your-project-id"
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"

VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
```

> [!CAUTION]
> Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend bundles or client environment variables.

---

## 8. Google Search Console & Production Readiness Checklist

### Step 1: Domain Verification
- Add `your-production-domain.example` as a Domain property in [Google Search Console](https://search.google.com/search-console).
- Add the Google TXT verification record to the DNS provider (Cloudflare, Namecheap, Route 53, etc.).

### Step 2: Submit Sitemap
- Once the domain is live and serving HTTPS, submit: `https://your-production-domain.example/sitemap.xml`.
- Confirm Search Console returns `Success` status.

### Step 3: URL Inspection & Live Test
- Test representative URLs:
  - Homepage: `https://your-production-domain.example/`
  - Partner directory: `https://your-production-domain.example/partners`
  - Dynamic partner: `https://your-production-domain.example/partners/abc-cafe`
- Confirm:
  - Canonical URL matches inspected URL.
  - Page is indexable.
  - Schema.org structured data (`Organization`, `BreadcrumbList`, `LocalBusiness`) is detected without errors.

### Step 4: Verify Robots.txt
- Verify via Search Console Robots Testing tool that:
  - Public marketing routes are crawlable.
  - Sensitive paths (`/admin`, `/account`, `/verification`, `/p/`, `/history`) are blocked.

---

## 9. Verification & Testing Commands

Execute the following commands to validate the entire platform:

```bash
# 1. Typecheck TypeScript sources
npm run typecheck

# 2. Run unit and integration tests (including SEO & error handling suites)
npm run test

# 3. Production build
npm run build
```
