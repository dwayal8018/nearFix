# NearFix — Design

## Overview

NearFix is a responsive web application (mobile + desktop browsers, PWA-ready) built as
a single Next.js project that serves both the UI and the backend API. It talks to a
PostgreSQL database through an ORM. In development it uses a local Postgres instance;
for launch it connects to a hosted Postgres (Supabase) by changing environment
variables only — no code change. The design keeps NearFix "connect-only" for v1 while
building the schema and flags needed to switch on monetization and in-app payments
later.

This design maps directly to the 13 requirements. Each major section notes the
requirements it satisfies.

## Technology stack and rationale

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js (App Router) + React + TypeScript** | One codebase for UI + API routes; works in all browsers; PWA/Capacitor path to mobile later. TypeScript catches errors early for a solo beginner. |
| Styling | **Tailwind CSS** | Fast, consistent, responsive-first UI without hand-writing CSS. |
| ORM / DB access | **Prisma** | Type-safe DB access, migrations, and a schema that is portable across local Postgres and Supabase (both Postgres). |
| Database | **PostgreSQL** (local in dev → Supabase in prod) | Same engine both places → painless migration (Req 13). Supabase free tier for launch. |
| Auth | **Auth.js (NextAuth) credentials provider** + hashed passwords (bcrypt) | Simple username/password sessions; no external dependency; can add OTP later. |
| File storage | **Storage adapter interface** — local disk in dev, Supabase Storage in prod | Switch via config (Req 13.4). |
| Maps / geo | **Leaflet + OpenStreetMap tiles** + browser Geolocation API | Free, no API key; covers live location + distance filtering (Req 5, 11). |
| Realtime chat | **v1: short-interval polling** of a messages API; **later: Supabase Realtime / websockets** | Keeps v1 simple and host-agnostic; upgrade is isolated to the chat transport. |
| Hosting | **Vercel** (app) + **Supabase** (DB/storage) | Free tiers; shareable link; minimal ops for a beginner. |

### Why one Next.js app instead of separate frontend/backend
A single project is simpler to run, deploy, and reason about for a first app. Next.js
Route Handlers (`app/api/*`) give us a real backend (validation, auth, DB) without a
second service. If the backend ever needs to scale independently, the API layer is
already cleanly separated and can be extracted.

## High-level architecture

```
Browser (mobile/desktop)
  │   React UI (Next.js App Router) + Tailwind + Leaflet map
  │   Geolocation API (live location, with consent)
  ▼
Next.js server (same deployment)
  │   Route Handlers  /api/*   → input validation (Zod)
  │   Auth.js session + role guard (customer | provider | admin)
  │   Service layer (business rules: verification, invites, reviews, reports)
  │   Storage adapter (local disk | Supabase Storage)
  ▼
Prisma ORM
  ▼
PostgreSQL  (local dev  →  Supabase prod, via DATABASE_URL)
```

