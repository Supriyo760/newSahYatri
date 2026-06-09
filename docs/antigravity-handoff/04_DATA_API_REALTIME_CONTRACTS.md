# 04. Data, API, And Realtime Contracts

## 1. Data Conventions

- IDs: UUID.
- Timestamps: timezone-aware UTC in storage; locale/destination timezone in UI.
- Money: integer minor units plus ISO 4217 currency. Migrate existing `real` monetary columns.
- Coordinates: validated latitude/longitude; exact coordinates are sensitive.
- Soft deletion: accounts, groups with history, and moderated content use status/deleted timestamp.
- All mutable records have `created_at`, `updated_at`; concurrent resources also have integer `version`.
- Sensitive reads and writes create audit events.
- JSON is used only for genuinely variable provider metadata, not as a substitute for modeled relationships.

## 2. Existing Core Tables

The following tables exist and remain part of the target model.

### `users`

`id`, unique normalized `email`, nullable `password_hash`, `name`, `avatar_url`, `age`, `gender`, `nationality`, `auth_provider`, `is_verified`, `is_onboarded`, `role`, `created_at`, `updated_at`.

Target additions: `status`, `locale`, `timezone`, `date_of_birth` or auditable adult confirmation, `terms_accepted_at`, `privacy_accepted_at`, `deleted_at`. Avatar becomes an object-storage URL, not a data URL.

### `personality_profiles`

`id`, unique `user_id`, Big Five values `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism`, `travel_style`, `risk_tolerance`, `budget_level`, `preferred_group_size`, `languages_spoken`, `food_preferences`, `interests`, `embedding_vector`, `completed_at`, `updated_at`.

Values are validated: traits 0-1, risk 1-5, group size 3-5.

### `medical_profiles`

`id`, unique `user_id`, `blood_type`, encrypted conditions, medications, allergies, emergency contacts, first-aid notes, non-sensitive `condition_categories`, `share_with_group`, timestamps.

Target additions: `encryption_key_version`, per-field nonce/tag or encrypted envelope, `profile_version`, `reviewed_at`. `share_with_group` is a profile-level master switch; group consent remains separate.

### `travel_groups`

`id`, `name`, `status`, `max_members`, destination/date hints, `created_by`, `compatibility_score`, unique `invite_code`, timestamps.

Target additions: `visibility`, `invite_code_expires_at`, `invite_code_version`, `version`, `dissolved_at`.

### `group_members`

`id`, `group_id`, `user_id`, `role`, `medical_sharing_consent`, `joined_at`; unique group/user pair.

Target additions: `status`, `left_at`, `consent_updated_at`. Capacity is enforced transactionally.

### `compatibility_scores`

`id`, canonical ordered user pair, overall and component scores, `computed_at`.

Target additions: `risk_tolerance_score`, `algorithm_version`, `explanation`, `input_profile_versions`, `expires_at`. Scores are invalidated when either profile changes.

### `trips`

`id`, `group_id`, destination and coordinates, dates, duration, status, budget fields, currency, hidden-gem mode, generation prompt/debug reference, timestamps.

Target additions: destination timezone, pace, mobility needs, priorities, current itinerary version, source mode, generation status. Prompt text must not contain medical data.

### `itinerary_days`

`id`, `trip_id`, `day_number`, date, theme, weather forecast, notes.

Target additions: `version_id`; unique version/day pair.

### `itinerary_items`

`id`, `day_id`, order, type, name, description, location, coordinates, provider place ID, duration, cost, hidden-gem metadata, opening hours, photo, tips, completion state.

Target additions: scheduled local time, verification status, source, fetched-at, accessibility notes, dietary flags, vote summary, revision.

### `messages`

`id`, `group_id`, nullable sender, content, type, sentiment score, metadata, timestamp.

Target additions: `client_message_id`, edit/delete timestamps, moderation state. Attachments are separate records.

### `expenses`

`id`, `trip_id`, payer, amount, currency, description, category, split type, optional JSON splits, timestamp.

Target: use `amount_minor`, remove duplicate JSON split authority, add expense date, receipt URL, updated/deleted fields, version.

### `expense_splits`

`id`, `expense_id`, `trip_id`, `user_id`, amount owed, payment state, timestamp.

Target: `amount_owed_minor`, `settled_at`; unique expense/user.

### `restaurants`

Provider ID, name, cuisine, price/rating, coordinates/address, city/country, specialties, local-gem score, photo/opening data, fetched time.

Target additions: provider, source URL, hygiene value/source/date, verification status, dietary features.

### `hidden_gems`

Provider ID, name/category/description/story, coordinates, city/country, gem score components, endorsements, photo, best time, tips, verification, timestamp.

Target additions: source evidence records, accessibility, confidence, last verified date.

### `pre_match_chats` And `pre_match_messages`

Chat participants, anonymity/status/sentiment/timestamps and messages.

Target additions: reveal state, block/report state, client message ID, moderation state, edit/delete timestamps.

## 3. Required New Tables

