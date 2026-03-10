import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import SessionSetup from "@/pages/SessionSetup";
import LiveSession from "@/pages/LiveSession";
import SessionReview from "@/pages/SessionReview";
import PreviousSessions from "@/pages/PreviousSessions";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SessionSetup} />
      <Route path="/session" component={LiveSession} />
      <Route path="/review/:id" component={SessionReview} />
      <Route path="/sessions" component={PreviousSessions} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
