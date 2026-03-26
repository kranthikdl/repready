import OpenAI from "openai";
import { toFile } from "openai";
import type { TranscriptChunk, CoachingPriority, SessionConfig, SessionSummary, PromptCategory, Severity, CoachingProfile } from "@shared/schema";
import { log } from "../index";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface LLMCoachingResult {
  firePrompt: boolean;
  category: PromptCategory;
  title: string;
  message: string;
  severity: Severity;
  reason: string;
}

const WHISPER_HALLUCINATION_PATTERNS = [
  /^\.+$/,                          // lone periods
  /thank(s)? for watching/i,
  /like and subscribe/i,
  /please subscribe/i,
  /subs by\s/i,
  /subtitles by/i,
  /www\.\S+\.(com|co|uk|net|org)/i, // bare URLs
  /\.(co\.uk|com|net|org)\s*$/i,
  /^\s*\[.*\]\s*$/,                 // "[music]" "[applause]" etc.
  /amara\.org/i,
];

function isHallucination(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 3) return true;
  if (/^[.\s,!?…\-–—]+$/.test(t)) return true; // punctuation-only
  return WHISPER_HALLUCINATION_PATTERNS.some((p) => p.test(t));
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string | null> {
  try {
    const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm";
    const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType });
    const response = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
      language: "en",
      prompt: "Business sales call between an SDR and a prospect. Direct conversation only.",
    });
    const text = response.text?.trim() ?? "";
    if (isHallucination(text)) {
      log(`Whisper hallucination filtered: "${text.slice(0, 60)}"`, "llm");
      return "";
    }
    return text;
  } catch (err) {
    log(`Whisper transcription error: ${err}`, "llm");
    return null;
  }
}

function buildMethodologyContext(profile?: CoachingProfile): string {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.methodology?.trim()) {
    parts.push(`Coaching methodology: ${profile.methodology.trim()}`);
  }
  if (profile.customContext?.trim()) {
    parts.push(`Additional coaching context: ${profile.customContext.trim()}`);
  }
  if (profile.competitorNames?.length) {
    parts.push(`Key competitors to watch for: ${profile.competitorNames.filter(Boolean).join(", ")}`);
  }
  return parts.length ? `\n\n${parts.join("\n")}` : "";
}

export async function evaluateCoachingWithLLM(
  recentTranscript: TranscriptChunk[],
  candidateCategory: PromptCategory,
  candidateReason: string,
  config: SessionConfig,
  profile?: CoachingProfile
): Promise<LLMCoachingResult | null> {
  try {
    const transcriptText = recentTranscript
      .slice(-8)
      .map((c) => `[${c.speaker === "rep" ? "Rep" : "Prospect"}]: ${c.text}`)
      .join("\n");

    const methodologyContext = buildMethodologyContext(profile);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a real-time sales coaching AI. You evaluate whether a coaching prompt should fire during a live SDR call.${methodologyContext}

You receive:
- Recent transcript from the call
- A candidate coaching moment detected by rules
- The call type and coaching priorities

Your job: decide whether to fire a coaching prompt and generate a SHORT, actionable recommendation.

Rules:
- Only fire if the moment genuinely warrants coaching intervention
- Keep title under 8 words
- Keep message to ONE sentence, max 20 words
- Be specific to what just happened in the conversation
- Severity: "low" for minor suggestions, "medium" for clear missed opportunities, "high" for critical moments that could lose the deal
- If a coaching methodology is specified above, ensure your coaching advice aligns with it

Respond with JSON only:
{
  "firePrompt": boolean,
  "category": "missed_discovery" | "objection_risk" | "weak_next_step",
  "title": "short title",
  "message": "one-line coaching cue",
  "severity": "low" | "medium" | "high",
  "reason": "brief reason why this matters"
}`
        },
        {
          role: "user",
          content: `Call type: ${config.callType}
Coaching priorities: ${config.coachingPriorities.join(", ")}
${config.talkTrackNotes ? `Talk track notes: ${config.talkTrackNotes}` : ""}

Candidate moment detected:
- Category: ${candidateCategory}
- Reason: ${candidateReason}

Recent transcript:
${transcriptText}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as LLMCoachingResult;
    return parsed;
  } catch (err) {
    log(`LLM coaching evaluation error: ${err}`, "llm");
    return null;
  }
}

export async function generateSummaryWithLLM(
  transcript: TranscriptChunk[],
  firedPrompts: { category: string; title: string; severity: string; reason?: string }[],
  config: SessionConfig,
  profile?: CoachingProfile
): Promise<SessionSummary | null> {
  try {
    const transcriptText = transcript
      .map((c) => `[${c.speaker === "rep" ? "Rep" : "Prospect"}]: ${c.text}`)
      .join("\n");

    const promptsSummary = firedPrompts.length > 0
      ? firedPrompts.map((p) => `- [${p.severity}] ${p.category}: ${p.title}${p.reason ? ` (${p.reason})` : ""}`).join("\n")
      : "No coaching prompts were fired during the call.";

    const methodologyContext = buildMethodologyContext(profile);

    const labels = profile?.scorecardLabels;
    const discoveryLabel = labels?.discovery || "Discovery";
    const objectionLabel = labels?.objectionHandling || "Objection Handling";
    const nextStepLabel = labels?.nextStepDiscipline || "Next-Step Discipline";
    const overallLabel = labels?.overall || "Overall Readiness";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a sales coaching analyst. Given a complete call transcript and the coaching prompts that fired during the call, generate a structured post-call summary and readiness scorecard.${methodologyContext}

Scoring guidelines (0-100):
- 90+: Exceptional, almost no issues
- 75-89: Strong performance with minor areas to improve
- 60-74: Developing, several areas need attention
- 40-59: Needs significant improvement
- Below 40: Critical gaps in this area

${methodologyContext ? "Apply the coaching methodology specified above when evaluating performance and making recommendations." : ""}
Be honest but constructive. Each "whatWentWell" and "missedOpportunities" item should be ONE specific, concrete sentence. Recommended actions should be actionable and specific.

Scorecard dimensions for this team:
- ${discoveryLabel} (key: "discovery")
- ${objectionLabel} (key: "objectionHandling")
- ${nextStepLabel} (key: "nextStepDiscipline")
- ${overallLabel} (key: "overallReadiness")

Respond with JSON only:
{
  "callOverview": "2-3 sentence overview of the call",
  "whatWentWell": ["specific strength 1", "specific strength 2", ...],
  "missedOpportunities": ["specific miss 1", "specific miss 2", ...],
  "recommendedCoachingActions": ["specific action 1", "specific action 2", ...],
  "nextStepQualityAssessment": "1-2 sentence assessment of how well the rep established next steps",
  "scorecard": {
    "discovery": number,
    "objectionHandling": number,
    "nextStepDiscipline": number,
    "overallReadiness": number
  }
}`
        },
        {
          role: "user",
          content: `SDR: ${config.sdrName}
Call type: ${config.callType}
Coaching priorities: ${config.coachingPriorities.join(", ")}
${config.talkTrackNotes ? `Talk track notes: ${config.talkTrackNotes}` : ""}

Coaching prompts fired during call:
${promptsSummary}

Full transcript:
${transcriptText}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as SessionSummary;

    if (!parsed.scorecard || typeof parsed.scorecard.discovery !== "number") {
      return null;
    }

    return parsed;
  } catch (err) {
    log(`LLM summary generation error: ${err}`, "llm");
    return null;
  }
}
