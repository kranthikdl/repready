import { Router } from "express";
import healthRouter from "./health";
import sessionsRouter from "./sessions";
import coachingProfileRouter from "./coachingProfile";
import transcribeRouter from "./transcribe";

export { healthRouter, sessionsRouter, coachingProfileRouter, transcribeRouter };

export interface MountedRoute {
  path: string;
  router: Router;
}

export const apiRouters: MountedRoute[] = [
  { path: "/api/health", router: healthRouter },
  { path: "/api/sessions", router: sessionsRouter },
  { path: "/api/coaching-profile", router: coachingProfileRouter },
  { path: "/api/transcribe", router: transcribeRouter },
];

export default apiRouters;
