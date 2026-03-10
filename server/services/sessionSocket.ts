import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { randomUUID } from "crypto";
import { sessionStorage } from "./storageService";
import { CoachingEngine } from "./coachingEngine";
import { getSimulationScript } from "./simulationService";
import { generateMockSummary } from "./summaryService";
import { generateSummaryWithLLM } from "./llmService";
import type { TranscriptChunk, SessionConfig } from "@shared/schema";
import { sessionConfigSchema } from "@shared/schema";
import { log } from "../index";

interface ActiveSession {
  sessionId: string;
  config: SessionConfig;
  coachingEngine: CoachingEngine;
  simulationTimer: ReturnType<typeof setTimeout> | null;
  simulationIndex: number;
  ws: WebSocket;
}

const activeSessions = new Map<string, ActiveSession>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

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
            const summary = generateMockSummary(
              session.transcript,
              session.coachingPrompts,
              active.config
            );
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
      const session = sessionStorage.createSession(config);
      const coachingEngine = new CoachingEngine();

      const active: ActiveSession = {
        sessionId: session.id,
        config,
        coachingEngine,
        simulationTimer: null,
        simulationIndex: 0,
        ws,
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
      }

      return session.id;
    }

    case "transcript_chunk": {
      if (!currentSessionId) return null;
      const active = activeSessions.get(currentSessionId);
      if (!active) return null;

      const session = sessionStorage.getSession(currentSessionId);
      if (!session) return null;

      const chunk: TranscriptChunk = {
        id: randomUUID(),
        speaker: message.speaker || "rep",
        text: message.text,
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
      if (process.env.OPENAI_API_KEY) {
        log("Generating LLM summary...", "coaching");
        summary = await generateSummaryWithLLM(
          session.transcript,
          session.coachingPrompts.map((p) => ({
            category: p.category,
            title: p.title,
            severity: p.severity,
            reason: p.reason,
          })),
          active.config
        );
      }

      if (!summary) {
        log("Using fallback mock summary", "coaching");
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
      session.startedAt
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

function stopSimulation(sessionId: string) {
  const active = activeSessions.get(sessionId);
  if (active?.simulationTimer) {
    clearTimeout(active.simulationTimer);
    active.simulationTimer = null;
  }
}
