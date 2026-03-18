# RepReady — Customization Inputs

Use this document to collect requirements from your customer before configuring RepReady for their team.

---

## 1. Coaching Methodology & Philosophy

> *This becomes the AI's core instruction set — it shapes every real-time coaching cue and post-call evaluation.*

- What sales methodology does your team follow?
  *(e.g., MEDDIC, MEDDPICC, Challenger Sale, SPIN Selling, Sandler, your own framework)*

- What does "great" look like on a call for your reps?
  *(e.g., "Always lead with business impact, never features. Ask at least 3 discovery questions before presenting.")*

- Are there specific phrases or language patterns your team is trained to use?
  *(e.g., "We always say 'what does success look like for you' within the first 5 minutes")*

- Are there things your reps commonly do that you want the AI to flag?
  *(e.g., "They pitch too early," "They don't ask about the economic buyer," "They let calls end without a committed next step")*

---

## 2. Coaching Focus Areas

> *Which dimensions should the AI actively monitor during live calls?*

- [ ] **Discovery depth** — Is the rep asking enough questions to understand the prospect's situation?
- [ ] **Objection handling** — Is the rep responding effectively when the prospect pushes back?
- [ ] **Next step discipline** — Is the rep locking in a clear, committed follow-up before the call ends?
- [ ] Other: _______________

*Which of the above is the highest priority for your team right now?*

---

## 3. Warning Triggers

> *What should cause a real-time coaching card to appear on the rep's screen?*

**Prospect signals to watch for:**
- What hesitation phrases does your prospect typically use?
  *(e.g., "we're happy with our current vendor," "budget is tight," "let me think about it")*
- Are there competitor names the AI should flag when a prospect mentions them?

**Rep behavior to watch for:**
- How long should a rep talk before the AI nudges them to ask a question? *(current default: ~80 words)*
- How many exchanges should pass before the AI flags a missing next step? *(current default: 16 turns)*

---

## 4. Post-Call Scorecard

> *What dimensions should appear on the readiness scorecard after every session?*

Current default dimensions:
- Discovery (0–100)
- Objection Handling (0–100)
- Next Step Discipline (0–100)
- Overall Readiness (0–100)

**Questions:**
- Do these dimensions match your coaching framework, or should they be renamed/replaced?
  *(e.g., replace "Discovery" with "MEDDIC Qualification Score")*
- Are there dimensions you want to add?
  *(e.g., "Competitor Handling," "Persona Awareness," "Value Proposition Clarity")*
- What score thresholds define "ready to run solo" vs. "needs more coaching" for your team?

---

## 5. Call Types & Talk Tracks

> *RepReady can be configured for different call stages, each with its own coaching context.*

- What call types do your reps run?
  *(e.g., cold outbound, discovery, demo, follow-up, renewal, expansion)*

- For each call type, what are the 2–3 most critical moments or milestones the rep must hit?

- Do you have existing talk tracks, call scripts, or battle cards you want the AI to coach against?
  *(If yes, please share — these can be embedded directly into the AI's coaching context)*

---

## 6. Simulation Scripts

> *RepReady includes a simulation mode where reps can practice against scripted prospect personas without a live call.*

- What prospect personas or objection scenarios do you most want to train against?
  *(e.g., "skeptical IT buyer," "champion who can't get budget," "prospect evaluating a competitor")*

- What are the 3–5 most common objections your reps encounter and struggle with?

---

## 7. Team & Session Setup

- What should reps be asked to configure before each session?
  *(Currently: rep name, call type, coaching priorities, optional talk track notes)*

- Should managers be able to create pre-set coaching profiles that reps just select?
  *(rather than configuring each session manually)*

- Should session recordings and scorecards be saved and accessible to managers, or rep-only?

---

## 8. Integration Surface

- Do your reps primarily use **Microsoft Teams** for customer calls?
- Are there other platforms in use? *(Zoom, Google Meet, Gong, Outreach, Salesforce)*
- Is there a CRM the scorecard data should feed into?
- Who owns the IT/admin relationship for any Microsoft 365 or Azure AD setup?
