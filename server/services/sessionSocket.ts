import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { randomUUID } from "crypto";
import { sessionStorage } from "./storageService";
import { CoachingEngine } from "./coachingEngine";
import { getSimulationScript, getGuidedScript } from "./simulationService";
import { generateMockSummary } from "./summaryService";
import { generateSummaryWithLLM } from "./llmService";
import type { TranscriptChunk, SessionConfig, CoachingProfile } from "@shared/schema";
import { sessionConfigSchema } from "@shared/schema";
import { log } from "../index";

// ─── Guided demo silence-detection constants ────────────────────────────────
const GUIDED_SILENCE_THRESHOLD_MS = 4500;   // must exceed 2s Whisper chunk cycle + natural sentence gaps
const GUIDED_REACTION_DELAY_MS    = 1000;   // natural pause before prospect fires
const GUIDED_MAX_WAIT_MS          = 20000;  // safety: fire anyway if SDR never starts speaking
const GUIDED_MAX_TURN_MS          = 60000;  // absolute ceiling per turn

// ─── Junk transcript filter constants ───────────────────────────────────────
const JUNK_MIN_WORD_COUNT = 4;
const JUNK_HALLUCINATION_PHRASES: string[] = [
  "the end",
  "thanks for watching",
  "thank you for watching",
  "subscribe",
  "like and subscribe",
  "please subscribe",
];

function isJunkTranscript(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed === ".") return true;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < JUNK_MIN_WORD_COUNT) return true;
  const lower = trimmed.toLowerCase();
  for (const phrase of JUNK_HALLUCINATION_PHRASES) {
    if (lower === phrase) return true;
  }
  return false;
}

interface ActiveSession {
  sessionId: string;
  config: SessionConfig;
  profile: CoachingProfile;
  coachingEngine: CoachingEngine;
  simulationTimer: ReturnType<typeof setTimeout> | null;
  simulationIndex: number;
  ws: WebSocket;
  // guided-demo silence detection
  lastSpeechAt: number | null;
  silenceCheckInterval: ReturnType<typeof setInterval> | null;
  maxWaitTimer: ReturnType<typeof setTimeout> | null;
  waitingForSilence: boolean;
}

const activeSessions = new Map<string, ActiveSession>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const pathname = req.url ? new URL(req.url, "http://localhost").pathname : "";
    if (pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  wss.on("connection", (ws) => {
    log("WebSocket client connected", "ws");
    let currentSessionId: string | null = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message, currentSessionId).then((newId) => {
          if (newId) currentSessionId = newId;
        });
      } catch (err) {
        log(`WebSocket message error: ${err}`, "ws");
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      }
    });

    ws.on("close", () => {
      log("WebSocket client disconnected", "ws");
      if (currentSessionId) {
        stopSimulation(currentSessionId);
        const active = activeSessions.get(currentSessionId);
        if (active) {
          const session = sessionStorage.getSession(currentSessionId);
          if (session && session.status === "active") {
            let summary;
            if (session.transcript.length === 0) {
              log("Empty transcript on disconnect — using no-transcript summary", "ws");
              summary = {
                callOverview: "No transcript captured — session too short to score.",
                whatWentWell: [],
                missedOpportunities: [],
                recommendedCoachingActions: ["Record a session with more transcript data to receive coaching feedback."],
                nextStepQualityAssessment: "No transcript was captured during this session.",
                scorecard: {
                  discovery: 0,
                  objectionHandling: 0,
                  nextStepDiscipline: 0,
                  overallReadiness: 0,
                },
              };
            } else {
              summary = generateMockSummary(
                session.transcript,
                session.coachingPrompts,
                active.config
              );
            }
            sessionStorage.endSession(currentSessionId, summary);
            log(`Session auto-ended on disconnect: ${currentSessionId}`, "ws");
          }
          activeSessions.delete(currentSessionId);
        }
      }
    });
  });

  log("WebSocket server initialized on /ws", "ws");
}

