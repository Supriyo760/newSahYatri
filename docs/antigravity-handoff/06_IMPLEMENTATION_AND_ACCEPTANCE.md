# 06. Implementation Plan And Acceptance

## 1. Execution Principle

Work in vertical slices. A slice is complete only when UI, server validation, authorization, persistence, loading/error/empty states, tests, and documentation all pass.

## 2. Phase Plan

### Phase 0: Baseline And Safety

- Preserve current user modifications.
- Add `.env.example`.
- Add health endpoints, standard error envelope, request IDs, and log redaction.
- Remove production client-side premium grant.
- Fix medical encryption claim and design migration.
- Add database constraints and migrations.
- Add demo seed and test accounts.

Exit: build/lint/tests pass; no known unauthenticated sensitive endpoint; no production privilege-escalation endpoint.

### Phase 1: Account, Onboarding, And Shell

- App route group, loading/error states, settings placeholders.
- Resumable wizard and optional medical step.
- Object-storage avatar upload.
- Privacy/terms/safety pages.
- English message catalog and Hindi architecture.

Exit: new user can register through dashboard on mobile and desktop without medical disclosure.

### Phase 2: Matching, Chat, And Groups

- Canonical compatibility formula and explanations.
- Pagination, filters, blocks/reports.
- Authenticated Socket.IO handshake.
- Pre-match chat and group chat hardening.
- Atomic group capacity/invites and group detail route.

Exit: two users can discover, chat, form/join a group, and cannot access another group's resources.

### Phase 3: Trips And Discovery

- Versioned generation jobs and progress.
- Place verification/source status.
- Detail route, day timeline, map/list, votes and collaboration.
- Hidden-gem evidence and culinary filters.
- Dynamic replanning proposals.

Exit: group generates and collaboratively edits a feasible trip; prior versions remain recoverable.

### Phase 4: Expenses, Safety, And Offline

- Integer-money expense model and settlements.
- Location-sharing sessions.
- Incident-based SOS and notification statuses.
- Reviewed first-aid content registry.
- Medication schedules and push notifications.
- Offline active-trip read cache.

Exit: expense and SOS drill tests pass; no unconsented medical or location access.

### Phase 5: Billing, Operations, And Release

- Verified checkout and webhook entitlement lifecycle.
- Observability, retention jobs, export/deletion.
- E2E suite, load smoke tests, accessibility audit, incident runbook.
- Production deployment and rollback verification.

## 3. Definition Of Done

For every requirement:

- Code follows existing patterns and local Next.js 16 docs.
- Request and response are validated and typed.
- Authentication and resource authorization are tested.
- Database migration is reversible or has documented recovery.
- Loading, empty, error, offline, and success states exist.
- Keyboard and screen-reader behavior is checked.
- Analytics/logging excludes sensitive content.
- Unit and integration tests cover normal and failure behavior.
- User-visible data indicates live/cached/demo/unverified source.
- Documentation and API contract are updated.

## 4. Critical Acceptance Scenarios

### AC-01 Registration And Optional Medical Data

Given a new adult user, when they register and complete required travel steps while skipping medical details, then they become onboarded and reach the dashboard. A minor or invalid input is rejected. No medical record is required.

### AC-02 Resource Authorization

Given users A and B in different groups, when A requests B's group, messages, trip, expenses, medical overview, or socket room, then the server returns 403/neutral error and no resource data.

### AC-03 Matching Explainability

Given two completed profiles, then the match response contains algorithm version, overall estimate, component scores, and plain-language reasons. Medical condition data does not affect ranking or appear in output.

### AC-04 Atomic Group Join

Given a group with one remaining seat and two simultaneous valid join requests, then exactly one succeeds and member count never exceeds maximum.

### AC-05 Chat Identity

Given a connected socket, sending a different client `userId` cannot impersonate that user. The server identity comes from the authenticated socket.

### AC-06 Itinerary Verification

Given a generated itinerary with a place the provider cannot verify, then the item is saved/displayed as unverified and is never represented as a live confirmed place.

