import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { TranscriptChunk } from "@shared/schema";

interface TranscriptPanelProps {
  chunks: TranscriptChunk[];
}

function formatSessionTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function TranscriptPanel({ chunks }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunks.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-1 px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">Live Transcript</h2>
        <Badge variant="secondary" className="text-xs no-default-active-elevate">
          {chunks.length} exchanges
        </Badge>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {chunks.length === 0 && (
            <div className="flex items-center justify-center py-12" data-testid="text-transcript-empty">
              <p className="text-sm text-muted-foreground">Waiting for transcript...</p>
            </div>
          )}
          {chunks.map((chunk) => (
            <div
              key={chunk.id}
              data-testid={`transcript-chunk-${chunk.id}`}
              className={`flex gap-3 ${chunk.speaker === "rep" ? "" : ""}`}
            >
              <div className="flex-shrink-0 pt-0.5">
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                    chunk.speaker === "rep"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {chunk.speaker === "rep" ? "R" : "P"}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium">
                    {chunk.speaker === "rep" ? "Rep" : "Prospect"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatSessionTime(chunk.sessionTime)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{chunk.text}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
