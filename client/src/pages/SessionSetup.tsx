import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Zap, Mic, Play, ChevronRight, Radio, History } from "lucide-react";
import type { CallType, CoachingPriority, SessionConfig } from "@shared/schema";
import { callTypeLabels, priorityLabels } from "@shared/schema";

export default function SessionSetup() {
  const [, navigate] = useLocation();
  const [sdrName, setSdrName] = useState("");
  const [callType, setCallType] = useState<CallType>("discovery");
  const [priorities, setPriorities] = useState<CoachingPriority[]>(["discovery_depth"]);
  const [talkTrackNotes, setTalkTrackNotes] = useState("");
  const [mode, setMode] = useState<"simulation" | "live">("simulation");

  const togglePriority = (p: CoachingPriority) => {
    setPriorities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleStart = () => {
    if (!sdrName.trim() || priorities.length === 0) return;

    const config: SessionConfig = {
      sdrName: sdrName.trim(),
      callType,
      coachingPriorities: priorities,
      talkTrackNotes: talkTrackNotes.trim() || undefined,
      mode,
    };

    const encoded = encodeURIComponent(JSON.stringify(config));
    navigate(`/session?config=${encoded}`);
  };

  const isValid = sdrName.trim().length > 0 && priorities.length > 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-app-title">RepReady</h1>
          </div>
          <p className="text-muted-foreground text-sm" data-testid="text-app-subtitle">Real-time AI coaching for SDR readiness</p>
          <Link href="/sessions">
            <Button variant="ghost" size="sm" className="mt-3" data-testid="link-previous-sessions">
              <History className="w-3.5 h-3.5 mr-1.5" />
              Previous Sessions
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sdrName">SDR Name</Label>
              <Input
                id="sdrName"
                data-testid="input-sdr-name"
                placeholder="Enter your name"
                value={sdrName}
                onChange={(e) => setSdrName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Call Type</Label>
              <Select value={callType} onValueChange={(v) => setCallType(v as CallType)}>
                <SelectTrigger data-testid="select-call-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(callTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} data-testid={`option-call-type-${value}`}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Coaching Priorities</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(priorityLabels).map(([key, label]) => {
                  const isSelected = priorities.includes(key as CoachingPriority);
                  return (
                    <Badge
                      key={key}
                      data-testid={`badge-priority-${key}`}
                      variant={isSelected ? "default" : "secondary"}
                      className="cursor-pointer select-none"
                      onClick={() => togglePriority(key as CoachingPriority)}
                    >
                      {label}
                    </Badge>
                  );
                })}
              </div>
              {priorities.length === 0 && (
                <p className="text-xs text-destructive">Select at least one priority</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="talkTrack">Talk Track Notes (optional)</Label>
              <Textarea
                id="talkTrack"
                data-testid="input-talk-track"
                placeholder="Add any talk track notes or context for this session..."
                value={talkTrackNotes}
                onChange={(e) => setTalkTrackNotes(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-md bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                {mode === "simulation" ? (
                  <Play className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Mic className="w-4 h-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium" data-testid="text-mode-label">
                    {mode === "simulation" ? "Simulation Mode" : "Live Mode"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mode === "simulation"
                      ? "Uses a scripted transcript for demo purposes"
                      : "Uses browser microphone for live transcription"}
                  </p>
                </div>
              </div>
              <Switch
                data-testid="switch-mode"
                checked={mode === "live"}
                onCheckedChange={(checked) => setMode(checked ? "live" : "simulation")}
              />
            </div>

            <Button
              data-testid="button-start-session"
              className="w-full"
              size="lg"
              disabled={!isValid}
              onClick={handleStart}
            >
              <Radio className="w-4 h-4 mr-2" />
              Start Session
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
