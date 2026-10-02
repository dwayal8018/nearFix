# NearFix — Implementation Plan

Each task is incremental and builds on previous ones. Tasks are ordered so the app is
runnable and testable early, then grows feature by feature. Requirement references
(e.g. `Req 4.3`) point back to requirements.md. Only coding/config tasks are listed;
deployment to Supabase/Vercel is a final, user-involved step.

- [ ] 1. Project scaffold and tooling
  - Initialize a Next.js (App Router) + TypeScript project with Tailwind CSS.
  - Add Prisma, Zod, bcrypt, Auth.js, Vitest; configure scripts (dev, build, test).
  - Add `.env.example` with `DATABASE_URL`, `AUTH_SECRET`, storage vars; add `.gitignore`.
  - Verify the app boots with a placeholder home page.
  - _Requirements: 13.1, 13.3_

- [ ] 2. Database schema and seed
  - [ ] 2.1 Define the full Prisma schema (all models/enums from design.md).
    - User, ProviderProfile, ServiceCategory, ProviderCategory, ProviderPhoto,
      ServiceRequest, Invite, ChatThread, ChatMessage, Review, Report,
      ModerationAction, LiveLocationShare, AppSetting, SubscriptionPlan,
      ProviderSubscription. Money as integer paise; geo as lat/long floats.
    - Run the initial migration against local Postgres.
    - _Requirements: 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13.1_
  - [ ] 2.2 Seed script: service categories (plumbing, electrical, housekeeping,
    carpentry, painting, appliance_repair, pest_control, gardening),
    `AppSetting monetization_enabled=false`, and one admin account.
    - _Requirements: 4.6, 12.1, 12.4_

- [ ] 3. Auth and session foundation
  - [ ] 3.1 Registration API with role selection, Indian phone validation, password
    rules, duplicate-phone rejection, bcrypt hashing. Providers created as PENDING.
    - _Requirements: 1.1, 1.2, 1.3, 2.5_
  - [ ] 3.2 Auth.js credentials sign-in/out + session; block sign-in for
    SUSPENDED/BANNED accounts; role attached to session.
    - _Requirements: 1.4, 1.5, 1.6, 10.4_
  - [ ] 3.3 Server-side role/status guard helpers used by all protected routes.
    - _Requirements: 1.4, 4.6, 10.4_
  - [ ] 3.4 Unit tests: phone validation, duplicate rejection, suspended/banned block.
    - _Requirements: 1.2, 1.3, 10.4_

- [ ] 4. Provider profile management
  - [ ] 4.1 Create/update provider profile API (categories, experience, base location,
    service radius, charge model + amounts, bio) with required-field validation.
    - _Requirements: 2.1, 2.3, 2.4_
  - [ ] 4.2 Storage adapter interface (local disk dev / Supabase prod) + photo upload
    API (profile photo + work photos).
    - _Requirements: 2.2, 13.4_
  - [ ] 4.3 Provider UI: registration + profile edit screens with photo upload and a
    Leaflet map to set base location.
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5. Admin verification (trust layer)
  - [ ] 5.1 Admin-only verification queue API: list pending profiles; verify or reject
    with reason; verifying sets provider ACTIVE + discoverable.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_
  - [ ] 5.2 Admin UI: verification queue with approve/reject actions and reason input.
    - _Requirements: 4.2, 4.4_
  - [ ] 5.3 Unit tests: unverified/rejected providers excluded from discovery; admin
    guard rejects non-admins.
    - _Requirements: 4.5, 4.6_

- [ ] 6. Customer request creation
  - [ ] 6.1 Create-request API (category, description, budget paise, location) with
    auth guard; list "my requests" with status.
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  - [ ] 6.2 Customer UI: raise-request form with live-GPS capture (consent) or manual
    address via Leaflet; "my requests" list.
    - _Requirements: 3.1, 3.2, 3.5, 11.1_

