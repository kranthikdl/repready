import type { TranscriptChunk, CoachingPriority, PromptCategory, Severity } from "@shared/schema";

interface RuleCandidate {
  category: PromptCategory;
  severity: Severity;
  reason: string;
  context: string;
}

const defaultHesitationPhrases = [
  "not sure", "i don't know", "maybe", "we'll see",
  "already using", "current vendor", "budget", "timing",
  "concerned", "worried", "expensive", "too much",
  "competitor", "alternative", "not ready", "need to think",
  "pushback", "not convinced", "risk", "complicated",
];

const commitmentPhrases = [
  "next step", "follow up", "schedule", "calendar",
  "send over", "set up", "let's plan", "commit",
  "decision", "move forward", "get started", "sign",
  "timeline", "deadline", "ready to",
];

const questionIndicators = ["?", "tell me", "how do", "what does", "can you explain", "walk me through", "what's your"];

function countRepConsecutiveWords(transcript: TranscriptChunk[], startIdx: number): number {
  let wordCount = 0;
  for (let i = startIdx; i >= 0; i--) {
    if (transcript[i].speaker === "rep") {
      wordCount += transcript[i].text.split(/\s+/).length;
    } else {
      break;
    }
  }
  return wordCount;
}

function hasRecentQuestion(transcript: TranscriptChunk[], windowSize: number): boolean {
  const recent = transcript.slice(-windowSize);
  return recent.some(
    (chunk) =>
      chunk.speaker === "rep" &&
      questionIndicators.some((q) => chunk.text.toLowerCase().includes(q))
  );
}

function detectHesitation(text: string, customPhrases: string[], competitorNames: string[]): string | null {
  const lower = text.toLowerCase();
  const allPhrases = [...defaultHesitationPhrases, ...customPhrases, ...competitorNames];
  for (const phrase of allPhrases) {
    if (phrase.trim() && lower.includes(phrase.toLowerCase())) {
      return phrase;
    }
  }
  return null;
}

function hasCommitmentLanguage(transcript: TranscriptChunk[], windowSize: number): boolean {
  const recent = transcript.slice(-windowSize);
  return recent.some((chunk) =>
    commitmentPhrases.some((p) => chunk.text.toLowerCase().includes(p))
  );
}

export function evaluateRules(
  transcript: TranscriptChunk[],
  priorities: CoachingPriority[],
  customHesitationPhrases: string[] = [],
  competitorNames: string[] = []
): RuleCandidate | null {
  if (transcript.length < 3) return null;

  const latest = transcript[transcript.length - 1];
  const latestIdx = transcript.length - 1;

  if (
    priorities.includes("objection_handling") &&
    latest.speaker === "prospect"
  ) {
    const hesitationMatch = detectHesitation(latest.text, customHesitationPhrases, competitorNames);
    if (hesitationMatch) {
      const isCompetitor = competitorNames.some(
        (c) => c.trim() && latest.text.toLowerCase().includes(c.toLowerCase())
      );
      return {
        category: "objection_risk",
        severity: isCompetitor ? "high" : "medium",
        reason: isCompetitor
          ? `Prospect mentioned competitor: "${hesitationMatch}"`
          : `Prospect used hesitation language: "${hesitationMatch}"`,
        context: latest.text,
      };
    }
  }

  if (
    priorities.includes("discovery_depth") &&
    latest.speaker === "rep"
  ) {
    const consecutiveWords = countRepConsecutiveWords(transcript, latestIdx);
    if (consecutiveWords > 80 && !hasRecentQuestion(transcript, 4)) {
      return {
        category: "missed_discovery",
        severity: "medium",
        reason: "Rep has been speaking for an extended period without asking a discovery question",
        context: latest.text,
      };
    }
  }

  if (
    priorities.includes("next_step_discipline") &&
    transcript.length > 12
  ) {
    const isNearEnd = transcript.length > 16;
    if (isNearEnd && !hasCommitmentLanguage(transcript, 6)) {
      return {
        category: "weak_next_step",
        severity: "high",
        reason: "Call is approaching end without clear commitment or next-step language",
        context: latest.text,
      };
    }
  }

  if (
    priorities.includes("discovery_depth") &&
    latest.speaker === "rep" &&
    transcript.length > 5
  ) {
    const recentRepChunks = transcript
      .slice(-6)
      .filter((c) => c.speaker === "rep");
    const hasQuestion = recentRepChunks.some((c) =>
      questionIndicators.some((q) => c.text.toLowerCase().includes(q))
    );
    if (!hasQuestion && recentRepChunks.length >= 3) {
      return {
        category: "missed_discovery",
        severity: "low",
        reason: "Rep hasn't asked a question in recent exchanges",
        context: latest.text,
      };
    }
  }

  return null;
}
