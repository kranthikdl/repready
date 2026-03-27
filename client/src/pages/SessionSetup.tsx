import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Play, Mic, ChevronRight, Radio, History, Settings, ArrowLeftRight } from "lucide-react";
import type { CallType, CoachingPriority, SessionConfig, SessionMode } from "@shared/schema";
import { callTypeLabels, priorityLabels } from "@shared/schema";

const modeOptions: { value: SessionMode; label: string; icon: typeof Play; desc: string }[] = [
  { value: "simulation", label: "Simulation", icon: Play, desc: "Scripted transcript for demo" },
  { value: "live", label: "Live Mic", icon: Mic, desc: "Browser capture" },
];

export default function SessionSetup() {
  const [, navigate] = useLocation();
  const [sdrName, setSdrName] = useState("");
  const [callType, setCallType] = useState<CallType>("discovery");
  const [priorities, setPriorities] = useState<CoachingPriority[]>(["discovery_depth"]);
  const [talkTrackNotes, setTalkTrackNotes] = useState("");
  const [mode, setMode] = useState<SessionMode>("simulation");

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
          <div className="flex items-center gap-1 mt-3">
            <Link href="/sessions">
              <Button variant="ghost" size="sm" data-testid="link-previous-sessions">
                <History className="w-3.5 h-3.5 mr-1.5" />
                Previous Sessions
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" size="sm" data-testid="link-coaching-profile">
                <Settings className="w-3.5 h-3.5 mr-1.5" />
                Coaching Profile
              </Button>
            </Link>
          </div>
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

            <div className="space-y-3">
              <Label>Session Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {modeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      data-testid={`button-mode-${opt.value}`}
                      onClick={() => setMode(opt.value)}
                      className={`relative flex flex-col items-center gap-1.5 rounded-md p-3 text-center transition-colors cursor-pointer ${
                        isActive
                          ? "bg-primary/10 ring-2 ring-primary"
                          : "bg-muted/50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-xs font-medium ${isActive ? "text-primary" : ""}`}>{opt.label}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{opt.desc}</span>
                    </button>
                  );
                })}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-testid="button-mode-bidirectional"
                        className="relative flex flex-col items-center gap-1.5 rounded-md p-3 text-center bg-muted/50 opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium">Bi-directional</span>
                        <span className="text-xs text-muted-foreground leading-tight">Teams · HubSpot</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Coming Soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
