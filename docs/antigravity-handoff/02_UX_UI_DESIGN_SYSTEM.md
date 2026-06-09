# 02. UX And UI Design System

## 1. Design Direction

Name: **The Intelligent Travel Journal**

The product should feel like a refined field journal: warm paper, editorial photography, quiet map references, tactile cards, and calm typography. It must still behave like a serious safety and planning tool. Decorative motion belongs mainly on marketing surfaces; authenticated workflows prioritize speed, clarity, and accessibility.

Do not redesign SahYatri as a generic blue SaaS dashboard, neon AI product, glass-only interface, or dense enterprise admin panel.

## 2. Design Tokens

These values are authoritative and match the existing application.

### Color

| Token | Value | Use |
|---|---:|---|
| `primary` | `#8F361D` | Main actions, brand headings, active navigation |
| `primary-container` | `#AF4D32` | Hover/selected primary surfaces |
| `secondary` | `#865300` | Culinary and discovery labels |
| `secondary-container` | `#FDB55C` | Warm highlight, premium accents |
| `tertiary` | `#435848` | Success, verified, nature |
| `tertiary-container` | `#5B705F` | Tertiary hover |
| `background` | `#FBF9F4` | Main paper background |
| `surface-lowest` | `#FFFFFF` | Inputs and elevated content |
| `surface-low` | `#F5F3EE` | Soft cards |
| `surface` | `#FBF9F4` | Base surface |
| `surface-container` | `#F0EEE9` | Forms and grouped cards |
| `surface-high` | `#EAE8E3` | Hover and inactive controls |
| `surface-highest` | `#E4E2DD` | Footer and strongest neutral panel |
| `on-surface` | `#1B1C19` | Primary text |
| `on-surface-variant` | `#56423D` | Secondary text |
| `outline` | `#89726C` | Muted text and controls |
| `outline-variant` | `#DDC0B9` | Dividers and borders |
| `danger` | `#BA1A1A` | SOS, destructive actions, severe errors |
| `danger-container` | `#FFDAD6` | Error background |
| `success-container` | `#D1E9D3` | Success background |

Color must not be the only state indicator. Every status also needs text and/or an icon.

### Typography

- Editorial font: `EB Garamond`, weights 400-700.
- Interface font: `Manrope`, weights 300-800.
- Display/H1: EB Garamond, 48-80 px marketing, 36-48 px application, line-height 1.05-1.15.
- H2: EB Garamond, 28-36 px.
- H3: EB Garamond or Manrope semibold, 20-26 px.
- Body: Manrope, 16 px, line-height 1.55-1.65.
- Compact body: Manrope, 14 px, line-height 1.5.
- Label: Manrope 11-12 px, weight 600, uppercase, letter spacing 0.08-0.12 em.
- Minimum rendered body text: 14 px. Safety instructions: at least 16 px.

### Geometry And Spacing

- Base spacing unit: 4 px.
- Common gaps: 8, 12, 16, 24, 32, 48, 64 px.
- Max application content width: 1200 px.
- Forms: 760-900 px.
- Text measure: 55-75 characters.
- Radius: 8 px controls, 12 px compact cards, 16 px standard cards, 24 px hero/mobile sheets, full pill only for tags/actions.
- Border: 1 px `outline-variant` at 30-60% opacity.
- Focus ring: 3 px outside ring using `primary` with high contrast.
- Tactile shadow: `0 10px 30px -5px rgba(143,54,29,.08), 0 4px 12px -2px rgba(86,66,61,.04)`.

### Motion

- Micro transitions: 150-250 ms.
- Drawer/sheet: 250-350 ms.
- Marketing reveals: up to 700 ms.
- Respect `prefers-reduced-motion`; remove parallax, tilt, pulsing, and nonessential transforms.
- Never animate emergency text, form validation, or content layout in a way that delays action.

## 3. App Shell

### Desktop

- Fixed 64 px header with menu trigger left, centered wordmark, profile/auth right.
- Left drawer is 320 px and contains Home, Dashboard, Discover, Groups, Itinerary, Safety, Profile/Preferences, Billing, Settings, and Sign out.
- Main content begins below header with 24-64 px horizontal padding.
- Contextual group/trip switcher appears at the top of authenticated feature pages.

