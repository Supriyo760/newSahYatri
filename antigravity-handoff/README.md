# SahYatri Antigravity Build Handoff

Version: 1.0  
Prepared: 2026-06-09  
Implementation baseline: existing `SahYatri` repository  
Framework baseline: Next.js 16.2.6, React 19.2.4, FastAPI, PostgreSQL

## Purpose

This folder is the authoritative build specification for an AI coding agent. It translates the project proposal and current repository into testable product, design, architecture, workflow, data, API, AI, security, deployment, and acceptance requirements.

The agent must extend the existing repository. It must not replace the application with a new starter, change the visual identity, remove working features, or introduce infrastructure that is not justified by a requirement.

## Reading Order

1. `README.md` - operating rules and authority.
2. `01_PRODUCT_REQUIREMENTS.md` - scope, users, features, roles, and non-functional requirements.
3. `02_UX_UI_DESIGN_SYSTEM.md` - exact visual language, navigation, screens, states, and accessibility.
4. `03_SYSTEM_ARCHITECTURE.md` - target architecture, service boundaries, deployment, jobs, and observability.
5. `04_DATA_API_REALTIME_CONTRACTS.md` - canonical data model, HTTP APIs, Socket.IO events, and environment variables.
6. `05_WORKFLOWS_AI_SECURITY.md` - end-to-end workflows, state machines, algorithms, medical safeguards, and security.
7. `06_IMPLEMENTATION_AND_ACCEPTANCE.md` - execution phases, definition of done, and acceptance tests.
8. `07_CURRENT_STATE_GAP_ANALYSIS.md` - what already works, what is simulated, and what remains.
9. `08_SOURCE_TRACEABILITY.md` - mapping from the supplied PDF to these requirements.

## Authority

When instructions conflict, use this order:

1. Safety, privacy, legal, and medical constraints in this pack.
2. Acceptance criteria in `06_IMPLEMENTATION_AND_ACCEPTANCE.md`.
3. Product and workflow requirements in this pack.
4. Existing repository behavior.
5. The supplied academic proposal.

The proposal is vision input, not an exact technical contract. This pack deliberately corrects contradictions and unsafe claims.

## Required Agent Behavior

- Read `AGENTS.md` before edits.
- Before changing Next.js code, read the relevant guide in `node_modules/next/dist/docs/`.
- Preserve unrelated user changes and the current dirty worktree.
- Use the App Router and Next.js 16 conventions. Dynamic `params` are promises. `proxy.ts` replaces the old middleware convention.
- Prefer Server Components for data display and Client Components only for interaction, browser APIs, or live state.
- Put authentication and authorization inside every sensitive route and Socket.IO event. Proxy-based redirects are convenience, not the security boundary.
- Validate external input with Zod or Pydantic.
- Keep medical data out of logs, analytics, URLs, client caches, and model prompts.
- Treat emergency guidance as static, professionally reviewed support content. Never present AI output as diagnosis or medical authority.
- Keep the app functional without paid external APIs by using clearly labeled demo fallbacks. Never silently present mock data as live data.
- Add tests with every behavior change. Do not mark a requirement complete without its acceptance test.

## Required Deliverable From Antigravity

The completed implementation must include:

- Working web application and FastAPI service.
- Database migrations and deterministic demo seed.
- `.env.example` containing names and descriptions only, never secrets.
- OpenAPI or equivalent API contract.
- Unit, integration, end-to-end, authorization, and critical safety tests.
- Deployment configuration and runbook.
- Updated gap matrix showing no unresolved P0 or P1 requirements.
- A final build report listing changed files, migrations, test results, known limitations, and demo credentials.

## Product Definition In One Sentence

SahYatri is a mobile-first travel companion network that helps adults find compatible travel partners, form consent-based groups, collaboratively plan adaptive trips, discover authentic food and places, share limited emergency information, and manage safety and expenses in one coherent workflow.

