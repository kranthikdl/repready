# RepReady — Architecture Decision Log

**Project:** RepReady — AI Sales Coaching Platform  
**Pilot scope:** 10-tenant HubSpot integration pilot  
**Document purpose:** Durable record of architectural decisions made during the planning session, including options considered, trade-offs weighed, and rationale for each decision. This document reflects the sequence of decisions as they were reached.

---

## D1 — Integration Scope: HubSpot vs Microsoft Teams

**Question:** Should both HubSpot and Microsoft Teams integrations be built in Phase 1?

### Options Considered
| Option | Description |
|---|---|
| A | Build both HubSpot and Teams integrations simultaneously in Phase 1 |
| B | HubSpot only in Phase 1; Teams deferred to Phase 2 |
| C | Teams only in Phase 1 |

### Trade-offs
- Teams inbound integration requires an Azure Bot Service, a separate infrastructure dependency outside the current Replit stack, and significant additional credential and deployment complexity.
- HubSpot delivers the highest immediate ROI for the pilot: CRM entry automation (prospect lookup pre-call and call log + note post-session) addresses the most concrete pain point for pilot reps.
- HubSpot build cost is materially lower — no new infrastructure required, no Azure account, no bot registration.
- Building both integrations in parallel risks overrunning pilot timelines and splitting implementation focus during a phase when the database layer and core HubSpot sync are themselves not yet built.

### Decision
**Option B — HubSpot in Phase 1. Teams deferred to Phase 2.**

HubSpot is the sole integration in scope for the pilot. Teams integration will be reconsidered after the pilot validates the core product-market fit.

---

## D2 — HubSpot Credential Model: Per-Tenant Token vs Shared OAuth

**Question:** Should tenants share a single HubSpot OAuth connection managed centrally, or should each tenant supply their own API token?

### Options Considered
| Option | Description |
|---|---|
| A | Shared OAuth app — one HubSpot connection managed centrally by RepReady |
| B | Per-tenant Private App API token — each tenant configures their own in their coaching profile |

### Trade-offs
- **Shared OAuth** requires either a HubSpot Marketplace listing or developer approval from HubSpot, adds an OAuth redirect callback flow to the backend, and creates a single shared rate limit (100 req/10s) across all tenants. A single misconfigured or high-volume tenant could throttle all others. Marketplace listing is a meaningful scope creep for a 10-tenant pilot.
- **Per-tenant tokens** require each tenant to generate one HubSpot Private App token in their portal settings (a two-minute operation). No OAuth infrastructure, no Marketplace dependency, no shared rate limits — each tenant's 100 req/10s limit is fully isolated. Token configuration is handled in the existing Coaching Profile UI. Aligns with pilot scale and development timeline.

### Decision
**Option B — Per-tenant Private App API token. No shared OAuth.**

Each of the 10 pilot tenants configures their own HubSpot Private App API token in their coaching profile. Tokens are stored per-tenant in the coaching profiles table and used exclusively for that tenant's HubSpot API calls.

---

## D3 — Database: In-Memory Storage vs PostgreSQL

**Question:** Is the current in-memory session store acceptable for pilot deployment?

### Options Considered
| Option | Description |
|---|---|
| A | Keep in-memory Map — no build cost, zero migration risk |
| B | Migrate to PostgreSQL via Drizzle ORM with per-tenant data partitioning |

### Trade-offs
- **In-memory Map** loses all session data, coaching profiles, and HubSpot tokens on every server restart, crash, or Replit sleep event. For a single-developer session this is inconvenient; for a 10-tenant production pilot it is unacceptable. There is no mechanism to recover lost data.
- **PostgreSQL** adds a build task (schema design, Drizzle ORM setup, migration) but is the minimum viable foundation for a multi-tenant product. Session data survives restarts. Coaching profiles and HubSpot tokens persist per tenant. Drizzle ORM is already in the dependency stack and `drizzle.config.ts` already exists. Replit's built-in PostgreSQL requires no additional infrastructure.
- The HubSpot sync loop (Task B) writes to the session record after the call ends. If the session is in-memory only, a restart between session end and HubSpot sync wipes the data needed to complete the sync. PostgreSQL is a prerequisite for HubSpot integration to be reliable.

### Decision
**Option B — PostgreSQL required before pilot launch. Classified as a blocking prerequisite.**

The database layer (Task A in the build sequence) must be completed before any pilot deployment. All subsequent tasks (HubSpot sync, Bidirectional mode UX) depend on persistent, tenant-partitioned storage. The in-memory store is replaced entirely; the pilot starts with a clean database.

---

## D4 — Deployment Target: Replit Autoscale vs Reserved VM

**Question:** Which Replit deployment type is correct for RepReady?

### Options Considered
| Option | Description |
|---|---|
| A | Autoscale — scales to zero when idle, charges per compute unit consumed |
| B | Reserved VM — always-on instance, fixed monthly cost |

