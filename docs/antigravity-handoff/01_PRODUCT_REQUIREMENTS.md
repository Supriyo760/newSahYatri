# 01. Product Requirements

## 1. Product Goal

Build a trustworthy, mobile-first travel companion and collaborative trip platform. The core journey is:

`register -> complete profile -> discover compatible adults -> chat safely -> form/join group -> plan trip -> execute trip -> handle expenses and safety -> close and review`

SahYatri is not a booking agency, medical device, emergency-response provider, or guarantee of companion safety. It provides planning, communication, decision support, and links to third-party services.

## 2. Target Users

### P1 Solo Explorer

An adult who wants companions with similar budget, pace, travel style, food preferences, and risk tolerance.

### P2 Group Organizer

Creates a private or match-based group, manages membership, starts a trip, confirms itinerary changes, and closes the trip.

### P3 Traveler With Accessibility Or Health Needs

Wants control over what emergency information is shared, reliable reminders, accessible planning, and nearby facility discovery.

### P4 Food And Culture Traveler

Prioritizes regional dishes, dietary compatibility, local eateries, verified hygiene information, and hidden cultural experiences.

### P5 Platform Operator

Handles moderation, abuse reports, content quality, integration health, model evaluation, and incident response. Admin UI is post-MVP, but operational controls and audit data are required.

## 3. Scope

### MVP, Required

- Credentials authentication and optional Google OAuth.
- Adult-only registration, email normalization, secure password hashing, session handling, sign-out.
- Guided travel profile and optional medical profile.
- Compatibility discovery with explainable sub-scores.
- Anonymous pre-match chat with blocking/reporting controls.
- Private travel groups of 3-5 members and invite-code join.
- Group details, consent controls, and group chat.
- Trip creation and day-by-day itinerary generation.
- Hidden-gem mode for trips of at least 5 calendar days.
- Collaborative itinerary editing with persistence and conflict handling.
- Map, place detail, directions link, public-transport option, and checklist navigation.
- Culinary discovery filtered by budget, dietary restrictions, and evidence-backed hygiene data.
- Expense recording, equal/custom splitting, balances, and settlement suggestions.
- Live location sharing that is opt-in, time-bounded, visible, and revocable.
- Hold-to-activate SOS, emergency contacts, facility lookup, and reviewed first-aid cards.
- Medication schedules and browser push reminders.
- English and Hindi UI architecture; all copy externalized for future languages.
- Free/premium entitlement enforcement through verified payment webhooks.
- Offline shell and read-only access to the active trip's last synchronized itinerary.

### MVP+, Planned After Core Acceptance

- Ratings and post-trip reviews.
- Identity verification provider.
- Admin moderation interface.
- Local guide and tourism-board content portal.
- Restaurant reservation and activity-booking commissions.
- Additional languages.
- Redis-based distributed caching and Socket.IO adapter.
- Dedicated worker queue and horizontally scaled realtime nodes.
- Native mobile applications.

### Out Of Scope For MVP

- Automatic calls to emergency services.
- Clinical diagnosis, dosage calculation, treatment recommendations, or medical-device claims.
- Background location tracking without an active, explicit sharing session.
- Scraping sources that prohibit scraping.
- Claims of 85% model accuracy, HIPAA compliance, 99.9% SLA, or 10,000 concurrent users without measured evidence.
- MongoDB, RabbitMQ, Kubernetes, or 25 integrations merely because the proposal mentions them.

## 4. Roles And Permissions

| Role | Capabilities |
|---|---|
| Visitor | View marketing page, register, sign in, read public policies |
| Free user | Complete profile, discover limited matches, one active group, 3-day trip generation, basic chat and safety |
| Premium user | More active groups, longer trips, advanced hidden-gem and AI features, richer culinary results |
| Group creator | Edit group metadata, invite members, initiate trip generation, dissolve group before active trip |
| Group member | Read group, chat, consent to medical overview, edit collaborative plan according to group policy |
| Operator | Investigate reports, suspend accounts, review audit events; no routine access to decrypted medical content |

Every server action, route handler, and socket event must independently enforce the role and resource membership.

## 5. Functional Requirements

### FR-AUTH: Identity And Account

- `FR-AUTH-01`: Registration requires name, valid normalized email, password of at least 8 characters, age confirmation of 18+, privacy acceptance, and terms acceptance.
- `FR-AUTH-02`: Duplicate email returns a generic conflict response without exposing account details.
- `FR-AUTH-03`: Passwords use an adaptive password hash. Passwords and OAuth tokens never enter logs.
- `FR-AUTH-04`: Login, logout, expired session, and unauthorized access have explicit UI states.
- `FR-AUTH-05`: Account settings support export request, consent history, and deletion request. Full self-service completion can be MVP+ but the data model and service boundary are required now.