### AC-07 Version Conflict

Given two members editing version 4, after one creates version 5, the other's stale update receives 409/conflict with current version and does not overwrite version 5.

### AC-08 Regeneration Preservation

Regenerating a day or trip creates a new version. The previous version remains viewable and restorable.

### AC-09 Hidden Gem Rule

A 3-day trip does not force hidden gems. A 5-day trip targets 30-40% verified gems but may return fewer with a visible explanation when evidence is insufficient.

### AC-10 Money Integrity

For any accepted expense, split minor-unit amounts equal the total exactly. Non-members are rejected. Recalculated balances sum to zero.

### AC-11 Medical Consent

Group member B cannot see A's emergency categories unless A's profile sharing and group-specific consent are both active. Revocation takes effect immediately and creates a consent event.

### AC-12 Location Expiry

An expired/revoked location session rejects updates and stops broadcasts. The UI removes the sharing indicator only after server acknowledgment.

### AC-13 SOS

Holding for less than three seconds does nothing. A completed hold creates one idempotent incident, immediately shows the emergency number, broadcasts to authorized members, and displays each notification attempt as sent, queued, or failed.

### AC-14 Payment Entitlement

Calling an ordinary authenticated API cannot upgrade a user. A valid unique webhook updates entitlement once; replay does not duplicate state.

### AC-15 Provider Failure

When maps, weather, OpenAI, or ML is unavailable, the page remains usable and clearly labels fallback/stale/unavailable data. It does not invent live information.

### AC-16 Accessibility

All core journeys complete using keyboard only at 320 px and desktop widths. Focus is visible, dialogs trap/restore focus, map results have list equivalents, and reduced motion removes parallax.

## 5. Test Matrix

### Unit

- Compatibility components and invariants.
- Embedding dimensions and value ranges.
- Group capacity and state transitions.
- Inclusive trip duration and timezone.
- Hidden-gem allocation.
- Money splits, remainders, balances, settlements.
- Consent predicate.
- Encryption round trip, tamper failure, and key version.
- First-aid content lookup.

### Integration

- Registration/profile/medical routes.
- Every resource authorization boundary.
- Simultaneous group joins.
- Trip generation transaction and failure rollback.
- Itinerary optimistic concurrency.
- Expense transaction.
- Webhook verification/idempotency.
- Emergency incident and notification attempts.

### Realtime

- Authenticated handshake.
- Unauthorized room join.
- Persist-before-broadcast.
- Duplicate client message ID.
- Stale itinerary update.
- Expired location session.

### E2E

- Register -> onboard -> discover -> chat -> group -> trip.
- Existing group -> itinerary -> expense.
- Consent -> group overview -> revoke.
- SOS drill with denied and permitted location.
- Premium checkout in provider test mode.
- Offline active trip.

### Non-Functional

- Axe or equivalent accessibility checks plus manual keyboard review.
- Lighthouse/core-web-vitals baseline.
- Dependency and secret scan.
- Authorization fuzz tests.
- Load smoke test for API and sockets; report measured hardware and configuration.
- Backup restore and migration rehearsal.

## 6. Current Baseline Verification

As of 2026-06-09:

- `npm run build`: passes on Next.js 16.2.6.
- `npm run lint`: passes.
- Jest: 1 suite, 2 tests pass.
- Python tests: not executed in the bundled runtime because `pytest` is not installed there. CI installs it separately; the implementation agent must run the service tests in a configured environment.

This is a weak coverage baseline, not release readiness.

## 7. Final Handoff Checklist

- No unresolved P0/P1 gap.
- All migrations applied to a clean database and an upgrade copy.
- Build, lint, unit, integration, E2E, Python, and accessibility checks pass.
- Demo mode is visibly labeled.
- Production secrets and provider restrictions reviewed.
- Medical content has documented professional review or is disabled.
- Backup restore and rollback tested.
- Final report includes metrics and known limitations without unsupported claims.

