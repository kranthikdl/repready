# RepReady — Pilot Scaling & Enterprise Readiness Q&A

Use this to scope the move from demo to a production-grade multi-pilot deployment. Answers drive architecture decisions, integration depth, and NFR targets.

---

## Section 1 — Pilot Definition & Scale

**1.1** How do you define one pilot unit?
*(Confirm: one SDR Manager + their direct SDR team = one org/pilot)*

**1.2** How many pilots are planned for the initial wave?
*(e.g., 3 orgs, 10 orgs — each with their own manager and team)*

**1.3** What is the expected team size per pilot?
*(Average number of SDRs per manager — 5, 10, 20?)*

**1.4** Are pilots within a single enterprise customer, or are they separate companies?

**1.5** Will each pilot have its own isolated Coaching Profile and scorecard configuration, or is there a shared global baseline with per-team overrides?

**1.6** What is the target pilot duration before a go/no-go decision?
*(30 days, 60 days, 90 days?)*

**1.7** What does "graduation from pilot to full rollout" look like? What metrics or events trigger it?

---

## Section 2 — User Roles & Workflows

### SDR (Rep) Workflow

**2.1** Does the rep initiate their own sessions, or does the manager assign/schedule them?

**2.2** Should reps be able to see their own historical scorecards and trend data, or is that manager-only?

**2.3** Do reps need a personal login / persistent identity, or is name-based session entry sufficient for the pilot?

**2.4** Should the rep receive a post-call summary automatically (email, Slack, in-app), or only on request?

**2.5** Is there a self-coaching loop expected — e.g., rep reviews their scorecard, acknowledges feedback, sets a goal for next call?

### SDR Manager Workflow

**2.6** What does a manager's daily / weekly review workflow look like?
*(Check team scorecards, listen to flagged moments, write coaching notes, assign practice scenarios)*

**2.7** Should managers be able to override or annotate AI-generated scores?

**2.8** Do managers need to approve a rep as "call-ready" before that rep can run live sessions?

**2.9** Should managers receive alerts or notifications when a rep scores below a threshold?

**2.10** Do multiple managers need to share visibility into the same team, or is it always 1 manager : 1 team?

### Team & Performance Management

**2.11** Is there a concept of rep progression tiers — e.g., trainee → developing → ready → certified?

**2.12** Should the platform track coaching hours or session volume per rep, not just scores?

**2.13** Is there a formal Performance Improvement Plan (PIP) workflow that RepReady needs to feed into or trigger?

**2.14** Do you need peer benchmarking — showing a rep how they rank against their team or cohort?

**2.15** Should there be a "coach the coach" layer — visibility for a VP or enablement lead above the manager?

---

## Section 3 — HubSpot Integration

**3.1** Are you on HubSpot Sales Hub Starter, Professional, or Enterprise?
*(API access and available objects differ by tier)*

**3.2** What is the primary object in HubSpot that a RepReady session maps to?
*(Contact, Company, Deal, or a custom Activity / Engagement record?)*

**3.3** What data should flow from RepReady into HubSpot after a call?
*(Post-call summary text, scorecard scores, coaching prompts fired, session duration, call type)*

**3.4** Should RepReady pull context from HubSpot before a session?
*(e.g., pre-populate prospect name, deal stage, company, last activity)*

**3.5** Who in HubSpot needs to see RepReady data — the rep's own record, the manager's dashboard, or a shared team view?

**3.6** Do you need RepReady scores to update a custom HubSpot property on the contact or deal?
*(e.g., `rep_readiness_score`, `last_coaching_date`)*

**3.7** Is there a HubSpot Workflow (automation) that should trigger based on a RepReady event?
*(e.g., score below 60 → assign manager review task; session completed → log activity)*

**3.8** Does your HubSpot instance have Private App tokens available, or do you need OAuth for multi-tenant use?

**3.9** Are there other CRM or sales engagement tools in the stack that also need to receive RepReady data?
*(Salesforce, Outreach, Salesloft, Apollo)*

---

## Section 4 — Enterprise Integration Surface

**4.1** What identity provider (IdP) is in use?
*(Okta, Azure AD / Entra ID, Google Workspace, or none for pilot)*

