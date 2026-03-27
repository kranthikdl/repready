import { z } from "zod";

export const callTypes = ["discovery", "objection_handling", "qualification"] as const;
export type CallType = typeof callTypes[number];

export const coachingPriorities = ["discovery_depth", "objection_handling", "next_step_discipline"] as const;
export type CoachingPriority = typeof coachingPriorities[number];

export const promptCategories = ["missed_discovery", "objection_risk", "weak_next_step"] as const;
export type PromptCategory = typeof promptCategories[number];

export const severityLevels = ["low", "medium", "high"] as const;
export type Severity = typeof severityLevels[number];

export const sessionModes = ["simulation", "live", "guided", "teams"] as const;
export type SessionMode = typeof sessionModes[number];

export const sessionConfigSchema = z.object({
  sdrName: z.string().min(1),
  callType: z.enum(callTypes),
  coachingPriorities: z.array(z.enum(coachingPriorities)).min(1),
  talkTrackNotes: z.string().optional(),
  mode: z.enum(sessionModes),
  teamsContext: z.object({
    meetingId: z.string().optional(),
    meetingTitle: z.string().optional(),
    userDisplayName: z.string().optional(),
    tenantId: z.string().optional(),
    conversationId: z.string().optional(),
    isInTeams: z.boolean(),
    demoContext: z.boolean().optional(),
  }).optional(),
});

export type SessionConfig = z.infer<typeof sessionConfigSchema>;

export interface TeamsContext {
  meetingId?: string;
  meetingTitle?: string;
  userDisplayName?: string;
  tenantId?: string;
  conversationId?: string;
  isInTeams: boolean;
  demoContext?: boolean;
}

export type TeamsSDKStatus = "not_loaded" | "loading" | "loaded" | "failed";
export type TeamsContextStatus = "unknown" | "detected" | "not_in_teams" | "demo_mode";
export type TeamsTranscriptStatus = "unavailable" | "scaffolded" | "demo_injection";

export interface TeamsStatusInfo {
  sdkStatus: TeamsSDKStatus;
  contextStatus: TeamsContextStatus;
  transcriptStatus: TeamsTranscriptStatus;
  context: TeamsContext | null;
}

export interface TranscriptChunk {
  id: string;
  speaker: "rep" | "prospect";
  text: string;
  timestamp: number;
  sessionTime: number;
}

export interface CoachingPrompt {
  id: string;
  category: PromptCategory;
  title: string;
  message: string;
  severity: Severity;
  timestamp: number;
  sessionTime: number;
  reason?: string;
}

export interface SessionScorecard {
  discovery: number;
  objectionHandling: number;
  nextStepDiscipline: number;
  overallReadiness: number;
}

export interface SessionSummary {
  callOverview: string;
  whatWentWell: string[];
  missedOpportunities: string[];
  recommendedCoachingActions: string[];
  nextStepQualityAssessment: string;
  scorecard: SessionScorecard;
}

export interface Session {
  id: string;
  config: SessionConfig;
  transcript: TranscriptChunk[];
  coachingPrompts: CoachingPrompt[];
  summary: SessionSummary | null;
  status: "active" | "completed";
  startedAt: number;
  endedAt: number | null;
  duration: number | null;
}

export interface ScorecardLabels {
  discovery: string;
  objectionHandling: string;
  nextStepDiscipline: string;
  overall: string;
}

export interface CoachingProfile {
  methodology: string;
  customContext: string;
  hesitationPhrases: string[];
  competitorNames: string[];
  scorecardLabels: ScorecardLabels;
}

export const defaultScorecardLabels: ScorecardLabels = {
  discovery: "Discovery",
  objectionHandling: "Objection Handling",
  nextStepDiscipline: "Next-Step Discipline",
  overall: "Overall Readiness",
};

export const defaultCoachingProfile: CoachingProfile = {
  methodology: "",
  customContext: "",
  hesitationPhrases: [],
  competitorNames: [],
  scorecardLabels: { ...defaultScorecardLabels },
};

export const callTypeLabels: Record<CallType, string> = {
  discovery: "Discovery Call",
  objection_handling: "Objection Handling",
  qualification: "Qualification Call",
};

export const priorityLabels: Record<CoachingPriority, string> = {
  discovery_depth: "Discovery Depth",
  objection_handling: "Objection Handling",
  next_step_discipline: "Next-Step Discipline",
};

export const categoryLabels: Record<PromptCategory, string> = {
  missed_discovery: "Missed Discovery",
  objection_risk: "Objection Risk",
  weak_next_step: "Weak Next Step",
};
