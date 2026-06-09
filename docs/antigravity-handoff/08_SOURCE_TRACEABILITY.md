# 08. Source Traceability

Source: `Sahyatri 3. (1).pdf`, 26 pages, supplied by the project owner.

## 1. Proposal-To-Spec Mapping

| Proposal section/pages | Source intent | Authoritative destination |
|---|---|---|
| Abstract, pp. 2 | Matchmaker-first integrated travel platform | PRD sections 1-3 |
| Introduction, pp. 4 | Matching, planning, medical safety, food, hidden gems, translation | PRD functional requirements |
| Problem, pp. 5 | Fragmentation, conflict, health unpreparedness, overspend, authenticity | PRD goals and success metrics |
| Objectives, pp. 6-7 | Matching, medical suite, planning, culinary, gems, navigation, budget, accessibility | PRD FR-MATCH through FR-I18N |
| Literature review, pp. 8-9 | Claimed research gaps | Product rationale; claims require source validation before publication |
| Hypotheses, pp. 10-11 | Improvement targets | PRD success metrics; treated as targets, not facts |
| Design/architecture, pp. 12 | Microservices and cloud stack | Architecture; simplified to modular monolith + ML service for MVP |
| Matching method, pp. 13 | Big Five, weighted compatibility, group constraints | Workflow canonical formula and ML rules |
| Planning/gems, pp. 14 | Dijkstra, LLM, duration rules, gem scoring | Trip workflow, architecture, acceptance AC-06 to AC-09 |
| Culinary/realtime/medical, pp. 15 | Food matching, live context, emergency suite | PRD FR-DISC/FR-SAFE and workflow |
| UI/APIs, pp. 16 | Key interfaces and provider list | UX screen specs and integration strategy |
| Data/testing, pp. 17 | Synthetic data and testing targets | Implementation test matrix |
| Evaluation/ethics, pp. 18-19 | Metrics, privacy, bias, medical disclaimer | AI lifecycle, safety, privacy, success metrics |
| MVP output, pp. 20-21 | Feature and technical deliverables | MVP scope and final acceptance |
| Documentation/research, pp. 22-23 | Documentation, paper, datasets, open source | Separate academic/research workstream; not a prerequisite for core app |
| UX/business/impact, pp. 23-25 | Desired improvements, monetization, social impact | Metrics and future scope; no unsupported claims |

## 2. Deliberate Corrections

### Medical Profile Is Optional

The proposal calls medical profile creation mandatory. The build specification makes disclosure optional because health information is sensitive and consent must be meaningful. Safety readiness can encourage completion without blocking general travel use.

### Medical Data Does Not Rank People

The proposal includes "medical compatibility" in matching. The target does not penalize or exclude people based on health conditions. It uses a separate emergency-sharing readiness signal and destination-specific warnings.

### Architecture Is Incremental

The proposal requests PostgreSQL, MongoDB, Redis, RabbitMQ, Kubernetes, and many microservices. The current repository successfully uses Next.js, FastAPI, and PostgreSQL. Additional infrastructure is deferred until measured needs justify it.

### Models Are Named Honestly

Current conflict, medical risk, gem, and sentiment code is heuristic. It must not be described as Random Forest, XGBoost, or BERT until trained artifacts and evaluations exist.

### Claims Require Evidence

Targets such as 85% accuracy, 99.9% uptime, 10,000 concurrent users, 35% faster emergency response, and HIPAA compliance are not accepted as current facts. They require a documented test or compliance program.

### Hidden Gem Allocation

The proposal alternates between 40% gems and a 40/30/30 split with different meanings. The authoritative requirement is a 30-40% target for verified lesser-known experiences on trips of 5 or more days, with no fabrication to meet a quota.

### Safety Content Is Not Generative Authority

The proposal suggests tailored first aid and AI chat. The build specification requires static, versioned, reviewed emergency cards and restricts generative chat from diagnosis or treatment changes.

## 3. Repository-To-Spec Mapping

| Existing area | Main target document |
|---|---|
| `src/app`, `src/components`, `src/app/globals.css` | UX/UI |
| `src/db/schema.ts`, migrations | Data/API |
| `src/app/api` | Data/API and architecture |
| `server.ts`, `src/hooks/useSocket.ts` | Realtime contract and security |
| `src/lib/matching`, FastAPI models | Workflows/AI |
| `src/lib/itinerary`, map/weather/traffic services | Workflows/architecture |
| `src/lib/medical`, safety page | Safety/security |
| Expense modules/routes/components | PRD and acceptance |
| Docker/Compose/GitHub Actions | Architecture and implementation |

## 4. Open Product Decisions

The following may be decided during implementation but must be recorded in an ADR and must not weaken acceptance criteria:

- Exact identity verification provider.
- Primary maps/weather/translation vendors by deployment region.
- Free and premium quotas/prices.
- Group voting threshold.
- Exact medical content reviewer and review cycle.
- Data retention periods by jurisdiction.
- Whether exact SOS location is retained and for how long.
- Production hosting vendor.

## 5. Final Instruction To The Build Agent

Do not interpret the proposal as permission to fabricate integrations, model performance, live data, medical authority, or production scale. Build the smallest honest system that satisfies the authoritative requirements, preserve the existing product identity, and make every claim testable.