### Mobile

- Header remains 56-64 px.
- Bottom navigation contains Dashboard, Discover, Trip, Safety, and Profile.
- Labels are always visible; icons alone are insufficient.
- Bottom sheets are preferred for filters and item details.
- Content reserves space for bottom navigation and safe-area insets.

## 4. Shared Component Contract

Every data-driven component must implement:

- Loading skeleton matching final geometry.
- Empty state explaining why it is empty and the primary next action.
- Inline recoverable error with retry.
- Permission-denied state without leaking resource existence.
- Offline/stale indicator where applicable.
- Success confirmation for writes.
- Disabled and submitting states that prevent duplicate actions.

Core components:

- `AppHeader`, `SideDrawer`, `BottomNav`, `ContextSwitcher`.
- `PrimaryButton`, `SecondaryButton`, `TextButton`, `DangerButton`.
- `TextField`, `Select`, `Checkbox`, `RadioGroup`, `Range`, `DateRange`, `TagInput`.
- `JournalCard`, `MetricCard`, `MatchCard`, `MemberCard`, `TripCard`, `PlaceCard`, `ExpenseRow`.
- `StatusBadge`, `SourceBadge`, `ConfidenceBadge`, `PremiumBadge`.
- `Modal`, `BottomSheet`, `Toast`, `AlertBanner`, `ConfirmDialog`.
- `Map`, `MapMarker`, `RouteSummary`, `FacilityFilter`.
- `ConsentPanel`, `EmergencyCard`, `HoldToSOS`.

## 5. Information Architecture

Public:

- `/` Marketing journal.
- `/auth/register`
- `/auth/login`
- `/privacy`
- `/terms`
- `/safety-disclaimer`

Authenticated:

- `/dashboard`
- `/discover`
- `/profile/[id]`
- `/groups/[groupId]`
- `/groups/[groupId]/chat`
- `/itinerary?groupId=...`
- `/trips/[tripId]`
- `/trips/[tripId]/expenses`
- `/safety?groupId=...`
- `/onboarding`
- `/settings/profile`
- `/settings/privacy`
- `/settings/billing`

The existing routes may remain while new detail routes are added incrementally.

## 6. Screen Specifications

### S01 Marketing Home

Goal: explain the value and route visitors to registration.

- Hero: vintage map texture, restrained compass, editorial travel imagery, headline "Journey beyond the map."
- Primary CTA: "Begin your journey"; secondary CTA: "See how it works."
- Sections: matching, collaborative planning, hidden gems, culinary discovery, safety, testimonial, final CTA.
- Do not fetch authenticated data.
- Remote images must have stable sources, dimensions, fallbacks, and appropriate Next image configuration.

### S02 Registration

- Two-column desktop: form and quiet editorial image/quote. Single column mobile.
- Fields: name, email, password, confirm password, date of birth or explicit 18+ confirmation, terms, privacy.
- Password requirements appear before submit.
- Success signs in or routes to login, then onboarding.

### S03 Login

- Email/password, Google when configured, forgot-password placeholder only if recovery is implemented.
- Error messages are generic for invalid credentials.
- Redirect authenticated users to requested safe return URL or dashboard.

### S04 Onboarding Wizard

Progress: `1 Identity -> 2 Travel -> 3 Personality -> 4 Food -> 5 Safety -> 6 Review`.

- Autosave each completed step.
- Back/next buttons remain stable.
- Personality sliders show human-readable endpoints, not diagnostic labels.
- Medical step is clearly optional and has "Skip for now."
- Review shows exactly what is public, group-visible with consent, and private.
- Completion requires required travel fields, not medical disclosure.

### S05 Dashboard

- Greeting and concise readiness status.
- Metrics: active groups, upcoming trips, profile completion.
- Primary cards: continue active trip, discover companions, create/join group.
- Active group list with status, members, destination, next action.
- Upcoming itinerary with next item and weather/source freshness.
- Safety readiness checklist without exposing conditions.

### S06 Discover

