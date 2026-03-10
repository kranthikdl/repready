import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, AlertCircle, Lightbulb } from "lucide-react";
import type { CoachingPrompt } from "@shared/schema";
import { categoryLabels } from "@shared/schema";

interface CoachingPanelProps {
  prompts: CoachingPrompt[];
  activePrompt: CoachingPrompt | null;
}

function formatSessionTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "high":
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    case "medium":
      return <AlertTriangle className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
    default:
      return <Info className="w-4 h-4 text-muted-foreground" />;
  }
}

function severityColor(severity: string) {
  switch (severity) {
    case "high":
      return "destructive" as const;
    case "medium":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
}

export default function CoachingPanel({ prompts, activePrompt }: CoachingPanelProps) {
  const pastPrompts = activePrompt
    ? prompts.filter((p) => p.id !== activePrompt.id)
    : prompts;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-1 px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">Coaching</h2>
        <Badge variant="secondary" className="text-xs no-default-active-elevate">
          {prompts.length} prompts
        </Badge>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {activePrompt && (
          <div
            data-testid={`coaching-active-${activePrompt.id}`}
            className={`mx-3 mt-3 p-3 rounded-md border-2 ${
              activePrompt.severity === "high"
                ? "border-destructive/40 bg-destructive/5"
                : activePrompt.severity === "medium"
                ? "border-yellow-500/30 bg-yellow-500/5 dark:border-yellow-400/30 dark:bg-yellow-400/5"
                : "border-primary/20 bg-primary/5"
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <Lightbulb className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-semibold">{activePrompt.title}</span>
                  <Badge variant={severityColor(activePrompt.severity)} className="text-xs no-default-active-elevate">
                    {activePrompt.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{activePrompt.message}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs no-default-active-elevate">
                    {categoryLabels[activePrompt.category]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatSessionTime(activePrompt.sessionTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!activePrompt && prompts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4" data-testid="text-coaching-empty">
            <Lightbulb className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground text-center">
              Coaching prompts will appear here as the conversation progresses
            </p>
          </div>
        )}

        <ScrollArea className="flex-1 px-3 py-2">
          <div className="space-y-2">
            {pastPrompts.map((prompt) => (
              <div
                key={prompt.id}
                data-testid={`coaching-prompt-${prompt.id}`}
                className="p-2.5 rounded-md bg-muted/30"
              >
                <div className="flex items-start gap-2">
                  <SeverityIcon severity={prompt.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{prompt.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatSessionTime(prompt.sessionTime)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{prompt.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
