import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Zap, Clock, User, Phone, Download } from "lucide-react";
import Scorecard from "@/components/Scorecard";
import SummaryView from "@/components/SummaryView";
import TranscriptPanel from "@/components/TranscriptPanel";
import CoachingPanel from "@/components/CoachingPanel";
import type { Session } from "@shared/schema";
import { callTypeLabels, priorityLabels } from "@shared/schema";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default function SessionReview() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: session, isLoading } = useQuery<Session>({
    queryKey: ["/api/sessions", id],
  });

  const handleExport = () => {
    if (!session) return;
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repready-session-${session.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Session not found</p>
          <Button onClick={() => navigate("/")} data-testid="button-back-home">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Session Review</span>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport} data-testid="button-export">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export JSON
        </Button>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-review-title">
              {session.config.sdrName}'s {callTypeLabels[session.config.callType]}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {session.duration ? formatDuration(session.duration) : "N/A"}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                {session.config.sdrName}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                {callTypeLabels[session.config.callType]}
              </div>
              {session.config.coachingPriorities.map((p) => (
                <Badge key={p} variant="secondary" className="text-xs no-default-active-elevate">
                  {priorityLabels[p]}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
                <TabsTrigger value="transcript" data-testid="tab-transcript">Transcript</TabsTrigger>
                <TabsTrigger value="coaching" data-testid="tab-coaching">Coaching Log</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="mt-4">
                {session.summary ? (
                  <SummaryView summary={session.summary} />
                ) : (
                  <p className="text-muted-foreground text-sm">No summary available</p>
                )}
              </TabsContent>
              <TabsContent value="transcript" className="mt-4">
                <Card>
                  <div className="h-[500px]">
                    <TranscriptPanel chunks={session.transcript} />
                  </div>
                </Card>
              </TabsContent>
              <TabsContent value="coaching" className="mt-4">
                <Card>
                  <div className="h-[500px]">
                    <CoachingPanel prompts={session.coachingPrompts} activePrompt={null} />
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Readiness Scorecard</CardTitle>
              </CardHeader>
              <CardContent>
                {session.summary ? (
                  <Scorecard scorecard={session.summary.scorecard} />
                ) : (
                  <p className="text-muted-foreground text-sm">No scorecard available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
