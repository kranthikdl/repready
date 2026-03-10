import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Square, Clock, Zap, Play, Mic, User, Phone } from "lucide-react";
import { socketClient } from "@/lib/socket";
import TranscriptPanel from "@/components/TranscriptPanel";
import CoachingPanel from "@/components/CoachingPanel";
import type { TranscriptChunk, CoachingPrompt, SessionConfig, Session } from "@shared/schema";
import { callTypeLabels, priorityLabels } from "@shared/schema";

function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function LiveSession() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const configStr = params.get("config");

  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [prompts, setPrompts] = useState<CoachingPrompt[]>([]);
  const [activePrompt, setActivePrompt] = useState<CoachingPrompt | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activePromptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!configStr) {
      navigate("/");
      return;
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(configStr));
      setConfig(parsed);
    } catch {
      navigate("/");
    }
  }, [configStr, navigate]);

  useEffect(() => {
    if (!config) return;

    let mounted = true;

    async function init() {
      try {
        await socketClient.connect();
      } catch (err) {
        console.error("Failed to connect WebSocket:", err);
        setConnectionError(true);
        return;
      }
      if (!mounted) return;

      socketClient.on("session_started", (data) => {
        setSessionId(data.sessionId);
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setElapsedMs(Date.now() - startTimeRef.current);
        }, 100);
      });

      socketClient.on("transcript_update", (data) => {
        setTranscript((prev) => [...prev, data.chunk]);
      });

      socketClient.on("coaching_prompt", (data) => {
        setPrompts((prev) => [...prev, data.prompt]);
        setActivePrompt(data.prompt);

        if (activePromptTimeoutRef.current) {
          clearTimeout(activePromptTimeoutRef.current);
        }
        activePromptTimeoutRef.current = setTimeout(() => {
          setActivePrompt(null);
        }, 10000);
      });

      socketClient.on("simulation_complete", () => {
        setSimulationComplete(true);
      });

      socketClient.on("session_ended", (data) => {
        if (timerRef.current) clearInterval(timerRef.current);
        navigate(`/review/${data.session.id}`);
      });

      socketClient.send({ type: "start_session", config });
    }

    init();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (activePromptTimeoutRef.current) clearTimeout(activePromptTimeoutRef.current);
      socketClient.disconnect();
    };
  }, [config, navigate]);

  const handleEndSession = useCallback(() => {
    setIsEnding(true);
    socketClient.send({ type: "end_session" });
  }, []);

  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          socketClient.send({
            type: "transcript_chunk",
            speaker: "rep",
            text: "[Live audio chunk - transcription would process here]",
          });
        }
      };

      mediaRecorder.start(5000);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  if (!config) return null;

  if (connectionError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-md bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold mb-2" data-testid="text-connection-error">Connection Failed</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Could not connect to the coaching server. Please try again.
            </p>
            <Button onClick={() => navigate("/")} data-testid="button-back-setup">
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm" data-testid="text-header-title">RepReady</span>
          <Separator orientation="vertical" className="h-5" />
          <Badge variant="secondary" className="no-default-active-elevate">
            {config.mode === "simulation" ? (
              <><Play className="w-3 h-3 mr-1" /> Simulation</>
            ) : (
              <><Mic className="w-3 h-3 mr-1" /> Live</>
            )}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-mono" data-testid="text-timer">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            {formatTimer(elapsedMs)}
          </div>
          <Button
            data-testid="button-end-session"
            variant="destructive"
            size="sm"
            onClick={handleEndSession}
            disabled={isEnding}
          >
            <Square className="w-3 h-3 mr-1.5" />
            {isEnding ? "Ending..." : "End Session"}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="w-56 border-r bg-card/50 flex-shrink-0 flex flex-col p-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">SDR</p>
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-sm font-medium" data-testid="text-sdr-name">{config.sdrName}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Call Type</p>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-sm" data-testid="text-call-type">{callTypeLabels[config.callType]}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Priorities</p>
            <div className="flex flex-col gap-1.5">
              {config.coachingPriorities.map((p) => (
                <Badge key={p} variant="secondary" className="text-xs no-default-active-elevate justify-start">
                  {priorityLabels[p]}
                </Badge>
              ))}
            </div>
          </div>

          {config.talkTrackNotes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{config.talkTrackNotes}</p>
            </div>
          )}

          {config.mode === "live" && (
            <div className="mt-auto pt-4">
              {!isRecording ? (
                <Button
                  data-testid="button-start-recording"
                  size="sm"
                  className="w-full"
                  onClick={handleStartRecording}
                >
                  <Mic className="w-3.5 h-3.5 mr-1.5" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  data-testid="button-stop-recording"
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleStopRecording}
                >
                  <Square className="w-3 h-3 mr-1.5" />
                  Stop Recording
                </Button>
              )}
            </div>
          )}

          {simulationComplete && (
            <div className="mt-auto pt-4">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium text-center" data-testid="text-simulation-complete">
                Simulation complete
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 border-r">
          <TranscriptPanel chunks={transcript} />
        </div>

        <div className="w-80 flex-shrink-0">
          <CoachingPanel prompts={prompts} activePrompt={activePrompt} />
        </div>
      </div>
    </div>
  );
}
