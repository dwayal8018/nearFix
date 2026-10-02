# NearFix — Requirements

## Introduction

NearFix is a local services marketplace for India that connects customers who need
home services (plumbing, housekeeping, electrical, and more) with service providers
who offer those services. The platform's core differentiator is **trust**: an admin
verifies every registration as genuine before a provider becomes visible to customers.

In v1, NearFix is **connect-only**: the app coordinates the match (discovery, request,
in-app chat, job tracking, reviews) but does **not** process payments. Customers and
providers settle payment themselves via WhatsApp/UPI once they agree. The data model
and flows are designed so that monetization (provider lead fees / subscriptions,
featured listings) and in-app payments (Razorpay escrow) can be switched on later
without a rewrite.

### Scope (v1)
- Roles: Customer, Service Provider, Admin.
- Region: India (₹ currency, +91 / 10-digit phone numbers).
- Platform: Responsive web app (works in mobile and desktop browsers; PWA-ready).
- Payments: Out of app (WhatsApp/UPI). No money flows through NearFix in v1.
- Monetization: Designed-in but **disabled** by a feature flag for v1.

### Out of scope (v1, planned for later)
- In-app payments / escrow (Razorpay).
- Charging provider lead fees or subscriptions (structure exists, flag off).
- Native iOS/Android store apps (PWA path preserved).

### Glossary
- **Provider**: a registered service worker offering one or more services.
- **Customer**: a registered user who raises service requests.
- **Request**: a job a customer posts (service type, description, budget, location).
- **Invite**: a customer selecting a specific provider to be considered for a request.
- **Verified**: a profile an admin has reviewed and marked genuine.
- **Disintermediation guard**: contact details are hidden; coordination stays in-app.

---

## Requirements

### Requirement 1: Account registration and authentication
**User story:** As a new user, I want to register and sign in securely, so that I can
use NearFix as either a customer or a provider.

#### Acceptance criteria
1. WHEN a visitor opens the registration page THEN the system SHALL let them choose a
   role of either "Customer" or "Service Provider".
2. WHEN a user registers THEN the system SHALL require a name, a valid Indian mobile
   number (+91, 10 digits), and a password (minimum 8 characters).
3. IF the mobile number is already registered THEN the system SHALL reject the
   registration with a clear message.
4. WHEN a user submits valid credentials to sign in THEN the system SHALL authenticate
   them and start a session.
5. IF sign-in credentials are invalid THEN the system SHALL deny access without
   revealing which field was wrong.
6. WHEN a user signs out THEN the system SHALL end the session.

### Requirement 2: Provider profile and registration details
**User story:** As a service provider, I want to register my professional details, so
that customers can find me and judge my suitability.

#### Acceptance criteria
1. WHEN a provider completes registration THEN the system SHALL capture: service
   categories offered (one or more of the seeded categories: plumbing, electrical,
   housekeeping/cleaning, carpentry, painting, AC & appliance repair, pest control,
   gardening), years of experience, base location, service area/radius they
   will travel to, charge model (per task and/or per hour), charge amount in ₹, and a
   short bio.
2. WHEN a provider uploads photos THEN the system SHALL store at least a profile photo
   and allow additional work photos.
3. WHEN a provider sets a service radius THEN the system SHALL store it so provider
   discovery can filter by distance from a request's location.
4. IF required profile fields are missing THEN the system SHALL block submission and
   indicate which fields are required.
5. WHEN a provider registers THEN the system SHALL set their profile status to
   "pending verification" and SHALL NOT make it visible to customers yet.

### Requirement 3: Customer profile and raising a request
**User story:** As a customer, I want to raise a service request with my location and
budget, so that suitable providers can be matched to my job.

#### Acceptance criteria
1. WHEN a customer raises a request THEN the system SHALL capture: service category,
   a description of the work, a budget in ₹, and the service location.
2. WHEN a customer sets a location THEN the system SHALL allow using their live GPS
   location (browser geolocation) and/or entering an address.
