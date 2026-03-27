import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Square, Clock, Zap, Play, Mic, MicOff, User, Phone, Monitor, Send, Radio } from "lucide-react";
import { socketClient } from "@/lib/socket";
import { teamsService } from "@/lib/teamsIntegration";
import TranscriptPanel from "@/components/TranscriptPanel";
import CoachingPanel from "@/components/CoachingPanel";
import TeamsStatusCard from "@/components/TeamsStatusCard";
import type { TranscriptChunk, CoachingPrompt, SessionConfig, Session } from "@shared/schema";
import { callTypeLabels, priorityLabels } from "@shared/schema";

function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function TeamsSidebarSection() {
  const teamsStatus = useSyncExternalStore(
    (cb) => teamsService.subscribe(cb),
    () => teamsService.getStatus()
  );

  const [injectText, setInjectText] = useState("");
  const [injectSpeaker, setInjectSpeaker] = useState<"rep" | "prospect">("rep");
  const [isListening, setIsListening] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef(false);
  const speakerRef = useRef<"rep" | "prospect">("rep");
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    speakerRef.current = injectSpeaker;
  }, [injectSpeaker]);

  const sendChunkToWhisper = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return;
    setProcessingCount((c) => c + 1);
    try {
      const mimeType = blob.type || "audio/webm";
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const audio = btoa(binary);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio, mimeType }),
      });
      if (!res.ok) {
        console.warn("[transcribe] chunk rejected:", res.status);
        return;
      }
      const { text } = await res.json() as { text: string };
      if (text && text.trim()) {
        socketClient.send({
          type: "transcript_chunk",
          speaker: speakerRef.current,
          text: text.trim(),
        });
      }
    } catch (err) {
      console.warn("[transcribe] chunk failed:", err);
    } finally {
      setProcessingCount((c) => Math.max(0, c - 1));
    }
  }, []);

  const VAD_THRESHOLD = 0.02; // fraction of max amplitude; below = silence

  const startCycle = useCallback((stream: MediaStream, mimeType: string) => {
    if (!isListeningRef.current) return;

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    // Track peak amplitude during this 2-second window
    let peakAmplitude = 0;
    let vadInterval: ReturnType<typeof setInterval> | null = null;
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      vadInterval = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);
        for (let i = 0; i < dataArray.length; i++) {
          const amplitude = Math.abs(dataArray[i] - 128) / 128;
          if (amplitude > peakAmplitude) peakAmplitude = amplitude;
        }
      }, 80);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      if (vadInterval) clearInterval(vadInterval);
      // Only send to Whisper if voice activity was detected above threshold
      if (chunks.length > 0 && peakAmplitude >= VAD_THRESHOLD) {
        const blob = new Blob(chunks, { type: mimeType });
        sendChunkToWhisper(blob);
      }
      if (isListeningRef.current) {
        startCycle(stream, mimeType);
      }
    };

    recorder.onerror = () => {
      if (vadInterval) clearInterval(vadInterval);
      setMicError("Recording error. Please try again.");
      isListeningRef.current = false;
      setIsListening(false);
    };

    recorder.start();
    setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 2000);
  }, [sendChunkToWhisper]);

  const startListening = useCallback(async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Wire up AnalyserNode for VAD
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0;
        source.connect(analyser);
        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch {
        // VAD setup failed — will still record, just without silence gating
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
      isListeningRef.current = true;
      setIsListening(true);
      startCycle(stream, mimeType);
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicError("Microphone access denied. Allow mic access and try again.");
      } else {
        setMicError("Could not start microphone recording.");
      }
    }
  }, [startCycle]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleInject = () => {
    if (!injectText.trim()) return;
    const event = teamsService.injectTranscriptEvent(injectText.trim(), injectSpeaker);
    socketClient.send({
      type: "transcript_chunk",
      speaker: event.speaker,
      text: event.text,
    });
    setInjectText("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">Teams</p>
      <TeamsStatusCard status={teamsStatus} compact />

      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Transcript Source</p>
          <Badge
            variant="outline"
            className={`text-xs no-default-active-elevate px-1.5 py-0 ${isListening ? "border-green-500 text-green-500" : "border-muted-foreground/40"}`}
            data-testid="badge-transcript-source"
          >
            {isListening ? "Live Mic" : "Manual"}
          </Badge>
        </div>

        <Select value={injectSpeaker} onValueChange={(v) => setInjectSpeaker(v as "rep" | "prospect")}>
          <SelectTrigger className="h-7 text-xs" data-testid="select-inject-speaker">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rep">Rep (you)</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
          </SelectContent>
        </Select>

        <Button
          data-testid="button-toggle-listening"
          variant={isListening ? "destructive" : "default"}
          size="sm"
          className="w-full h-8 text-xs"
          onClick={isListening ? stopListening : startListening}
        >
          {isListening ? (
            <>
              <MicOff className="w-3.5 h-3.5 mr-1.5" />
              Stop Listening
            </>
          ) : (
            <>
              <Radio className="w-3.5 h-3.5 mr-1.5" />
              Start Live Transcription
            </>
          )}
        </Button>

        {isListening && processingCount > 0 && (
          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            data-testid="text-processing-indicator"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Processing...
          </div>
        )}

        {isListening && processingCount === 0 && (
          <div className="flex items-center gap-1.5 text-xs text-green-500" data-testid="text-listening-indicator">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Listening...
          </div>
        )}

        {micError && (
          <p className="text-xs text-destructive" data-testid="text-mic-error">{micError}</p>
        )}

        <div className="flex gap-1 pt-1">
          <Input
            data-testid="input-inject-transcript"
            className="h-7 text-xs"
            placeholder={isListening ? "Or type manually..." : "Type transcript..."}
            value={injectText}
            onChange={(e) => setInjectText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInject()}
          />
          <Button
            data-testid="button-inject-transcript"
            variant="secondary"
            size="sm"
            className="h-7 w-7 p-0 flex-shrink-0"
            onClick={handleInject}
            disabled={!injectText.trim()}
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activePromptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveMicStreamRef = useRef<MediaStream | null>(null);
  const liveMicIsListeningRef = useRef(false);
  const liveMicAnalyserRef = useRef<AnalyserNode | null>(null);
  const liveMicAudioCtxRef = useRef<AudioContext | null>(null);

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

      socketClient.on("generating_summary", () => {
        setGeneratingSummary(true);
      });

      socketClient.on("session_ended", (data) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setGeneratingSummary(false);
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

  const VAD_THRESHOLD = 0.02;

  const sendLiveChunkToWhisper = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return;
    try {
      const mimeType = blob.type || "audio/webm";
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const audio = btoa(binary);
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio, mimeType }),
      });
      if (!res.ok) return;
      const { text } = await res.json() as { text: string };
      if (text && text.trim()) {
        socketClient.send({ type: "transcript_chunk", speaker: "rep", text: text.trim() });
      }
    } catch {
      // silent — chunk failures don't surface to the user
    }
  }, []);

  const startLiveCycle = useCallback((stream: MediaStream, mimeType: string) => {
    if (!liveMicIsListeningRef.current) return;
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    let peakAmplitude = 0;
    let vadInterval: ReturnType<typeof setInterval> | null = null;
    if (liveMicAnalyserRef.current) {
      const dataArray = new Uint8Array(liveMicAnalyserRef.current.frequencyBinCount);
      vadInterval = setInterval(() => {
        if (!liveMicAnalyserRef.current) return;
        liveMicAnalyserRef.current.getByteTimeDomainData(dataArray);
        for (let i = 0; i < dataArray.length; i++) {
          const amp = Math.abs(dataArray[i] - 128) / 128;
          if (amp > peakAmplitude) peakAmplitude = amp;
        }
      }, 80);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      if (vadInterval) clearInterval(vadInterval);
      if (chunks.length > 0 && peakAmplitude >= VAD_THRESHOLD) {
        sendLiveChunkToWhisper(new Blob(chunks, { type: mimeType }));
      }
      if (liveMicIsListeningRef.current) startLiveCycle(stream, mimeType);
    };
    recorder.onerror = () => {
      if (vadInterval) clearInterval(vadInterval);
      liveMicIsListeningRef.current = false;
      setIsRecording(false);
    };

    recorder.start();
    setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 2000);
  }, [sendLiveChunkToWhisper]);

  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveMicStreamRef.current = stream;

      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0;
        source.connect(analyser);
        liveMicAudioCtxRef.current = audioCtx;
        liveMicAnalyserRef.current = analyser;
      } catch {
        // VAD unavailable — recording continues without silence gating
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      liveMicIsListeningRef.current = true;
      setIsRecording(true);
      startLiveCycle(stream, mimeType);
    } catch {
      // mic access denied or unavailable — fail silently
    }
  }, [startLiveCycle]);

  const handleStopRecording = useCallback(() => {
    liveMicIsListeningRef.current = false;
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (liveMicStreamRef.current) {
      liveMicStreamRef.current.getTracks().forEach((t) => t.stop());
      liveMicStreamRef.current = null;
    }
    if (liveMicAudioCtxRef.current) {
      liveMicAudioCtxRef.current.close().catch(() => {});
      liveMicAudioCtxRef.current = null;
      liveMicAnalyserRef.current = null;
    }
    mediaRecorderRef.current = null;
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

  const modeBadge = () => {
    switch (config.mode) {
      case "simulation":
        return <><Play className="w-3 h-3 mr-1" /> Simulation</>;
      case "live":
        return <><Mic className="w-3 h-3 mr-1" /> Live</>;
      case "teams":
        return <><Monitor className="w-3 h-3 mr-1" /> Teams</>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm" data-testid="text-header-title">RepReady</span>
          <Separator orientation="vertical" className="h-5" />
          <Badge variant="secondary" className="no-default-active-elevate" data-testid="badge-session-mode">
            {modeBadge()}
          </Badge>
          {config.mode === "teams" && config.teamsContext?.meetingTitle && (
            <span className="text-xs text-muted-foreground truncate max-w-48" data-testid="text-teams-meeting-title">
              {config.teamsContext.meetingTitle}
            </span>
          )}
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
            disabled={isEnding || generatingSummary}
          >
            <Square className="w-3 h-3 mr-1.5" />
            {generatingSummary ? "Generating Summary..." : isEnding ? "Ending..." : "End Session"}
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
                  Start Live Transcription
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
                  Stop Transcription
                </Button>
              )}
            </div>
          )}

          {config.mode === "teams" && (
            <TeamsSidebarSection />
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
          <TranscriptPanel chunks={transcript} repName={config.sdrName} />
        </div>

        <div className="w-80 flex-shrink-0">
          <CoachingPanel prompts={prompts} activePrompt={activePrompt} />
        </div>
      </div>
    </div>
  );
}
