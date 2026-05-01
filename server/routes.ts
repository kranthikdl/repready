import type { Express } from "express";
import { type Server } from "http";
import { setupWebSocket } from "./services/sessionSocket";
import { apiRouters } from "./routes/index";

export { apiRouters } from "./routes/index";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupWebSocket(httpServer);

  for (const { path, router } of apiRouters) {
    app.use(path, router);
  }

  return httpServer;
}
