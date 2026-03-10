import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { randomUUID } from "crypto";
import { sessionStorage } from "./storageService";
import { CoachingEngine } from "./coachingEngine";
import { getSimulationScript } from "./simulationService";
import { generateMockSummary } from "./summaryService";
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

      const prompt = active.coachingEngine.evaluateAndGenerate(
        session.transcript,
        active.config,
        session.startedAt
      );

      if (prompt) {
        sessionStorage.addCoachingPrompt(currentSessionId, prompt);
        ws.send(JSON.stringify({ type: "coaching_prompt", prompt }));
      }

      return null;
    }

    case "end_session": {
      if (!currentSessionId) return null;
      const active = activeSessions.get(currentSessionId);
      if (!active) return null;

      stopSimulation(currentSessionId);

      const session = sessionStorage.getSession(currentSessionId);
      if (!session) return null;

      const summary = generateMockSummary(
        session.transcript,
        session.coachingPrompts,
        active.config
      );

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

    const prompt = a.coachingEngine.evaluateAndGenerate(
      session.transcript,
      a.config,
      session.startedAt
    );

    if (prompt) {
      sessionStorage.addCoachingPrompt(sessionId, prompt);
      a.ws.send(JSON.stringify({ type: "coaching_prompt", prompt }));
    }

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