### FR-ONB: Onboarding

- `FR-ONB-01`: Profile completion is a resumable wizard, not one oversized form.
- `FR-ONB-02`: Steps are identity, travel preferences, Big Five assessment, food and dietary preferences, interests/languages, safety profile, consent review.
- `FR-ONB-03`: Medical details are optional. The user may complete onboarding with "No medical information to add."
- `FR-ONB-04`: Each medical category has a separate consent explanation and can be edited or removed later.
- `FR-ONB-05`: Profile completion updates the authenticated session and redirects to the dashboard.

### FR-MATCH: Discovery And Matching

- `FR-MATCH-01`: Show only onboarded, active, adult users excluding self, blocked users, and users outside visibility settings.
- `FR-MATCH-02`: Each card shows name, age, avatar, nationality, travel style, common interests, overall compatibility, and a plain-language explanation.
- `FR-MATCH-03`: Expose personality, budget, travel style, food, and risk-tolerance sub-scores. Do not expose raw medical conditions.
- `FR-MATCH-04`: Medical information must not be used to discriminate or hide a user. Show only a consent-based "emergency-sharing ready" indicator.
- `FR-MATCH-05`: A user can view profile, start pre-match chat, dismiss, block, or report.
- `FR-MATCH-06`: Results are paginated and deterministically sorted by score, then trust signals, then stable user ID.

### FR-CHAT: Pre-Match And Group Chat

- `FR-CHAT-01`: Pre-match chat hides contact information and exact location by default.
- `FR-CHAT-02`: Only the two participants can join, fetch, and send to a pre-match chat.
- `FR-CHAT-03`: Group chat is available only to current group members.
- `FR-CHAT-04`: Message length, rate, attachment type, and attachment size are limited.
- `FR-CHAT-05`: Users can block/report from chat. Report preserves required evidence under restricted access.
- `FR-CHAT-06`: Sentiment/toxicity indicators are advisory moderation signals and are never shown as a definitive judgment of a person.

### FR-GRP: Groups

- `FR-GRP-01`: Groups contain 3-5 members for match-made travel; private groups may begin with one creator while forming.
- `FR-GRP-02`: Group states are `forming`, `planning`, `active`, `completed`, `dissolved`.
- `FR-GRP-03`: Invite codes are random, unique, revocable, and rate-limited.
- `FR-GRP-04`: Joining is atomic and cannot exceed maximum size.
- `FR-GRP-05`: Group details include members, roles, trip summary, compatibility summary, consent readiness, chat, and actions.
- `FR-GRP-06`: Leaving, removal, and dissolution rules must protect active trip history and financial records.

### FR-TRIP: Planning

- `FR-TRIP-01`: A group member can create a trip with destination, start/end dates, currency, total budget, pace, mobility needs, and priorities.
- `FR-TRIP-02`: End date must not precede start date. Duration is inclusive calendar days and uses the destination timezone.
- `FR-TRIP-03`: Generation produces 2-5 realistic items per day, travel/rest buffers, meal windows, costs, durations, place evidence, and alternatives.
- `FR-TRIP-04`: Trips under 5 days prioritize essential attractions and feasible routing.
- `FR-TRIP-05`: Trips of at least 5 days activate hidden-gem mode and target 30-40% verified lesser-known experiences. This is a target, not a reason to insert fabricated places.
- `FR-TRIP-06`: Regeneration creates a version. It never silently deletes the prior itinerary.
- `FR-TRIP-07`: External place lookup failure retains a draft item labeled unverified and requests user confirmation.
- `FR-TRIP-08`: Dates, costs, opening hours, and route times show source and freshness.

### FR-COLLAB: Collaborative Planning

- `FR-COLLAB-01`: Members can add, edit, reorder, vote, and remove itinerary items.
- `FR-COLLAB-02`: Updates are persisted before success is broadcast.
- `FR-COLLAB-03`: Every write carries an itinerary version. Stale writes receive a conflict response and current version.
- `FR-COLLAB-04`: Activity history records actor, action, item, timestamp, and version without storing sensitive medical text.

### FR-DISC: Places, Food, And Navigation

