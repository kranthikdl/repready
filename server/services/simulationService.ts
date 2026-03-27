import type { CallType } from "@shared/schema";

interface ScriptLine {
  speaker: "rep" | "prospect";
  text: string;
  delayMs: number;
}

const discoveryScript: ScriptLine[] = [
  { speaker: "rep", text: "Hi Sarah, thanks for taking the time today. I'm Alex from Velocity. How are you doing?", delayMs: 2500 },
  { speaker: "prospect", text: "Hey Alex, doing well! Busy quarter but happy to chat.", delayMs: 3000 },
  { speaker: "rep", text: "Totally get it. So I know you signed up after seeing our webinar on pipeline acceleration. I'd love to learn a bit more about what caught your eye there.", delayMs: 3500 },
  { speaker: "prospect", text: "Yeah, we've been struggling with our outbound process. Our SDR team is spending too much time on manual research and not enough time actually selling.", delayMs: 4000 },
  { speaker: "rep", text: "That makes sense. A lot of teams we work with face that exact challenge. So tell me, how many SDRs do you have on the team right now?", delayMs: 3000 },
  { speaker: "prospect", text: "We have about 12 SDRs. We hired aggressively last quarter but ramp time has been brutal. Most of them aren't hitting quota yet.", delayMs: 4000 },
  { speaker: "rep", text: "Got it. And what does your current tech stack look like for prospecting? Are you using any automation tools today?", delayMs: 3000 },
  { speaker: "prospect", text: "We have Salesforce and we use LinkedIn Sales Navigator. But honestly our process is pretty manual. Reps are copying and pasting a lot.", delayMs: 3500 },
  { speaker: "rep", text: "I see. Let me tell you about our platform then. Velocity automates the entire prospecting workflow. We integrate directly with Salesforce and can pull enriched data from over 50 sources.", delayMs: 4500 },
  { speaker: "prospect", text: "That sounds interesting. But I'm curious, how does it handle personalization? We don't want to send generic spray-and-pray messages.", delayMs: 3500 },
  { speaker: "rep", text: "Great question. Our AI engine analyzes each prospect's digital footprint and generates personalized talking points. Your reps get tailored suggestions without doing the research manually.", delayMs: 4000 },
  { speaker: "prospect", text: "Hmm, that's intriguing. We tried a similar tool last year though and the quality wasn't great. The messages felt robotic.", delayMs: 3500 },
  { speaker: "rep", text: "Yeah that's a common concern. Our approach is different because we don't write the messages for you. We surface the insights and your reps craft the message. It's augmentation, not automation.", delayMs: 4000 },
  { speaker: "prospect", text: "Okay, that distinction is helpful. What kind of results are your customers seeing?", delayMs: 3000 },
  { speaker: "rep", text: "On average, teams see a 40% increase in meetings booked within the first 90 days. Our best customers have cut research time by 70%.", delayMs: 3500 },
  { speaker: "prospect", text: "Those numbers are impressive. What does pricing look like?", delayMs: 2500 },
  { speaker: "rep", text: "We have a few tiers depending on team size and features. For a team of 12, you'd likely be looking at our Growth plan. I can send over a detailed proposal.", delayMs: 3500 },
  { speaker: "prospect", text: "Sure, that would be great. I'd also want to loop in my VP of Sales before making any decisions.", delayMs: 3000 },
  { speaker: "rep", text: "Absolutely. Would it make sense to set up a follow-up call next week with your VP? I could do a more tailored demo with their priorities in mind.", delayMs: 3500 },
  { speaker: "prospect", text: "Yeah, let me check their calendar and get back to you. Can you send me a calendar link?", delayMs: 3000 },
  { speaker: "rep", text: "Of course! I'll send that over right after our call along with the proposal. Thanks so much for your time today, Sarah.", delayMs: 3000 },
];

const objectionHandlingScript: ScriptLine[] = [
  { speaker: "rep", text: "Hi Marcus, good to connect again. Last time we spoke you were evaluating a few solutions. How's that going?", delayMs: 3000 },
  { speaker: "prospect", text: "Hey, yeah about that. We've actually been leaning toward staying with our current vendor. They just offered us a renewal discount.", delayMs: 3500 },
  { speaker: "rep", text: "Oh interesting, a renewal discount. Can I ask what kind of discount they offered?", delayMs: 2500 },
  { speaker: "prospect", text: "They knocked 20% off for a two-year commitment. It's hard to argue with that from a budget perspective.", delayMs: 3000 },
  { speaker: "rep", text: "I totally understand. Budget is always a factor. But let me ask you this. When we first spoke, you mentioned your team was losing about 15 hours per week per rep on manual tasks. Has that improved with your current solution?", delayMs: 4500 },
  { speaker: "prospect", text: "Well... not really. The tool does what it does but the workflow issues are still there. We've kind of accepted it as normal.", delayMs: 3500 },
  { speaker: "rep", text: "Right. So if each of your 12 reps is losing 15 hours a week, that's 180 hours. At an average cost of about $50 an hour fully loaded, you're looking at $9,000 per week in lost productivity. Even with a 20% discount, is that tradeoff worth it?", delayMs: 5000 },
  { speaker: "prospect", text: "Hmm, I haven't thought about it in those terms. That's a significant number.", delayMs: 3000 },
  { speaker: "rep", text: "It usually is. And the thing is, a discount on a tool that isn't solving the core problem is still spending money on something that isn't working. What would it mean for your team if they got even half of those hours back?", delayMs: 4500 },
  { speaker: "prospect", text: "That would be huge honestly. We're already behind on pipeline targets for Q3.", delayMs: 3000 },
  { speaker: "rep", text: "Exactly. And that's precisely where we help. Our customers typically recoup 60 to 70 percent of that lost time within the first month. The ROI more than covers the investment.", delayMs: 4000 },
  { speaker: "prospect", text: "Okay, but we also have a concern about switching costs. Migration always takes longer than vendors say it will.", delayMs: 3500 },
  { speaker: "rep", text: "That's a fair concern. We actually have a dedicated migration team and the average deployment time is 2 weeks. We even run parallel with your existing tool so there's no gap in coverage.", delayMs: 4000 },
  { speaker: "prospect", text: "Two weeks is faster than I expected. Our last migration took three months.", delayMs: 3000 },
  { speaker: "rep", text: "Yeah, that's common with legacy platforms. Our architecture is built for quick deployment. Would you like to see a migration timeline specific to your stack?", delayMs: 3500 },
  { speaker: "prospect", text: "Actually, yes. That would help me make the case internally. My CFO is going to ask about implementation risk.", delayMs: 3500 },
  { speaker: "rep", text: "Perfect. I'll put together a migration plan with timelines and risk mitigations. Can we schedule a call Thursday to review it together? Ideally with your CFO if they're available.", delayMs: 4000 },
  { speaker: "prospect", text: "Thursday should work. Let me confirm the time and I'll try to get the CFO to join.", delayMs: 3000 },
  { speaker: "rep", text: "Sounds great. I'll send a calendar invite with the migration doc attached so everyone can review beforehand. Thanks Marcus.", delayMs: 3000 },
];