- [ ] 7. Provider discovery and filtering
  - [ ] 7.1 Discovery API returning only VERIFIED + ACTIVE providers; filters by
    category, distance (Haversine within service radius), charge range, experience,
    min rating; sort by rating/distance/price.
    - _Requirements: 5.1, 5.2, 5.4, 4.5_
  - [ ] 7.2 Customer UI: provider list/cards (name, photo, categories, experience,
    charges, area, rating + count), filter controls, empty state.
    - _Requirements: 5.3, 5.5_
  - [ ] 7.3 Unit tests: distance matching and filter correctness.
    - _Requirements: 5.2_

- [ ] 8. Invites without direct contact
  - [ ] 8.1 Invite API: customer invites one or more providers to an open request
    (unique per request+provider); provider accept/decline; no contact details ever
    returned in payloads.
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  - [ ] 8.2 On accept, create the chat thread and move request toward IN_PROGRESS on
    customer confirm.
    - _Requirements: 6.4, 8.1_
  - [ ] 8.3 UI: customer invite action from provider cards; provider inbox to
    accept/decline.
    - _Requirements: 6.1, 6.3_
  - [ ] 8.4 Unit tests: invite uniqueness; no contact fields leak in responses.
    - _Requirements: 6.1, 6.2_

- [ ] 9. In-app chat
  - [ ] 9.1 Messages API (list + send) scoped to a thread's two parties; basic
    phone/UPI masking on message bodies; polling-based delivery.
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ] 9.2 Chat UI per request thread; payment-handoff (WhatsApp/UPI) prompt shown
    only at/after completion.
    - _Requirements: 7.2, 7.4_

- [ ] 10. Job lifecycle and status
  - [ ] 10.1 Status API: start, complete (both parties / customer confirm), cancel with
    actor + reason + timestamps; completion enables review.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ] 10.2 UI controls for start/complete/cancel on the request detail screen.
    - _Requirements: 8.2, 8.3, 8.5_

- [ ] 11. Reviews (genuine customers only)
  - [ ] 11.1 Review API: only the request's customer, only when COMPLETED, one review
    per request; update provider avgRating + reviewCount.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [ ] 11.2 UI: leave-review form after completion; show rating + reviews on provider
    profile and listings.
    - _Requirements: 9.3, 9.4_
  - [ ] 11.3 Unit tests: non-customer/non-completed review rejected; duplicate blocked.
    - _Requirements: 9.1, 9.2, 9.5_

- [ ] 12. Report and ban (fraud deterrence)
  - [ ] 12.1 Report API (reporter, reported, optional request, category, description)
    into an admin queue.
    - _Requirements: 10.1, 10.2_
  - [ ] 12.2 Admin moderation API: dismiss/warn/suspend/ban; suspend/ban blocks sign-in
    and removes profile from listings; record ModerationAction.
    - _Requirements: 10.3, 10.4, 10.5_
  - [ ] 12.3 UI: report button on interactions; admin report queue with actions and
    account history.
    - _Requirements: 10.1, 10.3, 10.5_

- [ ] 13. Live location sharing
  - [ ] 13.1 Live-location API: write/update per-request shares only while IN_PROGRESS,
    with consent; deactivate on complete/cancel.
    - _Requirements: 11.1, 11.2, 11.3_
  - [ ] 13.2 UI: Leaflet map showing the other party's shared location during an active
    job; manual-address fallback when permission denied.
    - _Requirements: 11.2, 11.4_

- [ ] 14. Monetization flag enforcement (kept off)
  - [ ] 14.1 Service-layer reads `monetization_enabled`; while false, no charges, no
    pricing/paywalls shown; hooks (leadFee, isFeatured, subscription tables, payment
    record) remain inert.
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 15. End-to-end wiring and verification
  - [ ] 15.1 Role-based navigation/home for customer, provider, admin; polish empty and
    error states.
    - _Requirements: 1, 4, 5, 8_
  - [ ] 15.2 Run full build + unit/integration test suite; fix failures; confirm the
    core loop (register → verify → browse → request → invite → chat → complete →
    review → report) works locally against local Postgres.
    - _Requirements: all_

- [ ] 16. Launch prep (user-involved, documented)
  - [ ] 16.1 Document the switch to Supabase: set prod `DATABASE_URL`, run migrations,
    switch storage adapter to Supabase Storage, deploy to Vercel. Config-only, no code
    rewrite.
    - _Requirements: 13.2, 13.3, 13.4_