| Table | Purpose / Key fields |
|---|---|
| `itinerary_versions` | `id`, `trip_id`, `version`, `status`, `created_by`, `reason`, `parent_version_id`, timestamps |
| `itinerary_votes` | unique `item_id/user_id`, vote, timestamp |
| `audit_events` | actor, action, resource type/ID, request ID, redacted metadata, timestamp |
| `consent_events` | user, consent type, group, granted/revoked, policy version, timestamp |
| `blocks` | blocker, blocked user, reason code, timestamp |
| `reports` | reporter, subject/content reference, category, restricted evidence, status, timestamp |
| `location_sharing_sessions` | user, group/trip, starts, expires, revoked, purpose |
| `emergency_incidents` | initiator, group, coarse/exact encrypted location, status, timestamps |
| `notification_attempts` | incident/reminder, channel, recipient reference, provider ID, status, error code |
| `medication_schedules` | encrypted medicine details, timezone, recurrence, active state |
| `medication_events` | schedule, due time, taken/skipped/snoozed, timestamp |
| `payment_customers` | user/provider customer IDs |
| `subscriptions` | user, provider, external ID, status, plan, period, grace date |
| `webhook_events` | provider event ID, type, received/processed timestamps, result; unique provider/event |
| `provider_cache` | provider, key, normalized payload, freshness, expiry |
| `attachments` | owner, purpose, object URL/key, MIME, size, scan state |
| `push_subscriptions` | user, endpoint and keys encrypted, timestamps |

## 4. API Rules

- Base: `/api`.
- JSON unless webhook raw body or file upload.
- All list endpoints use cursor pagination: `?cursor=&limit=`.
- `limit` defaults 20, maximum 100.
- Mutations accept `Idempotency-Key` when duplicate execution is harmful.
- Concurrency-controlled writes accept `If-Match` or explicit `version`.
- Validation errors return 400, unauthenticated 401, unauthorized 403, absent 404, conflict 409, rate limit 429.
- Do not return stack traces or provider secrets.

## 5. Existing Endpoints To Preserve And Harden

| Method | Path | Contract |
|---|---|---|
| POST | `/auth/register` | Register adult credentials user |
| GET/POST | `/auth/[...nextauth]` | Auth.js handlers |
| GET/POST | `/users/profile` | Read/upsert own travel profile |
| POST | `/users/avatar` | Replace with multipart/object storage upload |
| GET/POST | `/medical/profile` | Read/upsert own decrypted profile; never client-cache |
| GET | `/matching/discover` | Cursor-paginated explainable matches |
| POST | `/chat/pre-match` | Create/reuse participant chat |
| GET | `/chat/{chatId}/messages` | Participant-only history |
| GET/POST | `/groups` | List memberships/create group |
| POST | `/groups/join` | Atomic invite join |
| GET | `/groups/{groupId}` | Member-only details |
| GET | `/groups/{groupId}/messages` | Member-only history |
| POST | `/groups/{groupId}/medical-consent` | Grant/revoke group-specific consent |
| GET | `/trips` | List own trips or group trip |
| POST | `/trips/generate` | Start versioned generation |
| POST | `/trips/{tripId}/collaborative-items` | Versioned itinerary mutation |
| GET/POST | `/trips/{tripId}/expenses` | Member-only expense list/create |
| GET | `/explore/food` | Verified food discovery |
| POST | `/emergency` | Create emergency incident/orchestration |
| POST | `/chat/bot` | General information only; premium and safety guardrails |
| GET | `/place-photo` | Server-side safe provider lookup, no open redirect |
| POST | `/webhooks/stripe` | Verified idempotent webhook |
| POST | `/webhooks/razorpay` | Verified idempotent webhook |

The existing `/users/upgrade` endpoint must be removed or restricted to development-only test fixtures. It must never grant production entitlement from an authenticated client request.

## 6. Required Additional Endpoints

### Account And Privacy

- `GET /account`
- `PATCH /account`
- `POST /account/export`
- `DELETE /account`
- `GET /consents`
- `GET /blocks`
- `POST /blocks`
- `DELETE /blocks/{userId}`
- `POST /reports`

### Groups

- `PATCH /groups/{groupId}`
- `POST /groups/{groupId}/invite/rotate`
- `POST /groups/{groupId}/leave`
- `DELETE /groups/{groupId}/members/{userId}`
- `POST /groups/{groupId}/dissolve`

### Trips And Itinerary

- `POST /trips`
- `GET /trips/{tripId}`
- `PATCH /trips/{tripId}`
- `GET /trips/{tripId}/versions`
- `POST /trips/{tripId}/regenerate`
- `PATCH /trips/{tripId}/items/{itemId}`
- `DELETE /trips/{tripId}/items/{itemId}`
- `POST /trips/{tripId}/items/{itemId}/vote`
- `POST /trips/{tripId}/items/{itemId}/complete`
- `GET /trips/{tripId}/facilities`
- `GET /trips/{tripId}/routes`

### Expenses

- `PATCH /trips/{tripId}/expenses/{expenseId}`
- `DELETE /trips/{tripId}/expenses/{expenseId}`
- `GET /trips/{tripId}/balances`
- `POST /trips/{tripId}/settlements/{splitId}/mark-paid`