3. WHEN a request is created THEN the system SHALL default its status to "open".
4. IF a customer is not signed in and tries to raise a request THEN the system SHALL
   prompt them to register or sign in first.
5. WHEN a customer views their requests THEN the system SHALL list all requests they
   raised with current status.

### Requirement 4: Admin verification of registrations (trust layer)
**User story:** As an admin, I want to review and verify provider (and flagged
customer) registrations, so that customers only see genuine profiles.

#### Acceptance criteria
1. WHEN a provider registers THEN the system SHALL add them to an admin verification
   queue with status "pending".
2. WHEN an admin reviews a pending profile THEN the system SHALL let the admin mark it
   "verified" or "rejected (fake)" with an optional reason.
3. WHEN a profile is marked "verified" THEN the system SHALL make it discoverable to
   customers.
4. WHEN a profile is marked "rejected" THEN the system SHALL keep it hidden from
   customers and notify the provider of the outcome.
5. WHERE a profile has not been verified THEN the system SHALL NOT include it in any
   customer-facing search or listing results.
6. WHEN an admin signs in THEN the system SHALL restrict admin screens to admin
   accounts only.

### Requirement 5: Discover and filter verified providers
**User story:** As a customer, I want to browse and filter verified providers near my
request, so that I can shortlist the right person.

#### Acceptance criteria
1. WHEN a customer browses providers THEN the system SHALL show only verified,
   non-rejected providers.
