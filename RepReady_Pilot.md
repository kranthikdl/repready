# RepReady — HubSpot Integration Pilot Brief

---

## 1. Scope Decision

| Item | Decision |
|---|---|
| HubSpot Integration | **In scope — Phase 1** |
| Microsoft Teams Integration | **Deferred — Phase 2** |
| Pilot tenant count | 10 |
| Integration mode | Per-tenant HubSpot Private App API token (not shared OAuth) |
| Session modes in scope | Simulation, Guided, Live, Bidirectional (new) |

---

## 2. Current Architecture Gaps (Pre-Build)

| Gap | Severity | Impact |
|---|---|---|
| No database — all sessions stored in-memory | **Critical** | Server restart wipes all tenant data |
| No tenant isolation | **Critical** | All sessions share one global store |
| Single global CoachingProfile | **High** | No per-tenant coaching configuration |
| No authentication | **Medium** | Any URL access = full data access |
| HubSpot: no connection exists | **High** | Integration cannot function |

---

## 3. Build Plan — Task Sequence & Dependencies

```
Task A: Database & Tenant Foundation
    └── Task B: HubSpot Bidirectional Sync
            └── Task C: Bidirectional Mode & Integration UX
Task D: Teams Outbound Webhook (DEFERRED)
```

### Task A — Database & Tenant Foundation
| Field | Detail |
|---|---|
| Scope | Replace in-memory Map with PostgreSQL via Drizzle ORM; add tenantId partitioning |
| Complexity | High |
| Human engineering days | 3–5 days |
| Replit agent hours | 3–6 hours |
| Human oversight hours | 3–5 hours |
| End-user visible value | None — infrastructure only |
| Risk | Migration must preserve all existing API contracts |

### Task B — HubSpot Bidirectional Sync
| Field | Detail |
|---|---|
| Scope | Prospect lookup pre-call (HubSpot → RepReady); call log + note post-session (RepReady → HubSpot) |
| Complexity | Medium–High |
| Human engineering days | 2–3 days |
| Replit agent hours | 2–4 hours |
| Human oversight hours | 2–3 hours |
| Risk | HubSpot token scope must include: Contacts read, Notes write, Calls write |

### Task C — Bidirectional Mode & Integration UX
| Field | Detail |
|---|---|
| Scope | Unlock Bidirectional mode button; HubSpot connection health dashboard; session badges |
| Complexity | Low |
| Human engineering days | 1 day |
| Replit agent hours | 1–2 hours |
| Human oversight hours | 1 hour |
| Risk | Low |

### Build Totals
| Metric | Range |
|---|---|
| Total human engineering days (baseline) | 6–9 days |
| Total Replit agent execution | 6–12 hours |
| Total human oversight required | 6–9 hours |
| Agent compression ratio vs human | ~10–15× |

---

## 4. AI Model Specifications

### Real-Time Coaching (during live calls)
| Parameter | Value |
|---|---|
| Model | gpt-4o-mini |
| Max tokens (output) | 300 |
| Temperature | 0.3 |
| Trigger mechanism | Rules engine (deterministic) → LLM refinement |
| Global cooldown | 8 seconds |
| High-severity cooldown | 4 seconds |
| Per-category cooldown | 20 seconds |
| Concurrent call guard | pendingLLMCall flag (one LLM call per session at a time) |
| Recommendation | Keep gpt-4o-mini — latency is time-sensitive |

### Post-Call Summary
| Parameter | Value |
|---|---|
| Current model | gpt-4o-mini |
| Max tokens (output) | 1,000 |
| Temperature | 0.4 |
| Calls per session | 1 (after session ends) |
| Recommendation | **Upgrade to gpt-4o** — async, quality matters, cost impact is negligible |

### Audio Transcription (live/guided mode)
| Parameter | Value |
|---|---|
| Model | Whisper-1 |
| Pricing basis | Per audio minute ($0.006/min) |
| Hallucination filter | Active (13 regex patterns) |

---

## 5. Runtime Token Costs Per Session

### Token Usage Breakdown
| Component | Input Tokens | Output Tokens | Total Tokens |
|---|---|---|---|
| Coaching calls (~8/session) | ~6,400 | ~800 | ~7,200 |
| Post-call summary | ~2,500 | ~800 | ~3,300 |
| **Session total** | **~8,900** | **~1,600** | **~10,500** |

### Cost Per Session — Model Scenarios
| Scenario | LLM Cost | Whisper (15 min) | Total Per Session |
|---|---|---|---|
| All gpt-4o-mini, simulation mode | $0.0023 | $0.00 | **$0.0023** |
| All gpt-4o-mini, live mode | $0.0023 | $0.09 | **$0.0923** |
| gpt-4o-mini coaching + gpt-4o summary, live | $0.016 | $0.09 | **$0.106** |

### HubSpot API Cost Per Session
| Action | API Calls | Cost |
|---|---|---|
| Prospect search (pre-call) | 1 | $0.00 |
| Call engagement log (post-session) | 1 | $0.00 |
| Contact note (post-session) | 1 | $0.00 |
| **Total** | **3** | **$0.00** |

---

## 6. Monthly Runtime Cost — 10-Tenant Pilot

**Assumptions:** 10 tenants × 20 sessions/month = 200 sessions, 15-minute average calls