### Layers
- **UI/pages**: role-specific screens (customer, provider, admin).
- **API route handlers**: thin; parse + validate input, check auth/role, call services.
- **Service layer**: all business rules live here (e.g., "only completed-request
  customer can review"), so rules are enforced server-side regardless of UI.
- **Data layer**: Prisma models + migrations.

## Access control model

Three roles with server-enforced guards (Req 1, 4, 6, 9, 10):
- **Customer**: raise requests, browse verified providers, invite, chat, mark
  completion, review, report.
- **Provider**: manage profile, accept/decline invites, chat, mark completion, report.
- **Admin**: verification queue, report queue, suspend/ban, view histories. Admin
  screens and APIs reject non-admin sessions.

Account status gates sign-in and visibility: `active`, `pending`, `suspended`,
`banned` (Req 4, 10). Suspended/banned accounts cannot sign in and never appear in
customer-facing listings.

## Data model (Prisma schema outline)

Notes:
- IDs are cuid/uuid strings. Timestamps on every table.
- Money stored as integer **paise** (₹1 = 100) to avoid float errors; displayed as ₹.
- Geo stored as `latitude`/`longitude` floats; distance computed with the Haversine
  formula in the service layer (good enough for v1; can move to PostGIS later).

### User (Req 1, 4, 10)
- `id`, `name`, `phone` (unique, +91/10-digit, validated), `passwordHash`
- `role`: enum `CUSTOMER | PROVIDER | ADMIN`
- `status`: enum `ACTIVE | PENDING | SUSPENDED | BANNED`
- relations: `providerProfile?`, `customerRequests[]`, `sentReports[]`,
  `receivedReports[]`, `reviewsWritten[]`

### ProviderProfile (Req 2, 4, 5, 12)
- `id`, `userId` (unique FK)
- `bio`, `yearsExperience` (int)
- `baseLatitude`, `baseLongitude`, `baseAddress`
- `serviceRadiusKm` (int)
- `chargeModel`: enum `PER_TASK | PER_HOUR | BOTH`
- `perTaskPaise?`, `perHourPaise?`
- `verificationStatus`: enum `PENDING | VERIFIED | REJECTED`
- `verificationReason?`, `verifiedByAdminId?`, `verifiedAt?`
- `isFeatured` (bool, default false) — monetization hook, unused in v1 (Req 12)
- `avgRating` (float, denormalized cache), `reviewCount` (int)
- relations: `categories[]` (via ProviderCategory), `photos[]`, `invites[]`

### ServiceCategory (seeded)
- `id`, `key` (e.g. `plumbing`), `label` (e.g. "Plumbing"), `active` (bool)
- Seeded: plumbing, electrical, housekeeping, carpentry, painting, appliance_repair
  (AC & appliance repair), pest_control, gardening (extensible).

### ProviderCategory (join)
- `providerProfileId`, `serviceCategoryId` (many-to-many provider ↔ category)

### ProviderPhoto (Req 2)
- `id`, `providerProfileId`, `url`, `isProfilePhoto` (bool)

### ServiceRequest (Req 3, 6, 8, 11)
- `id`, `customerId` (FK User)
- `categoryId` (FK ServiceCategory)
- `description`, `budgetPaise`
- `latitude`, `longitude`, `address`
- `status`: enum `OPEN | IN_PROGRESS | COMPLETED | CANCELLED`
- `startedAt?`, `completedAt?`, `cancelledAt?`, `cancelReason?`
- relations: `invites[]`, `chatThread?`, `review?`, `locationShares[]`,
  `paymentRecord?` (nullable, reserved for later — Req 12.3)

### Invite (Req 6)
- `id`, `requestId` (FK), `providerId` (FK User)
- `status`: enum `INVITED | ACCEPTED | DECLINED`
- `respondedAt?`
- unique on (`requestId`, `providerId`) to prevent duplicate invites
- `leadFeePaise?` (nullable) — monetization hook, unused in v1 (Req 12)

### ChatThread + ChatMessage (Req 7)
- ChatThread: `id`, `requestId` (unique FK), `customerId`, `providerId`
- ChatMessage: `id`, `threadId` (FK), `senderId`, `body` (contact-masked on write),
  `createdAt`, `readAt?`
- Thread is created only when an invite is `ACCEPTED` (Req 6.4, 7.1).

### Review (Req 9)
- `id`, `requestId` (unique FK — one review per completed request), `providerId`,
  `customerId`, `rating` (1–5), `text?`, `createdAt`
- Server rule: request must be `COMPLETED` and `customerId` must match the request's
  customer; uniqueness on `requestId` prevents duplicates (Req 9.1, 9.2, 9.5).

### Report (Req 10)
- `id`, `reporterId`, `reportedUserId`, `requestId?`, `category`, `description`
- `status`: enum `OPEN | DISMISSED | ACTIONED`
- `adminActionId?` → links to the action taken

### ModerationAction (Req 10)
- `id`, `adminId`, `targetUserId`, `action`: enum `WARN | SUSPEND | BAN | DISMISS`,
  `reason?`, `createdAt`

### LiveLocationShare (Req 11)
- `id`, `requestId` (FK), `userId`, `latitude`, `longitude`, `updatedAt`, `active`
- Only writable while request is `IN_PROGRESS`; deactivated on complete/cancel.

### AppSetting (Req 12)
- `key` (unique), `value` (json/string). Seeded with
  `monetization_enabled = "false"`. The service layer reads this flag; while false, no
  charges, pricing, or paywalls are shown or applied.

### SubscriptionPlan + ProviderSubscription (reserved — Req 12)
- Tables created for future provider plans; no UI/flow wired in v1.

## API surface (Next.js route handlers)

All endpoints validate input (Zod) and enforce auth/role in the service layer.

- **Auth**: `POST /api/auth/register`, Auth.js routes for sign-in/out/session.
- **Provider profile**: `POST/PUT /api/provider/profile`, `POST /api/provider/photos`.
- **Categories**: `GET /api/categories`.
- **Discovery**: `GET /api/providers` (filters: category, maxDistanceKm from a
  request/location, min/max charge, minExperience, minRating; sort: rating|distance|
  price). Returns **only** VERIFIED + ACTIVE providers (Req 4.5, 5.1).
- **Requests**: `POST /api/requests`, `GET /api/requests` (mine),
  `GET /api/requests/:id`, `POST /api/requests/:id/status` (start/complete/cancel).
- **Invites**: `POST /api/requests/:id/invites` (customer invites providers),
  `POST /api/invites/:id/respond` (provider accept/decline).
- **Chat**: `GET /api/threads/:id/messages`, `POST /api/threads/:id/messages`
  (polling in v1).
- **Reviews**: `POST /api/requests/:id/review`.
- **Reports**: `POST /api/reports`.
- **Admin**: `GET /api/admin/verifications`, `POST /api/admin/verifications/:id`
  (verify/reject), `GET /api/admin/reports`, `POST /api/admin/reports/:id`
  (dismiss/warn/suspend/ban). All admin routes reject non-admins (Req 4.6).

## Key flows

### Provider onboarding → verification (Req 2, 4)
1. Provider registers (role=PROVIDER) → User.status=PENDING, ProviderProfile
   .verificationStatus=PENDING.
2. Profile enters admin verification queue; invisible to customers.
3. Admin verifies → VERIFIED + User.status=ACTIVE → now discoverable.
   Or rejects → stays hidden; provider notified.

### Request → invite → chat → complete → review (Req 3, 6–9)
1. Customer raises request (OPEN) with location + budget.
2. Customer browses verified providers (filtered by distance/category/price/rating),
   invites one or more. Contact details stay hidden throughout (Req 6.2).
3. Invited provider accepts → chat thread opens; request → IN_PROGRESS on confirm.
4. Live location shareable while IN_PROGRESS (Req 11).
5. On completion both mark done → COMPLETED; payment handoff prompt (WhatsApp/UPI)
   appears only now (Req 7.4).
6. Customer leaves one review tied to that completed request (Req 9).

### Report → moderation (Req 10)
Any party reports → admin queue → admin warns/suspends/bans → suspended/banned users
lose sign-in and listing visibility.

## Distance and geo strategy
- Store lat/long on requests and provider base locations.
- Compute distance server-side with Haversine; a provider matches a request if the
  request falls within the provider's `serviceRadiusKm` (Req 5.2).
- Live location updates (Req 11) are per-request rows refreshed by the client while a
  job is IN_PROGRESS; map rendered with Leaflet.
- Rationale: Haversine avoids the complexity of PostGIS for v1; can upgrade later if
  query volume demands it.

## Monetization-ready design (Req 12)
- `AppSetting.monetization_enabled` gates everything; default `false` in v1.
- Hooks already present but inert: `Invite.leadFeePaise`, `ProviderProfile.isFeatured`,
  `SubscriptionPlan`/`ProviderSubscription` tables, and a nullable `paymentRecord` on
  `ServiceRequest` reserved for Razorpay escrow.
- Flipping monetization on later means: enabling the flag, wiring UI, and adding a
  payment provider — **no schema rewrite** of core entities (Req 12.3).

## Security and privacy
- Passwords hashed with bcrypt; never stored or logged in plaintext.
- All secrets (`DATABASE_URL`, auth secret, storage keys) come from environment
  variables; nothing hardcoded (Req 13.3).
- Server-side authorization on every mutating endpoint (never trust the client).
- Contact-detail masking in chat message bodies (basic regex for phone/UPI patterns)
  to support the no-direct-contact rule (Req 6.2, 7.3). Noted limitation: masking is a
  deterrent, not foolproof; combined with report/ban it discourages circumvention.
- Geolocation captured only with explicit browser consent; live sharing stops on
  job end (Req 11.1, 11.3).

## Environments and configuration (Req 13)
- `.env` (dev): local `DATABASE_URL`, local file storage path, auth secret.
- `.env` (prod): Supabase `DATABASE_URL`, Supabase Storage keys, auth secret — set in
  Vercel. Switching environments is configuration only.
- Prisma migrations are the single source of truth for schema in both environments.
- Seed script creates service categories, the `monetization_enabled=false` setting, and
  a first admin account.

## Testing strategy
- **Unit tests** for service-layer rules that carry the most risk:
  verification visibility, "only completed-request customer can review", duplicate-
  review prevention, invite uniqueness, suspended/banned sign-in block, and distance
  matching.
- **Integration tests** for key API routes (register, create request, invite/accept,
  review, admin verify/reject) against a test database.
- Test runner: Vitest. (Tests are written per the tasks plan, not ad hoc.)

## Known limitations / future work
- Chat is polling-based in v1 (simple, slightly delayed) → upgrade to realtime later.
- Contact masking is best-effort, not guaranteed.
- Haversine distance (no PostGIS) is fine at small scale.
- No in-app payments in v1 by design; Razorpay escrow is the planned v2 upgrade.
- Phone-number OTP verification could strengthen genuineness checks later.