### Trade-offs
| Factor | Autoscale | Reserved VM |
|---|---|---|
| WebSocket support | Technically yes | Yes |
| Session continuity during idle | Scales to zero, drops all connections | Always on |
| Mid-call coaching interruption risk | High | None |
| Billing model | Variable (per compute unit) | Fixed (~$7–14/mo) |
| Correct for RepReady | No | Yes |

- RepReady maintains persistent WebSocket connections for real-time coaching throughout an active call. Any scale-down to zero during an idle period drops all open WebSocket connections. If a rep pauses mid-call, an Autoscale deployment may cold-start during the pause, severing the coaching session.
- The Reserved VM remains alive continuously. WebSocket connections are never dropped due to infrastructure scaling. The fixed cost at pilot scale (~$7–14/mo for Shared 0.5 vCPU / 2 GB) is immaterial.

### Decision
**Reserved VM — Shared, 0.5 vCPU / 2 GB RAM. Autoscale is not viable for WebSocket-dependent applications.**

The RepReady pilot will be deployed to a Replit Reserved VM. The fixed monthly cost is acceptable and the always-on guarantee is required for session integrity.

---

## D5 — Real-Time Coaching Model: gpt-4o vs gpt-4o-mini

**Question:** Should real-time in-call coaching use the full gpt-4o model or gpt-4o-mini?

### Options Considered
| Option | Description |
|---|---|
| A | gpt-4o — higher output quality, higher latency, higher per-token cost |
| B | gpt-4o-mini — lower latency, lower cost, sufficient quality for structured prompts |

### Trade-offs
- Real-time coaching fires during an active call, triggered by a deterministic rules engine, with an 8-second global cooldown between cards. Latency directly impacts perceived usefulness — a coaching card appearing 4+ seconds after the trigger moment is less actionable.
- Coaching prompts are structured and rule-triggered (not open-ended generation). The prompt provides a trigger category, a coaching target, and a script anchor. gpt-4o-mini quality is sufficient for this constrained output type.
- At pilot scale (~8 coaching calls per session, 200 sessions/month), LLM token cost is negligible regardless of model chosen. The latency difference is the meaningful variable.

### Decision
**gpt-4o-mini for real-time coaching.**

Latency is the primary constraint during a live call. gpt-4o-mini delivers adequate quality with lower latency for structured, rules-triggered coaching prompts. Cost is a secondary benefit.

---

## D6 — Post-Call Summary Model: gpt-4o-mini vs gpt-4o

**Question:** Should the post-call summary use the same model as real-time coaching?

### Options Considered
| Option | Description |
|---|---|
| A | Keep gpt-4o-mini for consistency with real-time coaching |
| B | Upgrade post-call summary to gpt-4o |

### Trade-offs
- The post-call summary runs once per session, asynchronously, after the call has already ended. Latency is not a constraint — the user is reviewing results, not waiting for a real-time response.
- The post-call summary is written as a HubSpot Note on the contact record. It is a durable artifact that the rep, their manager, and potentially the prospect's account owner will read. Output quality directly affects the perceived value of the integration.
- The incremental cost per session of using gpt-4o vs gpt-4o-mini for one post-call summary is approximately $0.013 — negligible at 200 sessions/month ($2.60/month delta).

### Decision
**gpt-4o for post-call summary.**

Post-call summary is asynchronous and quality-sensitive. The HubSpot Note written from the summary is a durable CRM record. The cost difference is negligible. Summary quality justifies the model upgrade.

---

## D7 — Hosting Provider: Replit vs Alternatives

**Question:** Should the pilot run on Replit, or be deployed to another provider (Railway, Render, Fly.io, AWS, etc.)?

### Options Considered

| Provider | WebSockets | PostgreSQL | Est. Monthly | DevOps Overhead | Viable |
|---|---|---|---|---|---|
| Replit Reserved VM | Yes | Built-in | ~$14–20 | None | Yes — recommended |
| Railway | Yes | Built-in | ~$10–20 | Low | Yes — best migration target |
| Render | Yes | Built-in | ~$14–21 | Low | Yes — viable |
| Fly.io | Yes | Extension | ~$10–20 | Medium | Yes — best for global distribution |
| Heroku | Yes | Yes | ~$25–50 | Low | Yes — viable but costly |
| AWS / GCP / Azure | Yes | Yes | $30–100+ | High | Required for enterprise compliance |
| Vercel | No | No | — | — | Not viable — serverless, no persistent WebSocket |

### Trade-offs
- Vercel is eliminated immediately: serverless architecture has no persistent WebSocket support, which RepReady requires.
- AWS, GCP, and Azure are viable long-term targets but carry high DevOps overhead (IAM configuration, VPC setup, managed services) that is inappropriate for a 10-tenant pilot phase.
- Railway and Render are strong migration targets post-pilot with low DevOps overhead and comparable pricing.
- Replit offers zero DevOps overhead, built-in PostgreSQL (no separate provisioning), and a native development-to-deploy workflow within the same environment where RepReady is built. No context switching, no credential juggling, no infrastructure setup.