async function handleMessage(
  ws: WebSocket,
  message: any,
  currentSessionId: string | null
): Promise<string | null> {
  switch (message.type) {
    case "start_session": {
      const parseResult = sessionConfigSchema.safeParse(message.config);
      if (!parseResult.success) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid session config" }));
        return null;
      }
      const config = parseResult.data;
      const profile = sessionStorage.getCoachingProfile();
      const session = sessionStorage.createSession(config);
      const coachingEngine = new CoachingEngine();

      const active: ActiveSession = {
        sessionId: session.id,
        config,
        profile,
        coachingEngine,
        simulationTimer: null,
        simulationIndex: 0,
        ws,
        lastSpeechAt: null,
        silenceCheckInterval: null,
        maxWaitTimer: null,
        waitingForSilence: false,
      };
      activeSessions.set(session.id, active);

      ws.send(JSON.stringify({
        type: "session_started",
        sessionId: session.id,
        session,
      }));

      log(`Session started: ${session.id} (${config.mode})`, "ws");

      if (config.mode === "simulation") {
        startSimulation(session.id);
      } else if (config.mode === "guided") {
        startGuidedSimulation(session.id);
      }

      return session.id;
    }

    case "transcript_chunk": {
      if (!currentSessionId) return null;
      const active = activeSessions.get(currentSessionId);
      if (!active) return null;

      const session = sessionStorage.getSession(currentSessionId);
      if (!session) return null;

      const speaker = message.speaker || "rep";
      const text: string = message.text ?? "";

      // In guided mode, update silence tracker on any rep mic activity —
      // do this BEFORE junk filtering so real speech resets the timer even
      // when the chunk is too short to display.
      if (active.config.mode === "guided" && speaker === "rep" && active.waitingForSilence) {
        active.lastSpeechAt = Date.now();
        // First rep speech cancels the no-speech max-wait timer
        if (active.maxWaitTimer) {
          clearTimeout(active.maxWaitTimer);
          active.maxWaitTimer = null;
        }
      }

      // In guided mode, filter junk SDR transcript chunks before saving/displaying
      if (active.config.mode === "guided" && speaker === "rep" && isJunkTranscript(text)) {
        log(`Guided: dropped junk transcript chunk: "${text}"`, "ws");
        return null;
      }

      const chunk: TranscriptChunk = {
        id: randomUUID(),
        speaker,
        text,
        timestamp: Date.now(),
        sessionTime: Date.now() - session.startedAt,
      };

      sessionStorage.addTranscriptChunk(currentSessionId, chunk);
      ws.send(JSON.stringify({ type: "transcript_update", chunk }));

      evaluateCoachingAsync(active, session, currentSessionId);

      return null;
    }

    case "end_session": {
      if (!currentSessionId) return null;
      const active = activeSessions.get(currentSessionId);
      if (!active) return null;

      stopSimulation(currentSessionId);

      const session = sessionStorage.getSession(currentSessionId);
      if (!session) return null;

      ws.send(JSON.stringify({ type: "generating_summary" }));

      let summary = null;

      const MIN_SESSION_MS = 1 * 60 * 1000; // 1 minute minimum
      const sessionDuration = Date.now() - session.startedAt;
      const repChunks = session.transcript.filter((c) => c.speaker === "rep");
      const hasEnoughData = repChunks.length > 0 && sessionDuration >= MIN_SESSION_MS;

      if (!hasEnoughData) {
        log(`Insufficient data for scoring (${Math.round(sessionDuration / 1000)}s, ${session.transcript.length} chunks) — skipping summary generation`, "coaching");
        // summary stays null — UI will show "Not enough data to score"
      } else if (process.env.OPENAI_API_KEY) {
        log("Generating LLM summary...", "coaching");
        summary = await generateSummaryWithLLM(
          session.transcript,
          session.coachingPrompts.map((p) => ({
            category: p.category,
            title: p.title,
            severity: p.severity,
            reason: p.reason,
          })),
          active.config,
          active.profile
        );
        if (!summary) {
          log("Using fallback mock summary", "coaching");
          summary = generateMockSummary(
            session.transcript,
            session.coachingPrompts,
            active.config
          );
        }
      } else {
        log("Using fallback mock summary (no API key)", "coaching");
        summary = generateMockSummary(
          session.transcript,
          session.coachingPrompts,
          active.config
        );
      }

      const completed = sessionStorage.endSession(currentSessionId, summary);

      ws.send(JSON.stringify({
        type: "session_ended",
        session: completed,
        summary,
      }));

      activeSessions.delete(currentSessionId);
      log(`Session ended: ${currentSessionId}`, "ws");
      return null;
    }

    default:
      ws.send(JSON.stringify({ type: "error", message: `Unknown message type: ${message.type}` }));
      return null;
  }
}