- Filter drawer: destination interest, dates, budget, style, group size, languages, interests.
- Match cards show photo, basic identity, compatibility ring, top shared traits, trust/verification, and actions.
- "Why this match?" opens a breakdown with plain-language factors.
- Never show medical conditions, neuroticism labels, or a definitive "safe/unsafe person" score.
- Empty state explains how widening filters affects results.

### S07 Profile Detail

- Hero card with avatar, name, age, nationality, travel style, languages.
- Compatibility breakdown and shared interests.
- Food/dietary compatibility.
- Trust signals are evidence-based: verified email, completed profile, completed trips after reviews exist.
- Actions: start anonymous chat, invite to group, block, report.

### S08 Groups

- Group header: name, state, invite code management, member count.
- Member grid with creator/member role and consent-ready status.
- Tabs: Overview, Chat, Plan, Expenses, Safety.
- Group state and allowed next actions are prominent.
- Creator controls use confirmation dialogs and server authorization.

### S09 Pre-Match Chat

- Anonymous identity presentation until both users choose to reveal.
- Message composer, timestamps, delivery state, block/report.
- Advisory moderation banner only when threshold is crossed; wording: "This conversation may need attention."
- Never expose raw sentiment scores to users.

### S10 Trip Setup And Generation

- Setup card fields: group, destination autocomplete, dates, currency, total budget, pace, mobility, priorities.
- Before generation, show a summary and estimated wait.
- Progress stages: validating, generating structure, verifying places, saving.
- Failure preserves inputs and offers retry or save draft.
- Generated result opens the itinerary, not a blank confirmation.

### S11 Itinerary

- Header: destination, date range, group, budget status, hidden-gem mode.
- Desktop: day rail left, timeline center, map/details right. Mobile: day tabs and map toggle.
- Day contains ordered cards with time, type, duration, cost, verification, travel buffer, complete state.
- Item detail includes description, source, opening hours, accessibility, dietary notes, directions, vote/edit actions.
- Hidden gems use a warm gold badge and an evidence explanation.
- Regenerate opens scope choices: one item, one day, or full trip; always versions changes.

### S12 Culinary Explorer

- Regional dish carousel followed by venue results.
- Filters: dietary needs, budget, venue style, distance, open now, verified hygiene.
- Result copy format: "Try [dish] at [venue], approximately [price] per person."
- Unknown hygiene is neutral gray and says "No verified hygiene source."

### S13 Expenses

- Summary: spent, budget remaining, personal balance.
- Add expense sheet supports receipt, payer, category, date, and split.
- Custom split shows remaining amount in real time and cannot submit until exact.
- Settlement list uses names and formatted currency.

### S14 Safety

- Top warning: "For immediate danger, call local emergency services."
- Three-second hold SOS centered and visually separated from normal actions.
- Before activation show location and selected group; after activation show incident status, notification results, and facilities.
- Medical card shows the signed-in user's data. Group overview shows only consented categories.
- First-aid cards are static, source/version labeled, large type, and printable.
- AI safety chat, if retained, must be labeled general information and must refuse diagnosis or dosage changes.

### S15 Settings And Privacy

- Public profile visibility.
- Blocked users.
- Group medical consent history and revoke controls.
- Active location-sharing sessions.
- Notification permissions and schedules.
- Data export and deletion request.
- Billing and entitlement status.

## 7. Content Style

- Calm, direct, and human.
- Use "travel companion," not "stranger" once a connection is formed.
- Avoid "perfect match," "guaranteed safe," "AI doctor," or "medically compatible."
- Distinguish "live," "estimated," "cached," "demo," and "unverified."
- Errors explain recovery: what happened, what was preserved, and what to do next.

## 8. Accessibility Checklist

- Semantic landmarks and one H1 per page.
- Keyboard access for drawer, dialogs, tabs, cards, reorder controls, maps, and SOS.
- Visible focus on all controls.
- Minimum 44x44 px touch targets.
- Form labels, descriptions, and inline error association.
- `aria-live` for generation, chat delivery, location state, and SOS progress.
- Map information duplicated in a list.
- Charts and score rings include text values.
- Contrast meets WCAG 2.2 AA.
- Reduced-motion mode is fully usable.
- Screen reader confirmation before and after SOS activation.