### Decision
**Replit Reserved VM for the pilot.**

Migration triggers are defined: enterprise compliance requirements (SOC 2, HIPAA, GDPR), 50+ tenants with heavy concurrent load, uptime SLA requirements, or multi-region low-latency needs. None of these apply at pilot scale.

---

## D8 — Teams Integration: Inbound vs Outbound vs Deferred

**Question:** If Teams is in scope, should it be inbound (Teams messages trigger RepReady coaching) or outbound (RepReady pushes coaching events to Teams)?

### Options Considered
| Option | Description |
|---|---|
| A | Inbound via Azure Bot — Teams messages arrive in RepReady and trigger coaching |
| B | Outbound webhook — RepReady posts formatted session summary cards to a Teams channel |
| C | Defer entirely |

### Trade-offs
- **Inbound (Option A):** Requires Azure Bot Service registration, a separate Azure infrastructure dependency, significant credential complexity (Azure App ID, Bot Framework token, manifest deployment), and a new inbound message parsing layer. High build cost. Delivers low incremental value over the existing browser interface for pilot reps who already use RepReady directly.
- **Outbound (Option B):** Substantially simpler — one incoming webhook URL per tenant, a single HTTP POST from the backend after session end. However, it adds a notification channel that largely duplicates the existing in-app Session Review page. The Adaptive Card in Teams would contain the same data already visible in RepReady. Marginal new value.
- **Deferred (Option C):** Neither path delivers meaningful new value for pilot reps operating in the RepReady browser interface. The complexity cost of inbound is not justified. The value of outbound is low. The pilot should validate core product behaviour before layering in notification integrations.

### Decision
**Deferred. Teams integration will be reconsidered if pilot reps operate primarily inside Microsoft Teams rather than the RepReady browser interface.**

If post-pilot feedback confirms that reps live in Teams and rarely open RepReady directly, outbound webhook (Option B) is the correct Phase 2 entry point before considering inbound.

---

## D9 — Dominant Pilot Cost Driver

**Question:** What is the primary cost variable to monitor during the pilot?

### Analysis
| Cost Component | Per Session | Per Month (200 sessions) | Notes |
|---|---|---|---|
| LLM coaching (gpt-4o-mini, ~8 calls) | ~$0.0016 | ~$0.32 | Negligible |
| LLM summary (gpt-4o, 1 call) | ~$0.013 | ~$2.66 | Negligible |
| Whisper transcription (15 min live call) | ~$0.09 | ~$18.00 | Dominant variable |
| HubSpot API | $0.00 | $0.00 | Free tier |
| Replit Reserved VM | Fixed | ~$7–14 | Fixed overhead |
| Replit PostgreSQL | Fixed | ~$2–5 | Fixed overhead |

- LLM token costs at pilot scale ($0.002–$0.016/session) are immaterial regardless of model choice.
- HubSpot API calls are free within normal usage limits.
- Whisper transcription at $0.006/audio minute × 15-minute average call = $0.09/session is the only variable cost that scales meaningfully with usage. At 200 sessions/month, Whisper accounts for ~$18 of variable cost vs. ~$3 for all LLM usage combined.
- Simulation and Guided modes incur zero Whisper cost because they use pre-scripted or manually entered transcript data, not live audio transcription.

### Decision
**Whisper transcription is the cost lever to watch.**

During the early pilot, encourage simulation and guided mode use before validating live-call volume. This minimises cost before the session cadence is established. Live mode Whisper spend should be monitored as the primary scaling signal.

---

## D10 — Biggest Non-Cost Pilot Risk

**Question:** What is the most likely reason the pilot fails — is it infrastructure, cost, or something else?

### Analysis
- **Infrastructure risks** are solvable and bounded: the database layer eliminates data loss, the Reserved VM eliminates WebSocket continuity issues, HubSpot API failures are handled gracefully and do not block session completion.
- **Cost risks** are negligible at 10-tenant, 200-session/month scale. Even worst-case LLM + Whisper spend is under $25/month in variable costs.
- **Adoption risk** is structural: the HubSpot bidirectional sync loop only fires if the rep links a HubSpot contact before starting the session. If reps skip the contact search step (e.g., they start a session without selecting a prospect), no `hubspotContactId` is stored, the post-session sync does not trigger, and no CRM data is written. The integration silently delivers zero value for that session.
- The Bidirectional mode UX (Task C) partially addresses this by making contact linking a required step when Bidirectional mode is selected — the Start Session button is inactive until a contact is chosen. However, if reps default to Live mode instead of Bidirectional mode, the same gap exists.

### Decision
**Adoption is the primary pilot risk. The UX must make contact linking the natural first step before starting a session.**

The Bidirectional mode's required contact linking enforces the correct workflow when the mode is chosen. Pilot onboarding should emphasise Bidirectional mode as the standard operating mode for reps with active HubSpot portals. Infrastructure and cost are not the failure modes to watch.

---

*Document generated: March 27, 2026*  
*Source: RepReady planning session — task files and pilot brief*