async function evaluateCoachingAsync(
  active: ActiveSession,
  session: ReturnType<typeof sessionStorage.getSession> & {},
  sessionId: string
) {
  try {
    const prompt = await active.coachingEngine.evaluateAndGenerate(
      session.transcript,
      active.config,
      session.startedAt,
      active.profile
    );

    if (prompt) {
      sessionStorage.addCoachingPrompt(sessionId, prompt);
      if (active.ws.readyState === WebSocket.OPEN) {
        active.ws.send(JSON.stringify({ type: "coaching_prompt", prompt }));
      }
    }
  } catch (err) {
    log(`Coaching evaluation error: ${err}`, "coaching");
  }
}

function startSimulation(sessionId: string) {
  const active = activeSessions.get(sessionId);
  if (!active) return;

  const script = getSimulationScript(active.config.callType);

  function sendNextLine() {
    const a = activeSessions.get(sessionId);
    if (!a || a.simulationIndex >= script.length) return;

    const line = script[a.simulationIndex];
    const session = sessionStorage.getSession(sessionId);
    if (!session) return;

    const chunk: TranscriptChunk = {
      id: randomUUID(),
      speaker: line.speaker,
      text: line.text,
      timestamp: Date.now(),
      sessionTime: Date.now() - session.startedAt,
    };

    sessionStorage.addTranscriptChunk(sessionId, chunk);
    a.ws.send(JSON.stringify({ type: "transcript_update", chunk }));

    evaluateCoachingAsync(a, session, sessionId);

    a.simulationIndex++;

    if (a.simulationIndex < script.length) {
      const nextDelay = script[a.simulationIndex].delayMs;
      a.simulationTimer = setTimeout(sendNextLine, nextDelay);
    } else {
      a.ws.send(JSON.stringify({ type: "simulation_complete" }));
    }
  }

  const firstDelay = script[0]?.delayMs || 2000;
  active.simulationTimer = setTimeout(sendNextLine, firstDelay);
}

function startGuidedSimulation(sessionId: string) {
  const active = activeSessions.get(sessionId);
  if (!active) return;

  const script = getGuidedScript(active.config.callType);

  // Immediately start waiting for Alex's first turn to complete via silence detection.
  // The max-wait ensures the demo isn't stuck if Alex doesn't speak within 15s.
  startWaitingForSilence(sessionId, script);
}

