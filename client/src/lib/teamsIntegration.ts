import * as microsoftTeams from "@microsoft/teams-js";
import type { TeamsContext, TeamsSDKStatus, TeamsContextStatus, TeamsTranscriptStatus, TeamsStatusInfo } from "@shared/schema";

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

    try {
      await microsoftTeams.app.initialize();
      this.sdkStatus = "loaded";
      this.notify();

      await this.detectContext();
    } catch (err) {
      this.sdkStatus = "failed";
      this.contextStatus = "not_in_teams";
      this.transcriptStatus = "unavailable";
      this.notify();
    }
  }

  private async detectContext(): Promise<void> {
    try {
      const context = await microsoftTeams.app.getContext();

      this.teamsContext = {
        meetingId: context.meeting?.id,
        meetingTitle: (context.page as any)?.subPageId || undefined,
        userDisplayName: context.user?.displayName,
        tenantId: context.user?.tenant?.id,
        conversationId: (context.chat as any)?.id || undefined,
        isInTeams: true,
        demoContext: false,
      };

      this.contextStatus = "detected";

      /*
       * Teams meeting transcript access requires:
       * - Microsoft Graph API permissions: OnlineMeetingTranscript.Read.All
       * - Azure AD app registration with proper consent
       * - The meeting must have transcription enabled
       * - Graph endpoint: GET /me/onlineMeetings/{meetingId}/transcripts
       *
       * This is not available in a standalone browser context.
       * The transcript status remains "scaffolded" to indicate the architecture
       * is ready but the actual Graph API integration requires proper Azure setup.
       */
      this.transcriptStatus = "scaffolded";
    } catch {
      this.contextStatus = "not_in_teams";
      this.transcriptStatus = "unavailable";
    }

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
   * Inject a transcript event manually (for demo/testing purposes).
   * In a production Teams integration, transcript events would come from:
   * - Microsoft Graph API subscription to meeting transcripts
   * - Teams Bot Framework media platform for real-time audio
   * - Teams meeting transcript webhook notifications
   *
   * Required Microsoft Graph permissions for real transcript access:
   * - OnlineMeetingTranscript.Read.All (application)
   * - OnlineMeetings.Read (delegated)
   *
   * Required Azure AD configuration:
   * - App registration in Azure portal
   * - Teams app manifest with proper RSC permissions
   * - Admin consent for tenant-wide transcript access
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
