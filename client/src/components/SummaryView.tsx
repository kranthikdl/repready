import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ArrowRight, FileText, Target } from "lucide-react";
import type { SessionSummary } from "@shared/schema";

interface SummaryViewProps {
  summary: SessionSummary;
}

export default function SummaryView({ summary }: SummaryViewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Call Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-call-overview">
            {summary.callOverview}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            What Went Well
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {summary.whatWentWell.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-well-${i}`}>
                <span className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0">+</span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" />
            Missed Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {summary.missedOpportunities.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-missed-${i}`}>
                <span className="text-destructive mt-0.5 flex-shrink-0">-</span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-primary" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {summary.recommendedCoachingActions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-action-${i}`}>
                <span className="text-primary mt-0.5 flex-shrink-0">{i + 1}.</span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            Next-Step Quality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-next-step-quality">
            {summary.nextStepQualityAssessment}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
