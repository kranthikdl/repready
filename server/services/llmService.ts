import OpenAI from "openai";
import { toFile } from "openai";
import type { TranscriptChunk, CoachingPriority, SessionConfig, SessionSummary, PromptCategory, Severity } from "@shared/schema";
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
    });
    return response.text?.trim() ?? "";
  } catch (err) {
    log(`Whisper transcription error: ${err}`, "llm");
    return null;
  }
}

export async function evaluateCoachingWithLLM(
  recentTranscript: TranscriptChunk[],
  candidateCategory: PromptCategory,
  candidateReason: string,
  config: SessionConfig
): Promise<LLMCoachingResult | null> {
  try {
    const transcriptText = recentTranscript
      .slice(-8)
      .map((c) => `[${c.speaker === "rep" ? "Rep" : "Prospect"}]: ${c.text}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a real-time sales coaching AI. You evaluate whether a coaching prompt should fire during a live SDR call.

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
  config: SessionConfig
): Promise<SessionSummary | null> {
  try {
    const transcriptText = transcript
      .map((c) => `[${c.speaker === "rep" ? "Rep" : "Prospect"}]: ${c.text}`)
      .join("\n");

    const promptsSummary = firedPrompts.length > 0
      ? firedPrompts.map((p) => `- [${p.severity}] ${p.category}: ${p.title}${p.reason ? ` (${p.reason})` : ""}`).join("\n")
      : "No coaching prompts were fired during the call.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a sales coaching analyst. Given a complete call transcript and the coaching prompts that fired during the call, generate a structured post-call summary and readiness scorecard.

Scoring guidelines (0-100):
- 90+: Exceptional, almost no issues
- 75-89: Strong performance with minor areas to improve
- 60-74: Developing, several areas need attention
- 40-59: Needs significant improvement
- Below 40: Critical gaps in this area

Be honest but constructive. Each "whatWentWell" and "missedOpportunities" item should be ONE specific, concrete sentence. Recommended actions should be actionable and specific.

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