**4.2** Is SSO (SAML or OIDC) required for the pilot, or can email/password suffice initially?

**4.3** Is Microsoft Teams the primary communication platform, or is it Slack, Zoom, or mixed?

**4.4** What conversation intelligence tools are already deployed?
*(Gong, Chorus, Clari, Salesloft Conversations — RepReady must avoid duplicating or conflicting)*

**4.5** Where are call recordings stored today, if at all?
*(Local, S3, Gong, Teams recordings, none)*

**4.6** Does the enterprise have a data warehouse or BI tool where RepReady insights should land?
*(Snowflake, BigQuery, Tableau, Power BI)*

**4.7** Are there procurement or security review requirements before any new SaaS tool can be provisioned?
*(SOC 2, GDPR/CCPA DPA, vendor questionnaire, penetration test)*

**4.8** What is the data retention policy for call transcripts and session data?
*(30 days, 1 year, indefinite — and who controls deletion)*

---

## Section 5 — Non-Functional Requirements

### Performance & Latency

**5.1** What is the acceptable end-to-end latency for a real-time coaching cue to appear after a trigger phrase is spoken?
*(Current target: under 4 seconds — is that acceptable, or does the team need sub-2s?)*

**5.2** What is the acceptable latency for post-call summary generation after a session ends?
*(Current: 10–20 seconds for LLM generation — is that acceptable?)*

**5.3** Are there peak usage windows where latency must be guaranteed?
*(e.g., 9–11 AM and 1–3 PM ET when most cold calls happen)*

**5.4** Should the platform degrade gracefully (disable AI, still capture transcript) if OpenAI latency spikes, or is full-session reliability required?

### Concurrency

**5.5** What is the expected number of simultaneous live sessions across all pilots?
*(e.g., 10 managers × 8 SDRs each = up to 80 concurrent sessions — confirm your expected peak)*

**5.6** Should each pilot be completely isolated at the infrastructure level, or is multi-tenant shared infrastructure acceptable?

**5.7** Is there a burst scenario — e.g., all reps on a team run sessions simultaneously during a training day — that must be load-tested?

### Reliability & Availability

**5.8** What is the expected uptime SLA for the pilot?
*(99% / 99.5% / 99.9% — and what is the tolerance for unplanned downtime during business hours?)*

**5.9** Is session data loss acceptable if the server restarts mid-call, or does the transcript need to be durable and resumable?

**5.10** Should there be a fallback mode — e.g., if the AI service is unavailable, continue capturing transcript without coaching prompts?

### Security

**5.11** Does call audio ever need to leave the user's browser — or should transcription happen on-device for certain customers?

**5.12** Are transcripts and scorecard data considered PII under your legal framework?

**5.13** Who is allowed to access raw transcripts — rep only, manager, HR, legal?

**5.14** Is there an audit log requirement for who accessed which session data?

---

## Section 6 — Pricing & Commercial Model (Pilot to Scale)

**6.1** What is the commercial model you expect — per seat (per SDR), per pilot org (flat), or usage-based (per session)?

**6.2** Is the pilot free, discounted, or full price with a refund clause?

**6.3** What are the contractual exit conditions if the pilot does not meet expectations?

**6.4** Who signs the pilot agreement — the SDR manager, VP of Sales, or procurement?

**6.5** If the pilot succeeds, what does the expansion unit look like — additional teams within the same org, or new org customers?

---

## Section 7 — Success Criteria & Measurement

**7.1** What are the 3 metrics that define pilot success?
*(e.g., rep readiness score improvement ≥15 pts over 60 days, time-to-first-meeting reduced, manager coaching time reduced)*

**7.2** How will you baseline current rep readiness before the pilot starts?

**7.3** Who owns the success measurement — the customer's enablement team, your CS team, or a joint review?

**7.4** Should RepReady generate a pilot report automatically at the 30- and 60-day marks?

**7.5** What would make a manager recommend RepReady to a peer manager in another team?

---

*Completed answers inform: multi-tenant architecture design, HubSpot integration depth, role-based access model, NFR targets (latency, concurrency, uptime), and commercial pilot terms.*
