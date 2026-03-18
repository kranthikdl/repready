import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Zap, Save, Plus, X, Brain, Target, BarChart3, Info,
} from "lucide-react";
import type { CoachingProfile } from "@shared/schema";
import { defaultCoachingProfile } from "@shared/schema";

function TagInput({
  label,
  description,
  values,
  onChange,
  placeholder,
  testPrefix,
}: {
  label: string;
  description: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  testPrefix: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInput("");
    }
  };

  const remove = (val: string) => onChange(values.filter((v) => v !== val));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        <Input
          data-testid={`input-${testPrefix}`}
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button type="button" size="sm" variant="secondary" onClick={add} data-testid={`button-add-${testPrefix}`}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1.5 pr-1" data-testid={`tag-${testPrefix}-${v}`}>
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
                data-testid={`remove-${testPrefix}-${v}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoachingProfilePage() {
  const { toast } = useToast();

  const { data: savedProfile, isLoading } = useQuery<CoachingProfile>({
    queryKey: ["/api/coaching-profile"],
  });

  const [profile, setProfile] = useState<CoachingProfile>(defaultCoachingProfile);

  useEffect(() => {
    if (savedProfile) setProfile(savedProfile);
  }, [savedProfile]);

  const mutation = useMutation({
    mutationFn: (p: CoachingProfile) =>
      apiRequest("POST", "/api/coaching-profile", p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaching-profile"] });
      toast({ title: "Coaching profile saved", description: "Changes will apply to all new sessions." });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save profile. Please try again.", variant: "destructive" });
    },
  });

  const set = (key: keyof CoachingProfile, value: any) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const setLabel = (key: keyof CoachingProfile["scorecardLabels"], value: string) =>
    setProfile((p) => ({ ...p, scorecardLabels: { ...p.scorecardLabels, [key]: value } }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-back-home">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold">RepReady</span>
            </div>
          </div>
          <Button
            onClick={() => mutation.mutate(profile)}
            disabled={mutation.isPending}
            data-testid="button-save-profile"
          >
            <Save className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Coaching Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure your team's coaching methodology, trigger phrases, and scorecard. These settings shape every real-time coaching cue and post-call evaluation.
          </p>
        </div>

        <Tabs defaultValue="methodology" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full" data-testid="tabs-profile">
            <TabsTrigger value="methodology" data-testid="tab-methodology">
              <Brain className="w-3.5 h-3.5 mr-1.5" />
              Methodology
            </TabsTrigger>
            <TabsTrigger value="triggers" data-testid="tab-triggers">
              <Target className="w-3.5 h-3.5 mr-1.5" />
              Triggers
            </TabsTrigger>
            <TabsTrigger value="scorecard" data-testid="tab-scorecard">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Scorecard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="methodology" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coaching Methodology</CardTitle>
                <CardDescription>
                  Describe your sales framework and philosophy. The AI will use this as its primary instruction when generating real-time coaching cues and post-call evaluations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="methodology">Framework & Philosophy</Label>
                  <Textarea
                    id="methodology"
                    data-testid="input-methodology"
                    placeholder={`Describe your sales methodology. Examples:\n\n"We follow MEDDIC. Every discovery call must qualify Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, and Champion before advancing the deal."\n\n"We use Challenger Sale — reps should teach, tailor, and take control. Lead with an insight before asking discovery questions."\n\n"Reps should never pitch before asking at least 3 open-ended questions about current state, desired state, and impact."`}
                    value={profile.methodology}
                    onChange={(e) => set("methodology", e.target.value)}
                    className="resize-none min-h-[160px]"
                  />
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    This is injected directly into the AI's system prompt and shapes every coaching decision.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="customContext">Additional Context</Label>
                  <Textarea
                    id="customContext"
                    data-testid="input-custom-context"
                    placeholder={`Add any extra context for the AI. Examples:\n\n"Our ICP is VP of Sales at mid-market B2B SaaS companies (100-500 employees)."\n\n"Common objections we face: 'we already use Gong,' 'budget is frozen,' 'we're happy with our current process.'"\n\n"Reps should always end with a specific next step — date, time, and who owns each action item."`}
                    value={profile.customContext}
                    onChange={(e) => set("customContext", e.target.value)}
                    className="resize-none min-h-[120px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="triggers" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Objection & Hesitation Triggers</CardTitle>
                <CardDescription>
                  Add the specific phrases your prospects use when they're hesitating or pushing back. The AI will flag these in real time and fire an objection-handling coaching cue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TagInput
                  label="Custom Hesitation Phrases"
                  description="Phrases that signal prospect doubt or resistance. Press Enter or click + to add."
                  values={profile.hesitationPhrases}
                  onChange={(v) => set("hesitationPhrases", v)}
                  placeholder='e.g. "happy with our current process"'
                  testPrefix="hesitation"
                />

                <Separator />

                <TagInput
                  label="Competitor Names"
                  description="When a prospect mentions these names, the AI will fire a high-severity competitive coaching cue immediately."
                  values={profile.competitorNames}
                  onChange={(v) => set("competitorNames", v)}
                  placeholder='e.g. "Gong", "Salesloft", "Outreach"'
                  testPrefix="competitor"
                />
              </CardContent>
            </Card>

            <div className="rounded-md bg-muted/50 p-3 flex gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                These phrases supplement the built-in trigger library. Built-in triggers include: "not sure," "budget," "not ready," "need to think," "concerned," "alternative," and more.
              </span>
            </div>
          </TabsContent>

          <TabsContent value="scorecard" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scorecard Dimension Labels</CardTitle>
                <CardDescription>
                  Rename the four readiness dimensions to match your team's language and framework. The AI will score against these labels after every session.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    { key: "discovery", defaultLabel: "Discovery", hint: 'e.g. "MEDDIC Qualification" or "Needs Discovery"' },
                    { key: "objectionHandling", defaultLabel: "Objection Handling", hint: 'e.g. "Challenger Reframe" or "Pushback Handling"' },
                    { key: "nextStepDiscipline", defaultLabel: "Next-Step Discipline", hint: 'e.g. "Close Discipline" or "Deal Advancement"' },
                    { key: "overall", defaultLabel: "Overall Readiness", hint: 'e.g. "Rep Readiness Score" or "Call Quality"' },
                  ] as const
                ).map(({ key, defaultLabel, hint }) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`label-${key}`} className="text-sm font-medium">
                      {defaultLabel}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">(default)</span>
                    </Label>
                    <Input
                      id={`label-${key}`}
                      data-testid={`input-label-${key}`}
                      placeholder={hint}
                      value={profile.scorecardLabels[key]}
                      onChange={(e) => setLabel(key, e.target.value)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="rounded-md bg-muted/50 p-3 flex gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Leave a field blank to use the default label. Custom labels are shown on all post-call scorecards and fed to the AI so it knows how your team defines each dimension.
              </span>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button
            onClick={() => mutation.mutate(profile)}
            disabled={mutation.isPending}
            size="lg"
            data-testid="button-save-profile-bottom"
          >
            <Save className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}
