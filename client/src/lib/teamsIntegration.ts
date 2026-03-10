import type { TeamsContext, TeamsSDKStatus, TeamsContextStatus, TeamsTranscriptStatus, TeamsStatusInfo } from "@shared/schema";

/*
 * TeamsIntegrationService — Scaffolded Integration Surface
 *
 * This service provides the architecture for Microsoft Teams integration
 * without depending on the actual Teams JS SDK at runtime. The integration
 * is designed in progressive layers:
 *
 * Layer 1 (scaffolded here):
 *   - Teams mode as a session type
 *   - Demo context for architecture demonstration
 *   - Manual transcript injection pipeline
 *   - Status reporting UI
 *
 * Layer 2 (requires Microsoft setup):
 *   - Install @microsoft/teams-js SDK
 *   - Azure AD app registration
 *   - Teams app manifest for meeting side panel embedding
 *   - Replace initialize() stub with real SDK init: microsoftTeams.app.initialize()
 *   - Replace detectContext() stub with real context: microsoftTeams.app.getContext()
 *
 * Layer 3 (requires Graph API permissions):
 *   - OnlineMeetingTranscript.Read.All (application permission)
 *   - OnlineMeetings.Read (delegated permission)
 *   - Graph endpoint: GET /me/onlineMeetings/{meetingId}/transcripts
 *   - Admin consent for tenant-wide transcript access
 *   - Replace transcript stub with real Graph API subscription
 */

const DEMO_TEAMS_CONTEXT: TeamsContext = {
  meetingId: "demo-meeting-19:meeting_MjZhYjZiNj@thread.v2",
  meetingTitle: "Q3 Pipeline Review - Acme Corp",
  userDisplayName: "Demo User",
  tenantId: "demo-tenant-00000000-0000-0000-0000-000000000000",
  conversationId: "demo-conv-19:meeting@thread.v2",
  isInTeams: false,
  demoContext: true,
};

class TeamsIntegrationService {
  private sdkStatus: TeamsSDKStatus = "not_loaded";
  private contextStatus: TeamsContextStatus = "unknown";
  private transcriptStatus: TeamsTranscriptStatus = "unavailable";
  private teamsContext: TeamsContext | null = null;
  private listeners: Set<() => void> = new Set();
  private demoMode = false;

  getStatus(): TeamsStatusInfo {
    return {
      sdkStatus: this.sdkStatus,
      contextStatus: this.contextStatus,
      transcriptStatus: this.transcriptStatus,
      context: this.teamsContext,
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  async initialize(): Promise<void> {
    this.sdkStatus = "loading";
    this.notify();

    /*
     * SCAFFOLD: In a real Teams deployment, this would:
     *   1. Import @microsoft/teams-js dynamically
     *   2. Call microsoftTeams.app.initialize()
     *   3. Call microsoftTeams.app.getContext() to detect meeting context
     *
     * Since we're running standalone (no Teams SDK installed), we report
     * "not in Teams" and allow demo mode for architecture demonstration.
     */
    await new Promise((r) => setTimeout(r, 300));

    this.sdkStatus = "failed";
    this.contextStatus = "not_in_teams";
    this.transcriptStatus = "unavailable";
    this.notify();
  }

  enableDemoMode(): void {
    this.demoMode = true;
    this.sdkStatus = "loaded";
    this.contextStatus = "demo_mode";
    this.transcriptStatus = "demo_injection";
    this.teamsContext = { ...DEMO_TEAMS_CONTEXT };
    this.notify();
  }

  disableDemoMode(): void {
    this.demoMode = false;
    this.sdkStatus = "not_loaded";
    this.contextStatus = "unknown";
    this.transcriptStatus = "unavailable";
    this.teamsContext = null;
    this.notify();
  }

  isDemoMode(): boolean {
    return this.demoMode;
  }

  getContext(): TeamsContext | null {
    return this.teamsContext;
  }

  /*
   * Inject a transcript event manually (for demo/testing).
   *
   * In a production Teams integration, transcript events would come from:
   * - Microsoft Graph API subscription to meeting transcripts
   * - Teams Bot Framework media platform for real-time audio
   * - Teams meeting transcript webhook notifications
   */
  injectTranscriptEvent(
    text: string,
    speaker: "rep" | "prospect"
  ): { text: string; speaker: "rep" | "prospect"; timestamp: number; isFinal: boolean } {
    return {
      text,
      speaker,
      timestamp: Date.now(),
      isFinal: true,
    };
  }
}

export const teamsService = new TeamsIntegrationService();
