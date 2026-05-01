import { describe, it, expect, vi, beforeEach } from "vitest";

const transcriptionsCreate = vi.fn();
const chatCompletionsCreate = vi.fn();

vi.mock("openai", () => {
  class OpenAI {
    audio = { transcriptions: { create: transcriptionsCreate } };
    chat = { completions: { create: chatCompletionsCreate } };
    constructor(_config: unknown) {}
  }
  return {
    default: OpenAI,
    toFile: vi.fn(async (buf: Buffer, name: string, opts: unknown) => ({
      buf,
      name,
      opts,
    })),
  };
});

vi.mock("../../index", () => ({
  log: vi.fn(),
}));

describe("llmService.transcribeAudio", () => {
  beforeEach(() => {
    transcriptionsCreate.mockReset();
    chatCompletionsCreate.mockReset();
  });

  it("returns transcribed text on success", async () => {
    transcriptionsCreate.mockResolvedValue({ text: "hello world from a real call" });
    const { transcribeAudio } = await import("../../services/llmService");
    const result = await transcribeAudio(Buffer.from("audio"), "audio/webm");
    expect(result).toBe("hello world from a real call");
    expect(transcriptionsCreate).toHaveBeenCalledTimes(1);
  });

  it("returns null when the OpenAI client throws", async () => {
    transcriptionsCreate.mockRejectedValue(new Error("network down"));
    const { transcribeAudio } = await import("../../services/llmService");
    const result = await transcribeAudio(Buffer.from("audio"), "audio/webm");
    expect(result).toBeNull();
  });

  it("filters whisper hallucinations to empty string", async () => {
    transcriptionsCreate.mockResolvedValue({ text: "thanks for watching" });
    const { transcribeAudio } = await import("../../services/llmService");
    const result = await transcribeAudio(Buffer.from("audio"), "audio/webm");
    expect(result).toBe("");
  });
});

describe("llmService.evaluateCoachingWithLLM", () => {
  beforeEach(() => {
    chatCompletionsCreate.mockReset();
  });

  it("returns parsed coaching result on success", async () => {
    const payload = {
      firePrompt: true,
      category: "missed_discovery",
      title: "Probe pain",
      message: "Ask why this matters now.",
      severity: "medium",
      reason: "rep skipped pain discovery",
    };
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    });
    const { evaluateCoachingWithLLM } = await import("../../services/llmService");
    const result = await evaluateCoachingWithLLM(
      [],
      "missed_discovery",
      "no pain discovery",
      { sdrName: "x", callType: "discovery", coachingPriorities: ["discovery_depth"], mode: "live" },
    );
    expect(result).toEqual(payload);
  });

  it("returns null when SDK throws", async () => {
    chatCompletionsCreate.mockRejectedValue(new Error("boom"));
    const { evaluateCoachingWithLLM } = await import("../../services/llmService");
    const result = await evaluateCoachingWithLLM(
      [],
      "missed_discovery",
      "no pain discovery",
      { sdrName: "x", callType: "discovery", coachingPriorities: ["discovery_depth"], mode: "live" },
    );
    expect(result).toBeNull();
  });
});
