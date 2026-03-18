import type { Session, SessionConfig, TranscriptChunk, CoachingPrompt, SessionSummary, CoachingProfile } from "@shared/schema";
import { defaultCoachingProfile } from "@shared/schema";
import { randomUUID } from "crypto";

class SessionStorage {
  private sessions: Map<string, Session> = new Map();
  private coachingProfile: CoachingProfile = { ...defaultCoachingProfile };

  createSession(config: SessionConfig): Session {
    const session: Session = {
      id: randomUUID(),
      config,
      transcript: [],
      coachingPrompts: [],
      summary: null,
      status: "active",
      startedAt: Date.now(),
      endedAt: null,
      duration: null,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.startedAt - a.startedAt
    );
  }

  addTranscriptChunk(sessionId: string, chunk: TranscriptChunk): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.transcript.push(chunk);
    }
  }

  addCoachingPrompt(sessionId: string, prompt: CoachingPrompt): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.coachingPrompts.push(prompt);
    }
  }

  endSession(sessionId: string, summary: SessionSummary): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "completed";
      session.endedAt = Date.now();
      session.duration = session.endedAt - session.startedAt;
      session.summary = summary;
    }
    return session;
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  getCoachingProfile(): CoachingProfile {
    return this.coachingProfile;
  }

  setCoachingProfile(profile: CoachingProfile): CoachingProfile {
    this.coachingProfile = profile;
    return this.coachingProfile;
  }
}

export const sessionStorage = new SessionStorage();
