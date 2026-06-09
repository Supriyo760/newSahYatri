# 07. Current-State Gap Analysis

Snapshot: 2026-06-09

## 1. Executive Assessment

The repository is a working, buildable prototype with broad feature coverage. It is not yet the production-ready system described by the proposal. Many integrations and "models" are simulations or heuristics, important screens are compressed into a few large client pages, security controls need hardening, and automated coverage is very small.

Antigravity should evolve this codebase. A rewrite would discard useful domain logic, migrations, routes, UI identity, and working fallbacks.

## 2. Implemented And Usable

- Next.js 16.2.6 App Router application with React 19 and Tailwind CSS 4.
- Warm editorial travel-journal design using EB Garamond, Manrope, rust/gold/cream palette.
- Credentials login, registration, optional Google provider configuration, session gating, and onboarding redirect.
- Travel/personality profile persistence and 18-dimensional embedding.
- Encrypted medical profile persistence and consent fields.
- Match discovery with component scores and conflict-risk call.
- Pre-match chat persistence and Socket.IO events.
- Travel groups, invite join, membership authorization helper, group details and messages.
- Trip generation, day/item persistence, Google Places or OSM enrichment, and deterministic fallback itineraries.
- Itinerary UI, hidden-gem presentation, map components, checklist, collaborative editor, and expense component.
- Safety dashboard, hold interaction, facility lookup, medical cards, first-aid protocols, medication checklist, and safety chat.
- PostgreSQL/Drizzle schema and migrations.
- FastAPI service with clustering, conflict, medical risk, gem, sentiment, and culinary endpoints.
- Dockerfiles, Docker Compose, GitHub Actions, Jest, Pytest test folder, Playwright configuration, and JMeter plan.
- Stripe/Razorpay webhook signature verification paths.
- Production build and lint pass.

## 3. Partial, Simulated, Or Misnamed

| Area | Current behavior | Required correction |
|---|---|---|
| Conflict prediction | Mean feature difference | Label heuristic or implement evaluated Random Forest |
| Medical risk | Static rules | Label heuristic; clinical review; no ranking discrimination |
| Hidden gem | Weighted formula | Label heuristic or implement evaluated model and evidence |
| Sentiment | Keyword list | Moderation signal only; multilingual model only after evaluation |
| Weather | Simulated 24-hour pattern | Real provider/cache or unavailable label |
| Traffic | Coordinate-derived simulation | Real provider/cache or demo label |
| Events | Static festival/roadwork | Real source/cache or unavailable |
| Public transport | Static two-option response | Real directions provider or unavailable |
| Push reminders | Console logging | Persisted schedule, push subscription, worker, delivery status |
| Commission | Console logging | Modeled ledger only when booking integration exists |
| Location | Socket broadcast | Authenticated/time-limited sessions and expiry |
| Collaborative edit | Replaces first day's items | Versioned item-level operations across all days |
| Itinerary regeneration | Deletes existing group trips | Preserve versions and history |
| Expense math | Floating `real`; custom splits only persisted when supplied | Minor units, equal split generation, exact totals, audit |
| Avatar | Base64 stored in user field | Object storage, MIME/size validation, image processing |
| Offline | Service worker shell | Active-trip cache, stale indication, update strategy |
| Multilingual | Translation helper only | Message catalogs, locale routing, formatting |
| Premium | Direct `/users/upgrade` grant | Remove production path; webhook-derived entitlements |

## 4. Critical Security And Safety Gaps

### P0 Before Production

- Socket.IO trusts client-supplied user identity during room join before deriving a secure socket identity.
- `/api/users/upgrade` directly grants premium to any authenticated user.
- Current medical encryption uses CryptoJS passphrase AES and does not implement the claimed AES-256-GCM authenticated scheme.
- Group `update_location` and `emergency_sos` checks depend on prior socket state but require stronger group/session authorization.
- SOS facility lookup can run before confirming supplied `groupId` membership.
- Medical/safety chat can create liability if presented as expert medical advice.
- Simulated weather/traffic/facility information can be mistaken for live data.
- Exact authorization and rate-limit tests are missing across most endpoints.

