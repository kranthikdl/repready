import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Monitor, Wifi, FileText, Users } from "lucide-react";
import type { TeamsStatusInfo } from "@shared/schema";

interface TeamsStatusCardProps {
  status: TeamsStatusInfo;
  compact?: boolean;
}

function StatusDot({ ok }: { ok: boolean | "partial" }) {
  if (ok === "partial") {
    return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />;
  }
  return ok ? (
    <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
  ) : (
    <XCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
  );
}

function sdkLabel(s: string) {
  switch (s) {
    case "loaded": return "Loaded";
    case "loading": return "Loading...";
    case "failed": return "Not Available";
    default: return "Not Loaded";
  }
}

function contextLabel(s: string) {
  switch (s) {
    case "detected": return "Detected";
    case "demo_mode": return "Demo Context";
    case "not_in_teams": return "Not in Teams";
    default: return "Unknown";
  }
}

function transcriptLabel(s: string) {
  switch (s) {
    case "demo_injection": return "Demo Injection";
    case "scaffolded": return "Scaffolded (needs Graph API)";
    default: return "Unavailable";
  }
}

export default function TeamsStatusCard({ status, compact }: TeamsStatusCardProps) {
  const sdkOk = status.sdkStatus === "loaded";
  const ctxOk = status.contextStatus === "detected" || status.contextStatus === "demo_mode";
  const txOk = status.transcriptStatus === "demo_injection" ? "partial" as const : status.transcriptStatus === "scaffolded" ? "partial" as const : false;

  if (compact) {
    return (
      <div className="space-y-2" data-testid="teams-status-compact">
        <div className="flex items-center gap-2">
          <StatusDot ok={sdkOk} />
          <span className="text-xs">SDK: {sdkLabel(status.sdkStatus)}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot ok={ctxOk} />
          <span className="text-xs">Context: {contextLabel(status.contextStatus)}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot ok={txOk} />
          <span className="text-xs">Transcript: {transcriptLabel(status.transcriptStatus)}</span>
        </div>
        {status.context && (
          <div className="mt-2 space-y-1">
            {status.context.meetingTitle && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">{status.context.meetingTitle}</span>
              </div>
            )}
            {status.context.userDisplayName && (
              <span className="text-xs text-muted-foreground block">{status.context.userDisplayName}</span>
            )}
            {status.context.demoContext && (
              <Badge variant="secondary" className="text-xs no-default-active-elevate mt-1">Demo</Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card data-testid="teams-status-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Monitor className="w-4 h-4" />
          Teams Integration Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusDot ok={sdkOk} />
            <span className="text-sm">Teams SDK</span>
          </div>
          <Badge variant={sdkOk ? "default" : "secondary"} className="text-xs no-default-active-elevate">
            {sdkLabel(status.sdkStatus)}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusDot ok={ctxOk} />
            <span className="text-sm">Meeting Context</span>
          </div>
          <Badge variant={ctxOk ? "default" : "secondary"} className="text-xs no-default-active-elevate">
            {contextLabel(status.contextStatus)}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusDot ok={txOk} />
            <span className="text-sm">Transcript Source</span>
          </div>
          <Badge variant={txOk ? "secondary" : "secondary"} className="text-xs no-default-active-elevate">
            {transcriptLabel(status.transcriptStatus)}
          </Badge>
        </div>

        {status.context && (
          <div className="pt-2 border-t space-y-2">
            {status.context.meetingTitle && (
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{status.context.meetingTitle}</span>
              </div>
            )}
            {status.context.meetingId && (
              <div className="flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono truncate">{status.context.meetingId}</span>
              </div>
            )}
            {status.context.userDisplayName && (
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{status.context.userDisplayName}</span>
              </div>
            )}
            {status.context.demoContext && (
              <Badge variant="secondary" className="text-xs no-default-active-elevate">Demo Context</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
