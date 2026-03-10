import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Clock, User, Phone, ArrowRight, Trash2, Plus, History } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Session } from "@shared/schema";
import { callTypeLabels, priorityLabels } from "@shared/schema";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-destructive";
}

export default function PreviousSessions() {
  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });

  const completedSessions = sessions?.filter((s) => s.status === "completed") || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm" data-testid="text-header-title">RepReady</span>
            </div>
          </Link>
        </div>
        <Link href="/">
          <Button size="sm" data-testid="button-new-session">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Session
          </Button>
        </Link>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-bold" data-testid="text-page-title">Previous Sessions</h1>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {!isLoading && completedSessions.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <History className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm mb-4" data-testid="text-no-sessions">
                No completed sessions yet
              </p>
              <Link href="/">
                <Button size="sm" data-testid="button-start-first">
                  Start your first session
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {completedSessions.map((session) => (
            <Card key={session.id} className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-medium text-sm" data-testid={`text-session-name-${session.id}`}>
                        {session.config.sdrName}
                      </span>
                      <Badge variant="secondary" className="text-xs no-default-active-elevate">
                        {callTypeLabels[session.config.callType]}
                      </Badge>
                      {session.summary && (
                        <span className={`text-sm font-semibold ${scoreColor(session.summary.scorecard.overallReadiness)}`}>
                          {session.summary.scorecard.overallReadiness}/100
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(session.startedAt)}
                      </span>
                      {session.duration && (
                        <span>{formatDuration(session.duration)}</span>
                      )}
                      <span>{session.transcript.length} exchanges</span>
                      <span>{session.coachingPrompts.length} prompts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteMutation.mutate(session.id);
                      }}
                      data-testid={`button-delete-${session.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Link href={`/review/${session.id}`}>
                      <Button variant="secondary" size="sm" data-testid={`button-review-${session.id}`}>
                        Review
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