2. WHEN a customer filters providers THEN the system SHALL support filtering by service
   category, distance from the request location (within the provider's service radius),
   charge range (₹), years of experience, and average review rating.
3. WHEN providers are listed THEN the system SHALL display name, photo, categories,
   experience, charges, service area, and average rating/review count.
4. WHEN a customer sorts results THEN the system SHALL support sorting by rating,
   distance, and price.
5. WHERE no providers match THEN the system SHALL show an empty-state message.

### Requirement 6: Inviting providers without exposing contact details
**User story:** As a customer, I want to invite chosen providers to my request without
getting their phone number, so that coordination stays safe and inside the app.

#### Acceptance criteria
1. WHEN a customer selects one or more providers for an open request THEN the system
   SHALL create an "invite" linking the request and each provider.
2. WHILE a request is active THEN the system SHALL NOT reveal the provider's phone,
   WhatsApp, or other direct contact details to the customer, and vice versa.
3. WHEN a provider is invited THEN the system SHALL notify the provider and let them
   accept or decline the invite.
4. WHEN a provider accepts an invite THEN the system SHALL open an in-app chat thread
   between that customer and provider for this request.
5. IF a provider declines THEN the system SHALL update the invite status and leave the
   request open to other providers.

### Requirement 7: In-app chat for coordination
**User story:** As a customer or provider, I want to chat inside the app once an invite
is accepted, so that we can coordinate the job without sharing personal contacts.

#### Acceptance criteria
1. WHEN an invite is accepted THEN the system SHALL create a chat thread scoped to that
   request and the two parties.
2. WHEN either party sends a message THEN the system SHALL deliver and display it to the
   other party within the thread.
3. WHERE a chat thread exists THEN the system SHALL NOT display raw phone numbers or
   external contact handles entered as plain text (basic masking) in v1.
4. WHEN the job is completed THEN the system SHALL allow sharing payment details
   (e.g., a UPI/WhatsApp handoff prompt) only at/after the completion step.

### Requirement 8: Job lifecycle and status tracking
**User story:** As a customer and provider, I want to track a job's status, so that
there is a clear record of what happened for trust and dispute purposes.

#### Acceptance criteria
1. WHEN a provider accepts an invite and the customer confirms THEN the system SHALL
   move the request to "in progress" and record a timestamp.
2. WHEN either party marks the job started/completed THEN the system SHALL record the
   action, who did it, and when.
3. WHEN both parties mark the job complete (or the customer confirms completion) THEN
   the system SHALL set the request status to "completed".
4. WHERE a request is "completed" THEN the system SHALL enable the review step for the
   customer.
5. WHEN a request is cancelled THEN the system SHALL record the status, actor, and an
   optional reason.

### Requirement 9: Reviews from genuine customers only
**User story:** As a customer who completed a job, I want to leave a truthful review, so
that other customers can judge providers; and as a reader I want to trust reviews.

#### Acceptance criteria
1. WHERE a request is "completed" THEN the system SHALL allow only the customer on that
   request to post a review for the provider on that request.
2. IF a user who did not complete a job with a provider tries to review them THEN the
   system SHALL reject the review.
3. WHEN a review is posted THEN the system SHALL capture a star rating (1–5) and
   optional text, and SHALL link it to the specific completed request.
4. WHEN reviews exist for a provider THEN the system SHALL compute and display the
   average rating and review count on the provider's profile and in listings.
5. WHERE a customer already reviewed a given completed request THEN the system SHALL
   prevent duplicate reviews for that same request.

### Requirement 10: Report and ban (fraud deterrence)
**User story:** As a customer or provider, I want to report bad behavior, and as an
admin I want to act on reports, so that fraudsters are removed and trust is maintained.

#### Acceptance criteria
1. WHEN a user has an active or completed interaction THEN the system SHALL let them
   report the other party with a category and description.
2. WHEN a report is submitted THEN the system SHALL add it to an admin review queue.
3. WHEN an admin reviews a report THEN the system SHALL let the admin dismiss it, warn,
   suspend, or ban the reported account.
4. WHEN an account is suspended or banned THEN the system SHALL block its sign-in and
   remove its profile from customer-facing listings.
5. WHERE an account has reports or a ban history THEN the system SHALL make that history
   visible to admins.

### Requirement 11: Live location sharing
**User story:** As a customer and provider, I want to share live location for an active
job, so that the provider can reach the right place.

#### Acceptance criteria
1. WHEN a user shares live location THEN the system SHALL request browser geolocation
   permission and capture coordinates only with explicit consent.
2. WHERE a job is "in progress" THEN the system SHALL allow each party to view the
   other's shared location for that job on a map.
3. WHEN a job is completed or cancelled THEN the system SHALL stop sharing live location
   for that job.
4. IF geolocation permission is denied THEN the system SHALL fall back to a
   manually entered address.

### Requirement 12: Monetization hooks (designed-in, disabled in v1)
**User story:** As the platform owner, I want monetization structures in place but
switched off for v1, so that I can enable provider lead fees, subscriptions, featured
listings, and in-app payments later without re-architecting.

#### Acceptance criteria
1. WHERE a global feature flag "monetization_enabled" is false THEN the system SHALL
   provide all connection features for free and SHALL NOT charge any party.
2. WHEN the data model is created THEN the system SHALL include structures to support
   provider subscription plans, per-lead charges, and featured-listing status, even if
   unused in v1.
3. WHEN in-app payments are added later THEN the system SHALL be able to attach a
   payment/escrow record to a request without changing the request's core schema.
4. WHERE monetization is disabled THEN the system SHALL NOT display pricing or paywalls
   to users.

### Requirement 13: Deployment and data portability
**User story:** As the platform owner, I want to build locally for free and move to a
hosted database for launch, so that I avoid cost and lock-in early on.

#### Acceptance criteria
1. WHEN the app runs in development THEN the system SHALL work against a local
   PostgreSQL database with no paid services required.
2. WHEN the app is deployed THEN the system SHALL be able to connect to a hosted
   PostgreSQL/Supabase database via configuration only (no code rewrite).
3. WHERE secrets (database URL, keys) are needed THEN the system SHALL read them from
   environment variables and SHALL NOT hardcode them in source.
4. WHEN provider photos are stored THEN the system SHALL use a storage mechanism that
   can switch from local/dev storage to hosted object storage via configuration.
