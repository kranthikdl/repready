import { describe, it, expect } from "vitest";
import {
  callTypes,
  coachingPriorities,
  promptCategories,
  severityLevels,
  sessionModes,
  sessionConfigSchema,
  defaultScorecardLabels,
  defaultCoachingProfile,
  callTypeLabels,
  priorityLabels,
  categoryLabels,
} from "../schema";

describe("shared/schema constant tuples", () => {
  it("callTypes contains the documented call types", () => {
    expect(callTypes).toEqual([
      "discovery",
      "objection_handling",
      "qualification",
    ]);
  });

  it("coachingPriorities contains the documented priorities", () => {
    expect(coachingPriorities).toEqual([
      "discovery_depth",
      "objection_handling",
      "next_step_discipline",
    ]);
  });

  it("promptCategories contains the documented categories", () => {
    expect(promptCategories).toEqual([
      "missed_discovery",
      "objection_risk",
      "weak_next_step",
    ]);
  });

  it("severityLevels orders values from low to high", () => {
    expect(severityLevels).toEqual(["low", "medium", "high"]);
  });

  it("sessionModes contains every supported mode", () => {
    expect(sessionModes).toEqual([
      "simulation",
      "live",
      "guided",
      "teams",
    ]);
  });
});

describe("shared/schema label maps", () => {
  it("callTypeLabels maps every callType to a non-empty label", () => {
    for (const t of callTypes) {
      expect(callTypeLabels[t]).toBeTruthy();
      expect(typeof callTypeLabels[t]).toBe("string");
    }
  });

  it("priorityLabels maps every coachingPriority to a non-empty label", () => {
    for (const p of coachingPriorities) {
      expect(priorityLabels[p]).toBeTruthy();
      expect(typeof priorityLabels[p]).toBe("string");
    }
  });

  it("categoryLabels maps every promptCategory to a non-empty label", () => {
    for (const c of promptCategories) {
      expect(categoryLabels[c]).toBeTruthy();
      expect(typeof categoryLabels[c]).toBe("string");
    }
  });
});

describe("shared/schema defaults", () => {
  it("defaultScorecardLabels contains all four scorecard fields", () => {
    expect(defaultScorecardLabels).toEqual({
      discovery: "Discovery",
      objectionHandling: "Objection Handling",
      nextStepDiscipline: "Next-Step Discipline",
      overall: "Overall Readiness",
    });
  });

  it("defaultCoachingProfile starts with empty arrays and strings (edge case: blank profile)", () => {
    expect(defaultCoachingProfile.methodology).toBe("");
    expect(defaultCoachingProfile.customContext).toBe("");
    expect(defaultCoachingProfile.hesitationPhrases).toEqual([]);
    expect(defaultCoachingProfile.competitorNames).toEqual([]);
    expect(defaultCoachingProfile.scorecardLabels).toEqual(
      defaultScorecardLabels
    );
  });

  it("defaultCoachingProfile.scorecardLabels is a copy, not a shared reference", () => {
    expect(defaultCoachingProfile.scorecardLabels).not.toBe(
      defaultScorecardLabels
    );
  });
});

describe("shared/schema sessionConfigSchema (happy path)", () => {
  it("accepts a fully populated, valid simulation config", () => {
    const valid = {
      sdrName: "Alex",
      callType: "discovery" as const,
      coachingPriorities: ["discovery_depth" as const],
      talkTrackNotes: "Open with a curious tone.",
      mode: "simulation" as const,
    };
    const parsed = sessionConfigSchema.parse(valid);
    expect(parsed.sdrName).toBe("Alex");
    expect(parsed.coachingPriorities).toEqual(["discovery_depth"]);
  });

  it("accepts a teams-mode config with optional teamsContext", () => {
    const parsed = sessionConfigSchema.parse({
      sdrName: "Sam",
      callType: "qualification",
      coachingPriorities: ["next_step_discipline"],
      mode: "teams",
      teamsContext: {
        isInTeams: true,
        meetingTitle: "Pipeline review",
      },
    });
    expect(parsed.teamsContext?.isInTeams).toBe(true);
    expect(parsed.teamsContext?.meetingTitle).toBe("Pipeline review");
  });
});

describe("shared/schema sessionConfigSchema (edge cases)", () => {
  it("rejects an empty sdrName", () => {
    const result = sessionConfigSchema.safeParse({
      sdrName: "",
      callType: "discovery",
      coachingPriorities: ["discovery_depth"],
      mode: "simulation",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty coachingPriorities array", () => {
    const result = sessionConfigSchema.safeParse({
      sdrName: "Alex",
      callType: "discovery",
      coachingPriorities: [],
      mode: "simulation",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown callType value", () => {
    const result = sessionConfigSchema.safeParse({
      sdrName: "Alex",
      callType: "casual_chat",
      coachingPriorities: ["discovery_depth"],
      mode: "simulation",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown sessionMode value", () => {
    const result = sessionConfigSchema.safeParse({
      sdrName: "Alex",
      callType: "discovery",
      coachingPriorities: ["discovery_depth"],
      mode: "freestyle",
    });
    expect(result.success).toBe(false);
  });

  it("rejects null input", () => {
    const result = sessionConfigSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});
