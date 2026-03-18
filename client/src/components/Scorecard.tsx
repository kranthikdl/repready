import { Progress } from "@/components/ui/progress";
import type { SessionScorecard, ScorecardLabels } from "@shared/schema";
import { defaultScorecardLabels } from "@shared/schema";

interface ScorecardProps {
  scorecard: SessionScorecard;
  labels?: ScorecardLabels;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-destructive";
}

function progressColor(score: number): string {
  if (score >= 80) return "[&>div]:bg-green-600 dark:[&>div]:bg-green-400";
  if (score >= 60) return "[&>div]:bg-yellow-600 dark:[&>div]:bg-yellow-400";
  return "[&>div]:bg-destructive";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Developing";
  return "Needs Work";
}

export default function Scorecard({ scorecard, labels }: ScorecardProps) {
  const l = {
    ...defaultScorecardLabels,
    ...Object.fromEntries(
      Object.entries(labels ?? {}).filter(([, v]) => v && v.trim())
    ),
  } as ScorecardLabels;

  const categories = [
    { key: "discovery" as const, label: l.discovery },
    { key: "objectionHandling" as const, label: l.objectionHandling },
    { key: "nextStepDiscipline" as const, label: l.nextStepDiscipline },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center p-6 rounded-md bg-muted/30">
        <p className="text-sm text-muted-foreground mb-1">{l.overall}</p>
        <p className={`text-5xl font-bold ${scoreColor(scorecard.overallReadiness)}`} data-testid="text-overall-score">
          {scorecard.overallReadiness}
        </p>
        <p className={`text-sm font-medium mt-1 ${scoreColor(scorecard.overallReadiness)}`}>
          {scoreLabel(scorecard.overallReadiness)}
        </p>
      </div>

      <div className="space-y-3">
        {categories.map(({ key, label }) => (
          <div key={key} data-testid={`scorecard-${key}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm">{label}</span>
              <span className={`text-sm font-semibold ${scoreColor(scorecard[key])}`}>
                {scorecard[key]}
              </span>
            </div>
            <Progress
              value={scorecard[key]}
              className={`h-2 ${progressColor(scorecard[key])}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