- `FR-DISC-01`: Food results show regional specialty, venue, estimated price, dietary compatibility, distance, opening state, rating source, hygiene source, and verification status.
- `FR-DISC-02`: Unknown hygiene data is displayed as unknown, never invented.
- `FR-DISC-03`: Hidden-gem cards show why the place qualifies, source evidence, accessibility notes, best visit time, and confidence.
- `FR-DISC-04`: Navigation offers walking, driving, and transit when available, plus a deep link to the mapping provider.
- `FR-DISC-05`: Public toilets, pharmacies, clinics, and hospitals are distinct facility filters.
- `FR-DISC-06`: Checklist navigation supports complete/uncomplete, next stop, skip, and offline read-only state.

### FR-BUD: Expenses

- `FR-BUD-01`: Record payer, amount in minor currency units, currency, category, description, date, optional receipt, and split.
- `FR-BUD-02`: Equal split includes a deterministic remainder rule. Custom splits must sum exactly to total.
- `FR-BUD-03`: Only current trip members can be included.
- `FR-BUD-04`: Balances and settlement suggestions are derived, reproducible, and never use floating-point money math.
- `FR-BUD-05`: Expense edits and deletion are auditable.

### FR-SAFE: Safety And Medical

- `FR-SAFE-01`: Medical data is encrypted with authenticated encryption and decrypted only server-side for an authorized purpose.
- `FR-SAFE-02`: Group sharing requires both profile-level sharing and group-specific consent.
- `FR-SAFE-03`: Group members see only consented emergency categories and instructions, not full history or unrelated notes.
- `FR-SAFE-04`: SOS uses a three-second hold, visible cancellation, current location confirmation, and fallback when location is denied.
- `FR-SAFE-05`: SOS creates an incident, broadcasts to the group, looks up nearby facilities, and attempts contact notifications with per-contact status.
- `FR-SAFE-06`: The UI always tells users to call the local emergency number when urgent.
- `FR-SAFE-07`: First-aid content is versioned, source-attributed, reviewed, and non-generative.
- `FR-SAFE-08`: Medication reminders include timezone, recurrence, snooze, taken/skipped status, and permission handling.
- `FR-SAFE-09`: Live location sharing defaults off, expires automatically, and shows a persistent indicator while active.

### FR-PAY: Premium

- `FR-PAY-01`: Client calls cannot directly grant premium.
- `FR-PAY-02`: Entitlements change only after verified Stripe/Razorpay events or an operator action.
- `FR-PAY-03`: Webhooks are idempotent and store provider event IDs.
- `FR-PAY-04`: Cancellation, failed renewal, grace period, and downgrade behavior are explicit.

### FR-I18N: Language And Accessibility

- `FR-I18N-01`: User-facing strings are externalized; English is complete and Hindi is the first translated locale.
- `FR-I18N-02`: Dates, currency, numbers, and units use locale-aware formatting.
- `FR-I18N-03`: User-generated content translation is opt-in and labeled as machine translated.
- `FR-I18N-04`: The application meets WCAG 2.2 AA for core flows.

## 6. Non-Functional Requirements

- `NFR-01 Performance`: p75 LCP under 2.5 seconds on a mid-tier mobile device and 4G for core pages.
- `NFR-02 API`: p95 internal API latency under 500 ms excluding external AI/map calls; show progress for longer operations.
- `NFR-03 Reliability`: retries use bounded exponential backoff and idempotency where writes can repeat.
- `NFR-04 Security`: OWASP ASVS-inspired controls, secure headers, input validation, resource authorization, rate limiting, secret rotation, and audit events.
- `NFR-05 Privacy`: data minimization, purpose limitation, retention schedule, export/deletion process, and explicit consent history.
- `NFR-06 Observability`: structured logs, request correlation IDs, health checks, metrics, and external integration status without sensitive payloads.
- `NFR-07 Compatibility`: latest two versions of Chrome, Edge, Firefox, and Safari; responsive from 320 px upward.
- `NFR-08 Maintainability`: TypeScript strict mode, documented service boundaries, no duplicated business rules across UI and routes.
- `NFR-09 Testing`: at least 80% coverage on critical domain modules; coverage percentage is secondary to required scenario tests.
- `NFR-10 Data integrity`: database constraints and transactions enforce membership, group capacity, itinerary versions, and financial totals.

## 7. Success Metrics

Metrics are targets to measure, not claims:

- Profile completion rate.
- Match card to conversation conversion.
- Conversation to group conversion.
- Trip generation completion and edit rate.
- Percentage of generated places verified by a provider.
- Hidden-gem save and visit-confirmation rate.
- Expense settlement completion.
- SOS drill completion time and notification success.
- Safety report rate, block rate, and moderation response time.
- SUS score and task completion for core flows.