### Safety

- `POST /location-sessions`
- `DELETE /location-sessions/{sessionId}`
- `POST /emergency-incidents`
- `GET /emergency-incidents/{incidentId}`
- `POST /emergency-incidents/{incidentId}/cancel`
- `POST /emergency-incidents/{incidentId}/resolve`
- CRUD `/medication-schedules`
- `POST /medication-events`
- CRUD `/push-subscriptions`

### Billing And Health

- `POST /billing/checkout`
- `GET /billing/subscription`
- `POST /billing/portal`
- `GET /health/live`
- `GET /health/ready`

## 7. Important Request Contracts

### Trip generation

```json
{
  "groupId": "uuid",
  "destination": {"label": "Goa, India", "placeId": "...", "lat": 15.29, "lng": 74.12, "timezone": "Asia/Kolkata"},
  "startDate": "2026-12-10",
  "endDate": "2026-12-14",
  "currency": "INR",
  "budgetTotalMinor": 120000,
  "pace": "balanced",
  "mobilityNeeds": ["limited_stairs"],
  "priorities": ["food", "culture", "hidden_gems"]
}
```

Response `202`:

```json
{"data":{"jobId":"uuid","tripId":"uuid","status":"queued"}}
```

Generation status can be polled or emitted over the trip room.

### Expense

```json
{
  "description": "Dinner",
  "amountMinor": 425000,
  "currency": "INR",
  "paidBy": "uuid",
  "category": "food",
  "splitType": "custom",
  "splits": [{"userId":"uuid","amountMinor":212500},{"userId":"uuid","amountMinor":212500}]
}
```

Server verifies exact sum, currency consistency, and membership.

### Emergency incident

```json
{
  "groupId": "uuid",
  "location": {"lat": 15.29, "lng": 74.12, "accuracyMeters": 18, "capturedAt": "ISO-8601"},
  "incidentType": "unspecified",
  "notifyEmergencyContacts": true
}
```

The server derives user identity. It returns incident ID, local emergency number configuration, facility results, and notification attempt statuses.

## 8. Socket.IO Contract

All client emits use acknowledgment callbacks and schema version `v: 1`.

### Client To Server

| Event | Payload |
|---|---|
| `group:join` | `{v, groupId}` |
| `group:message:send` | `{v, groupId, clientMessageId, content, type, metadata?}` |
| `prematch:join` | `{v, chatId}` |
| `prematch:message:send` | `{v, chatId, clientMessageId, content}` |
| `trip:join` | `{v, tripId}` |
| `itinerary:update` | `{v, tripId, baseVersion, operation}` |
| `location:start` | `{v, sessionId}` |
| `location:update` | `{v, sessionId, lat, lng, accuracy, capturedAt}` |
| `location:stop` | `{v, sessionId}` |
| `emergency:activate` | `{v, incidentId}` |

No payload contains a trusted `userId`.

### Server To Client

| Event | Payload |
|---|---|
| `group:message:new` | Persisted message record |
| `prematch:message:new` | Persisted message record |
| `itinerary:updated` | `{tripId, version, operation, actorSummary}` |
| `itinerary:conflict` | `{tripId, expectedVersion, currentVersion}` |
| `location:updated` | Short-lived member location |
| `location:stopped` | Session/member |
| `emergency:activated` | Incident summary |
| `emergency:notification-status` | Contact/channel status without sensitive contact value |
| `generation:progress` | `{jobId, stage, percent, message}` |
| `error` | `{code, message, requestId}` |

## 9. FastAPI ML Contracts

Retain and version:

- `POST /api/ml/v1/matching/cluster`
- `POST /api/ml/v1/matching/conflict-risk`
- `POST /api/ml/v1/medical/destination-risk`
- `POST /api/ml/v1/itinerary/gem-score`
- `POST /api/ml/v1/chat/moderation-signal`
- `POST /api/ml/v1/culinary/rank`

Every response includes:

```json
{"modelVersion":"heuristic-1.0","mode":"heuristic","result":{},"warnings":[]}
```

Use `mode: "trained_model"` only when a persisted model artifact, training record, evaluation report, and model card exist.

## 10. Environment Variables

Required production variables:

- `DATABASE_URL`
- `AUTH_SECRET`/the exact Auth.js secret variable used by the installed version
- `AUTH_TRUST_HOST`
- `NEXT_PUBLIC_APP_URL`
- `ML_SERVICE_URL`
- `MEDICAL_ENCRYPTION_KEY` or KMS key configuration
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` when OAuth enabled
- `GOOGLE_MAPS_SERVER_API_KEY` and separately restricted browser key if needed
- `OPENAI_API_KEY` when LLM generation enabled
- `OPENWEATHER_API_KEY`
- Stripe key, price ID, and webhook secret
- Razorpay key ID, key secret, and webhook secret
- Twilio credentials when SMS enabled
- Web push VAPID keys
- Object-storage bucket/endpoint credentials
- Observability endpoint/DSN

Rules:

- Public variables contain no secrets.
- Production startup fails for missing required security secrets.
- `.env.example` documents purpose, format, and whether optional.