### P1

- Base64 avatar storage creates database and abuse risk.
- No block/report data model or moderation workflow.
- No consent audit trail, data export, deletion workflow, or retention jobs.
- Payment cancellation/downgrade and webhook idempotency are incomplete.
- No location sharing expiry/revoke model.
- No itinerary concurrency/versioning.
- Medical claims in README/architecture do not match implementation.
- External API timeouts, retries, circuit behavior, and source freshness are inconsistent.

## 5. Product And UX Gaps

- Onboarding is one large two-tab page rather than a resumable wizard.
- No dedicated group detail/chat routes in the page structure.
- Dashboard is a summary but lacks active-trip next-action and readiness depth.
- Discover lacks robust pagination/filtering, block/report, and careful score language.
- Some UI components use a generic gray/slate visual style instead of the journal design tokens.
- Marketing page uses several remote images and effects without a complete reduced-motion and resilient image strategy.
- Error/loading/empty/offline states are inconsistent.
- Accessibility has not been systematically verified.
- No privacy, terms, safety disclaimer, account settings, blocked users, export, or deletion screens.
- No evidence/source freshness pattern shared across itinerary, food, maps, weather, and facilities.

## 6. Data Gaps

- Monetary values use floating point.
- Trips have no itinerary versions.
- No audit events, consent events, reports, blocks, subscriptions, webhook events, location sessions, incidents, medication schedules/events, provider cache, or attachments.
- Medical encryption metadata/key version is absent.
- Invite expiry/rotation is absent.
- Compatibility cache does not include profile/algorithm version invalidation.
- Chat lacks client idempotency IDs and moderation state.
- Exact location retention is not modeled.

## 7. Architecture And Operations Gaps

- README says Next.js 15 while package is Next.js 16.2.6.
- Proposal describes Express API gateway, MongoDB, Redis, RabbitMQ, Kubernetes, and AWS components that do not exist and are not required for MVP.
- GitHub Actions uses Node 18 while the Docker build uses Node 20; align with supported runtime.
- No production readiness/health endpoints for the web service.
- No structured observability, audit logging, provider health, or error tracking.
- Cron scripts exist but production scheduling and distributed locking are unspecified.
- Socket.IO scaling strategy is absent.
- Docker build installs with `npm install` instead of deterministic `npm ci`.
- The standalone Next output is configured but the production image copies broad source/node_modules and launches through `tsx`; simplify and verify deployment strategy.

## 8. Test Gaps

Current automated evidence:

- Jest: one `MatchCard` suite with two tests.
- Python: one clustering test module exists.
- No committed Playwright E2E test files were found.
- JMeter plan exists but no recorded baseline result.

Highest-priority tests:

1. Authorization for every group/trip/chat/medical/expense route and socket event.
2. Group capacity race.
3. Medical consent grant/revoke.
4. Encryption tamper failure and rotation.
5. Itinerary transaction/version conflicts.
6. Expense exact-sum invariants.
7. Webhook signature and replay.
8. SOS idempotency, permission denial, and notification failure.

## 9. Existing User Changes

At snapshot time the worktree already contains modifications to:

- `docker-compose.yml`
- `src/app/onboarding/page.tsx`
- `src/lib/auth.ts`

The implementation agent must inspect and preserve these changes. Do not revert them as cleanup.

## 10. Recommended First Backlog

1. Remove direct premium upgrade and add webhook event/idempotency tables.
2. Authenticate Socket.IO handshake and remove trusted payload user IDs.
3. Add standard API errors, request IDs, authorization tests, and rate limits.
4. Implement medical encryption migration and consent audit.
5. Convert onboarding to resumable steps while preserving existing form data.
6. Add group detail route and block/report foundations.
7. Add itinerary versions/jobs instead of deleting previous trips.
8. Migrate expenses to minor units.
9. Label all simulations and provider freshness.
10. Add core E2E journey and safety drill tests.

