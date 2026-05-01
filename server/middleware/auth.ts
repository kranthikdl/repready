import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = (req as Request & { session?: { user?: unknown } }).session;
  if (!session || !session.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}
