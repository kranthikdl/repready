import { randomUUID } from "crypto";
import type { TranscriptChunk, CoachingPrompt, SessionConfig, CoachingProfile } from "@shared/schema";
import { evaluateRules } from "./rulesEngine";
import { evaluateCoachingWithLLM } from "./llmService";
import { log } from "../index";

interface CooldownState {
  lastPromptTime: number;
  recentCategories: Map<string, number>;
}

const COOLDOWN_MS = 8000;
const HIGH_SEVERITY_COOLDOWN_MS = 4000;
const CATEGORY_COOLDOWN_MS = 20000;

const mockCoachingResponses: Record<string, { title: string; message: string }[]> = {
  missed_discovery: [
    { title: "Dig deeper on pain", message: "Ask what's driving their urgency to solve this problem now." },
    { title: "Explore the impact", message: "Find out how this issue affects their team's day-to-day work." },
    { title: "Ask a diagnostic question", message: "Pause the pitch and ask what's slowing their team down today." },
    { title: "Uncover the root cause", message: "Ask why they haven't solved this problem before now." },
  ],
  objection_risk: [
    { title: "Acknowledge the concern", message: "Validate their hesitation before pivoting to value." },
    { title: "Reframe the objection", message: "Connect their concern back to the cost of inaction." },
    { title: "Quantify the gap", message: "Help them see the dollar impact of not changing." },
    { title: "Address competitive concern", message: "Differentiate on the specific capability they're questioning." },
  ],
  weak_next_step: [
    { title: "Lock in the next meeting", message: "Propose a specific date and time for the follow-up call." },
    { title: "Define a clear action item", message: "Ask who else needs to be involved and set a joint next step." },
    { title: "Create urgency", message: "Tie next steps to their timeline or upcoming deadlines." },
    { title: "Confirm commitment", message: "Ask directly: what needs to happen for us to move forward?" },
  ],
};

export class CoachingEngine {
  private cooldownState: CooldownState = {
    lastPromptTime: 0,
    recentCategories: new Map(),
  };
  private pendingLLMCall = false;

  async evaluateAndGenerate(
    transcript: TranscriptChunk[],
    config: SessionConfig,
    sessionStartTime: number,
    profile?: CoachingProfile
  ): Promise<CoachingPrompt | null> {
    const ruleCandidate = evaluateRules(
      transcript,
      config.coachingPriorities,
      profile?.hesitationPhrases ?? [],
      profile?.competitorNames ?? []
    );
    if (!ruleCandidate) return null;

    const now = Date.now();
    const cooldownMs =
      ruleCandidate.severity === "high" ? HIGH_SEVERITY_COOLDOWN_MS : COOLDOWN_MS;

    if (now - this.cooldownState.lastPromptTime < cooldownMs) {
      return null;
    }

    const lastCategoryTime = this.cooldownState.recentCategories.get(ruleCandidate.category);
    if (lastCategoryTime && now - lastCategoryTime < CATEGORY_COOLDOWN_MS) {
      return null;
    }

    if (this.pendingLLMCall) return null;

    let title: string;
    let message: string;
    let severity = ruleCandidate.severity;
    let reason = ruleCandidate.reason;
    let category = ruleCandidate.category;

    if (process.env.OPENAI_API_KEY) {
      this.pendingLLMCall = true;
      try {
        const llmResult = await evaluateCoachingWithLLM(
          transcript,
          ruleCandidate.category,
          ruleCandidate.reason,
          config,
          profile
        );

        if (llmResult && llmResult.firePrompt) {
          title = llmResult.title;
          message = llmResult.message;
          severity = llmResult.severity;
          reason = llmResult.reason;
          category = llmResult.category;
          log(`LLM coaching: "${title}" [${severity}]`, "coaching");
        } else if (llmResult && !llmResult.firePrompt) {
          this.pendingLLMCall = false;
          log("LLM decided not to fire prompt", "coaching");
          return null;
        } else {
          const responses = mockCoachingResponses[ruleCandidate.category] || [];
          const response = responses[Math.floor(Math.random() * responses.length)];
          title = response?.title || "Coaching moment detected";
          message = response?.message || "Consider adjusting your approach.";
          log("LLM unavailable, using fallback response", "coaching");
        }
      } catch (err) {
        const responses = mockCoachingResponses[ruleCandidate.category] || [];
        const response = responses[Math.floor(Math.random() * responses.length)];
        title = response?.title || "Coaching moment detected";
        message = response?.message || "Consider adjusting your approach.";
        log(`LLM error, using fallback: ${err}`, "coaching");
      } finally {
        this.pendingLLMCall = false;
      }
    } else {
      const responses = mockCoachingResponses[ruleCandidate.category] || [];
      const response = responses[Math.floor(Math.random() * responses.length)];
      title = response?.title || "Coaching moment detected";
      message = response?.message || "Consider adjusting your approach.";
    }

    const prompt: CoachingPrompt = {
      id: randomUUID(),
      category,
      title,
      message,
      severity,
      timestamp: Date.now(),
      sessionTime: Date.now() - sessionStartTime,
      reason,
    };

    this.cooldownState.lastPromptTime = Date.now();
    this.cooldownState.recentCategories.set(category, Date.now());

    return prompt;
  }

  reset() {
    this.cooldownState = {
      lastPromptTime: 0,
      recentCategories: new Map(),
    };
    this.pendingLLMCall = false;
  }
}
