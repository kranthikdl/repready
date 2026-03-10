import type { TranscriptChunk, CoachingPrompt, SessionConfig, SessionSummary } from "@shared/schema";

export function generateMockSummary(
  transcript: TranscriptChunk[],
  prompts: CoachingPrompt[],
  config: SessionConfig
): SessionSummary {
  const totalChunks = transcript.length;
  const repChunks = transcript.filter((c) => c.speaker === "rep");
  const prospectChunks = transcript.filter((c) => c.speaker === "prospect");

  const repWordCount = repChunks.reduce((sum, c) => sum + c.text.split(/\s+/).length, 0);
  const prospectWordCount = prospectChunks.reduce((sum, c) => sum + c.text.split(/\s+/).length, 0);
  const talkRatio = repWordCount / (repWordCount + prospectWordCount || 1);

  const highPrompts = prompts.filter((p) => p.severity === "high").length;
  const mediumPrompts = prompts.filter((p) => p.severity === "medium").length;
  const discoveryPrompts = prompts.filter((p) => p.category === "missed_discovery").length;
  const objectionPrompts = prompts.filter((p) => p.category === "objection_risk").length;
  const nextStepPrompts = prompts.filter((p) => p.category === "weak_next_step").length;

  const discoveryScore = Math.max(30, Math.min(95, 85 - discoveryPrompts * 12 - (talkRatio > 0.65 ? 15 : 0)));
  const objectionScore = Math.max(30, Math.min(95, 80 - objectionPrompts * 10 - highPrompts * 5));
  const nextStepScore = Math.max(30, Math.min(95, 75 - nextStepPrompts * 15));
  const overallScore = Math.round((discoveryScore + objectionScore + nextStepScore) / 3);

  const questionCount = repChunks.filter((c) => c.text.includes("?")).length;

  const wellPoints: string[] = [];
  const missedPoints: string[] = [];
  const actions: string[] = [];

  if (talkRatio < 0.55) {
    wellPoints.push("Good talk-to-listen ratio - prospect spoke more than the rep");
  } else if (talkRatio < 0.65) {
    wellPoints.push("Reasonable talk-to-listen ratio");
  } else {
    missedPoints.push("Rep dominated the conversation - aim for a more balanced dialogue");
    actions.push("Practice active listening and reduce talk time to under 55%");
  }

  if (questionCount >= 4) {
    wellPoints.push(`Asked ${questionCount} questions throughout the call, showing good discovery technique`);
  } else {
    missedPoints.push("Limited questions asked during the call");
    actions.push("Prepare 5-7 open-ended discovery questions before each call");
  }

  if (discoveryPrompts === 0) {
    wellPoints.push("Maintained strong discovery rhythm without missing key moments");
  } else {
    missedPoints.push(`${discoveryPrompts} missed discovery opportunity${discoveryPrompts > 1 ? "s" : ""} detected`);
    actions.push("When prospect shares a pain point, follow up with 'Tell me more about that' before presenting solutions");
  }

  if (objectionPrompts > 0) {
    missedPoints.push("Prospect showed signs of hesitation that could have been addressed more directly");
    actions.push("Use the 'Acknowledge, Reframe, Evidence' framework when prospect expresses doubt");
  } else {
    wellPoints.push("No unaddressed objection signals detected");
  }

  if (nextStepPrompts === 0) {
    wellPoints.push("Set a clear next step before ending the call");
  } else {
    missedPoints.push("Call ended without a firmly committed next step");
    actions.push("Always propose a specific date, time, and agenda for the next meeting");
  }

  if (totalChunks > 15) {
    wellPoints.push("Call had good depth of conversation");
  }

  const callTypeDesc = config.callType === "discovery"
    ? "discovery call"
    : config.callType === "objection_handling"
    ? "objection handling session"
    : "qualification call";

  return {
    callOverview: `${config.sdrName} conducted a ${callTypeDesc} with ${totalChunks} exchanges over the session. The rep spoke approximately ${Math.round(talkRatio * 100)}% of the time and asked ${questionCount} questions. ${prompts.length} coaching moment${prompts.length !== 1 ? "s" : ""} were flagged during the call.`,
    whatWentWell: wellPoints.length > 0 ? wellPoints : ["Call was completed successfully"],
    missedOpportunities: missedPoints.length > 0 ? missedPoints : ["No significant missed opportunities identified"],
    recommendedCoachingActions: actions.length > 0 ? actions : ["Continue with current approach and practice consistently"],
    nextStepQualityAssessment:
      nextStepPrompts === 0
        ? "Strong next step was established with a clear action item and timeline."
        : "Next step was weak or unclear. The call would have benefited from a specific commitment to a date, time, and agenda for the follow-up.",
    scorecard: {
      discovery: Math.round(discoveryScore),
      objectionHandling: Math.round(objectionScore),
      nextStepDiscipline: Math.round(nextStepScore),
      overallReadiness: overallScore,
    },
  };
}