| Line Item | Charged Via | Simulation Mode | Live Mode (mini) | Live Mode (4o summary) |
|---|---|---|---|---|
| OpenAI LLM (coaching + summary) | OpenAI API key | $0.46 | $0.46 | $3.66 |
| Whisper transcription | OpenAI API key | $0.00 | $18.00 | $18.00 |
| Replit Reserved VM (Shared) | Replit billing | $7–14 | $7–14 | $7–14 |
| Replit PostgreSQL (production) | Replit billing | $2–5 | $2–5 | $2–5 |
| HubSpot API | Free | $0.00 | $0.00 | $0.00 |
| **Monthly Total** | | **~$10–20** | **~$28–38** | **~$31–41** |

### Cost Scaling Triggers
| Trigger | Action Required | Cost Impact |
|---|---|---|
| >25 concurrent sessions | Upgrade to Dedicated 1 vCPU VM | +~$10/mo |
| >500 sessions/month | OpenAI costs become material | ~$100–200/mo |
| >5 GB session history | PostgreSQL storage tier increase | Marginal |
| Teams inbound (Azure bot) | Separate Azure infrastructure | New cost centre |

---

## 7. Deployment Architecture

### Recommended Stack
```
┌─────────────────────────────────────────────┐
│          Replit Reserved VM                  │
│      0.5 vCPU / 2 GB RAM (Shared)           │
│                                              │
│  Express → REST API + WebSocket (/ws)        │
│  Vite-built frontend (served by Express)     │
│  Active sessions in-memory (during call)     │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  Replit PostgreSQL  │
         │  (Production DB)    │
         │  Completed sessions │
         │  Per-tenant profiles│
         └─────────┬──────────┘
         ┌─────────▼──────────┐   ┌─────────────────┐
         │    OpenAI API       │   │  HubSpot API     │
         │  gpt-4o-mini (RT)   │   │  Per-tenant token│
         │  gpt-4o (summary)   │   │  Isolated RL     │
         │  Whisper (live)     │   └─────────────────┘
         └────────────────────┘
```

### Why Reserved VM (not Autoscale)
| Factor | Autoscale | Reserved VM |
|---|---|---|
| WebSocket support | Technically yes | Yes |
| Session continuity during idle | ❌ Scales to zero, drops connections | ✅ Always on |
| Mid-call coaching interruption risk | High | None |
| Billing model | Per compute unit (variable) | Fixed monthly |
| Correct for RepReady | ❌ | ✅ |

---

## 8. Hosting Provider Comparison

| Provider | WebSockets | PostgreSQL | Est. Monthly | DevOps Overhead | Viable for RepReady |
|---|---|---|---|---|---|
| **Replit Reserved VM** | ✅ | ✅ Built-in | ~$14–20 | None | ✅ Recommended for pilot |
| **Railway** | ✅ | ✅ Built-in | ~$10–20 | Low | ✅ Best migration target |
| **Render** | ✅ | ✅ Built-in | ~$14–21 | Low | ✅ Viable |
| **Fly.io** | ✅ | ✅ Extension | ~$10–20 | Medium | ✅ Best for global distribution |
| **Heroku** | ✅ | ✅ | ~$25–50 | Low | ✅ Viable but costly |
| **AWS / GCP / Azure** | ✅ | ✅ | $30–100+ | High | ✅ Required for enterprise compliance |
| **Vercel** | ❌ | ❌ | — | — | ❌ Not viable (serverless, no persistent WS) |

### When to Migrate Off Replit
| Trigger | Target Platform |
|---|---|
| Enterprise compliance required (SOC 2, HIPAA, GDPR) | AWS / Azure / GCP |
| Multi-region low-latency required | Fly.io |
| 50+ tenants, heavy concurrent load | Railway or dedicated cloud |
| Uptime SLA required | Any major cloud provider |

---

## 9. Conclusions

| Area | Conclusion |
|---|---|
| **Phase 1 scope** | HubSpot bidirectional only. Teams deferred. |
| **Blocking prerequisite** | Database layer (Task A) must be built before any pilot deployment. Without it, a server restart loses all tenant data. |
| **Token cost** | Negligible at pilot scale. Not a meaningful ROI variable. |
| **Dominant runtime cost** | Whisper transcription ($0.09/session in live mode). Avoidable via simulation/guided mode. |
| **Model recommendation** | gpt-4o-mini for real-time coaching (latency-sensitive). gpt-4o for post-call summary (quality-sensitive, async). |
| **Deployment recommendation** | Replit Reserved VM (Shared, 0.5 vCPU / 2 GB) for pilot. No migration warranted until pilot is validated. |
| **HubSpot credential model** | Per-tenant Private App API token. No shared OAuth. Independently rate-limited per tenant. |
| **Total monthly cost at 10 tenants** | ~$10–20/mo (simulation) · ~$28–41/mo (live mode with gpt-4o summaries) |
| **Build effort (human oversight)** | ~6–9 hours across 3 tasks with Replit agent doing mechanical work |
| **ROI break-even** | 10 min CRM entry saved × 20 sessions/month × 10 tenants = 2,000 min/month. Payback inside first billing cycle at any reasonable hourly rate. |
| **Biggest non-cost risk** | User behaviour — if reps do not link a HubSpot contact before a call, the bidirectional loop does not fire. Adoption is the pilot risk, not infrastructure. |