function startWaitingForSilence(sessionId: string, script: { text: string; delayMs: number }[]) {
  const a = activeSessions.get(sessionId);
  if (!a) return;

  a.waitingForSilence = true;
  a.lastSpeechAt = null;

  // Poll every 200ms to check if silence threshold has been reached
  a.silenceCheckInterval = setInterval(() => {
    const current = activeSessions.get(sessionId);
    if (!current || !current.waitingForSilence) {
      clearInterval(a.silenceCheckInterval!);
      a.silenceCheckInterval = null;
      return;
    }

    if (current.lastSpeechAt !== null) {
      const silenceDuration = Date.now() - current.lastSpeechAt;
      if (silenceDuration >= GUIDED_SILENCE_THRESHOLD_MS) {
        // SDR has been silent long enough — fire with reaction delay
        clearInterval(current.silenceCheckInterval!);
        current.silenceCheckInterval = null;
        if (current.maxWaitTimer) {
          clearTimeout(current.maxWaitTimer);
          current.maxWaitTimer = null;
        }
        if (current.simulationTimer) {
          clearTimeout(current.simulationTimer);
          current.simulationTimer = null;
        }
        current.simulationTimer = setTimeout(() => {
          const idx = current.simulationIndex;
          log(`Guided: silence detected after ${silenceDuration}ms, firing prospect line ${idx}`, "ws");
          fireProspectLineDirect(sessionId, script);
        }, GUIDED_REACTION_DELAY_MS);
      }
    }
  }, 200);

  // No-speech safety: fire if SDR never starts speaking within max wait
  a.maxWaitTimer = setTimeout(() => {
    const current = activeSessions.get(sessionId);
    if (!current || !current.waitingForSilence) return;
    log(`Guided: no-speech max wait reached (${GUIDED_MAX_WAIT_MS}ms) — firing prospect line anyway`, "ws");
    if (current.silenceCheckInterval) {
      clearInterval(current.silenceCheckInterval);
      current.silenceCheckInterval = null;
    }
    current.maxWaitTimer = null;
    fireProspectLineDirect(sessionId, script);
  }, GUIDED_MAX_WAIT_MS);

  // Absolute ceiling: fire regardless of ongoing ASR activity (guards against persistent noise)
  a.simulationTimer = setTimeout(() => {
    const current = activeSessions.get(sessionId);
    if (!current || !current.waitingForSilence) return;
    log(`Guided: absolute turn ceiling reached (${GUIDED_MAX_TURN_MS}ms) — firing prospect line`, "ws");
    if (current.silenceCheckInterval) {
      clearInterval(current.silenceCheckInterval);
      current.silenceCheckInterval = null;
    }
    if (current.maxWaitTimer) {
      clearTimeout(current.maxWaitTimer);
      current.maxWaitTimer = null;
    }
    current.simulationTimer = null;
    fireProspectLineDirect(sessionId, script);
  }, GUIDED_MAX_TURN_MS);
}

function fireProspectLineDirect(sessionId: string, script: { text: string; delayMs: number }[]) {
  const a = activeSessions.get(sessionId);
  if (!a) return;

  // Guard: if already fired this turn (e.g. two timers race), bail out
  if (!a.waitingForSilence) return;

  // Clean up all pending timers/intervals for this turn
  if (a.silenceCheckInterval) {
    clearInterval(a.silenceCheckInterval);
    a.silenceCheckInterval = null;
  }
  if (a.maxWaitTimer) {
    clearTimeout(a.maxWaitTimer);
    a.maxWaitTimer = null;
  }
  if (a.simulationTimer) {
    clearTimeout(a.simulationTimer);
    a.simulationTimer = null;
  }

  a.waitingForSilence = false;
  a.lastSpeechAt = null;

  if (a.simulationIndex >= script.length) return;

  const line = script[a.simulationIndex];
  const session = sessionStorage.getSession(sessionId);
  if (!session) return;

  const chunk: TranscriptChunk = {
    id: randomUUID(),
    speaker: "prospect",
    text: line.text,
    timestamp: Date.now(),
    sessionTime: Date.now() - session.startedAt,
  };

  sessionStorage.addTranscriptChunk(sessionId, chunk);
  a.ws.send(JSON.stringify({ type: "transcript_update", chunk }));

  evaluateCoachingAsync(a, session, sessionId);

  a.simulationIndex++;

  if (a.simulationIndex < script.length) {
    startWaitingForSilence(sessionId, script);
  }
}

function stopSimulation(sessionId: string) {
  const active = activeSessions.get(sessionId);
  if (!active) return;
  if (active.simulationTimer) {
    clearTimeout(active.simulationTimer);
    active.simulationTimer = null;
  }
  if (active.silenceCheckInterval) {
    clearInterval(active.silenceCheckInterval);
    active.silenceCheckInterval = null;
  }
  if (active.maxWaitTimer) {
    clearTimeout(active.maxWaitTimer);
    active.maxWaitTimer = null;
  }
  active.waitingForSilence = false;
}