const qualificationScript: ScriptLine[] = [
  { speaker: "rep", text: "Hi Jordan, thanks for booking time with us. I saw you downloaded our ROI calculator last week. What prompted that?", delayMs: 3000 },
  { speaker: "prospect", text: "Yeah, we're exploring options to improve our sales enablement. Our VP asked me to research some vendors.", delayMs: 3500 },
  { speaker: "rep", text: "Great. So you're in a research phase right now. Who else is involved in this evaluation besides yourself?", delayMs: 3000 },
  { speaker: "prospect", text: "It's mainly me and our VP of Sales. She'll make the final call but I'm doing the initial screening.", delayMs: 3000 },
  { speaker: "rep", text: "Got it. And is there a timeline driving this? Are you looking to have something in place by a certain date?", delayMs: 3000 },
  { speaker: "prospect", text: "We'd like to have something running before Q4 planning starts. So ideally in the next 6 to 8 weeks.", delayMs: 3000 },
  { speaker: "rep", text: "That's a good timeline. Very doable on our end. Can you tell me a bit about what's not working today? What's the pain point that kicked off this search?", delayMs: 3500 },
  { speaker: "prospect", text: "Our biggest issue is consistency. Some reps are crushing it and others are struggling. We need a way to standardize the playbook without micromanaging.", delayMs: 4000 },
  { speaker: "rep", text: "Consistency is one of the most common challenges we hear. Let me ask, how large is your sales team currently?", delayMs: 3000 },
  { speaker: "prospect", text: "We have 25 reps total. About 8 AEs and 17 SDRs across two offices.", delayMs: 3000 },
  { speaker: "rep", text: "And in terms of budget, has there been a range discussed or is that still TBD?", delayMs: 2500 },
  { speaker: "prospect", text: "There's a rough budget of about $50K for the year. But if the ROI is clear, our VP said there's flexibility.", delayMs: 3500 },
  { speaker: "rep", text: "That's helpful to know. $50K is right in line with where most teams of your size land with us. Have you been evaluating other tools as well?", delayMs: 3500 },
  { speaker: "prospect", text: "We've looked at Gong and Chorus but they seem more focused on call recording. We need something broader.", delayMs: 3500 },
  { speaker: "rep", text: "That's a great observation. Those are solid tools for conversation intelligence but they don't address the enablement workflow. Our platform covers both the coaching and the content delivery side.", delayMs: 4000 },
  { speaker: "prospect", text: "That's exactly what we need. Can you walk me through what implementation looks like?", delayMs: 3000 },
  { speaker: "rep", text: "Absolutely. We typically start with a pilot group, usually 5 to 8 reps, and run for 30 days. Then we roll out to the full team. The whole process takes about 6 weeks.", delayMs: 4000 },
  { speaker: "prospect", text: "That fits our timeline perfectly. What do you need from us to get started?", delayMs: 2500 },
  { speaker: "rep", text: "The next step would be a technical demo with your VP. I'd also want to understand your current CRM setup so we can scope the integration. Would next Tuesday work for that?", delayMs: 4000 },
  { speaker: "prospect", text: "Tuesday works. I'll get the VP on the invite. Looking forward to it.", delayMs: 2500 },
  { speaker: "rep", text: "Perfect. I'll send over the invite along with some case studies from similar-sized teams. Thanks for your time today Jordan.", delayMs: 3000 },
];

export const simulationScripts: Record<CallType, ScriptLine[]> = {
  discovery: discoveryScript,
  objection_handling: objectionHandlingScript,
  qualification: qualificationScript,
};

export function getSimulationScript(callType: CallType): ScriptLine[] {
  return simulationScripts[callType];
}

export function getGuidedScript(callType: CallType): ScriptLine[] {
  const full = simulationScripts[callType];
  const result: ScriptLine[] = [];
  let accumulatedDelay = 0;
  for (const line of full) {
    if (line.speaker === "prospect") {
      result.push({ ...line, delayMs: accumulatedDelay + line.delayMs });
      accumulatedDelay = 0;
    } else {
      accumulatedDelay += line.delayMs;
    }
  }
  return result;
}
