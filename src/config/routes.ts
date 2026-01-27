import { Application } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../libs/auth";
import { authMiddleware } from "../middlewares/authMiddleware";
import { errorHandler } from "../middlewares/errorHandler";
import socketRoutes from "../routes/socket";
import conversationsRoutes from "../routes/conversations";
import linkPreviewRoutes from "../routes/link-preview";
import logger from "../libs/logger";

export function setupRoutes(app: Application): void {
  // Session introspection endpoint for aura server-side auth (must be before catch-all)
  app.get("/api/auth/session", async (req, res) => {
    const internalSecret = req.headers["x-internal-secret"];

    if (internalSecret !== process.env.SERVER_INTERNAL_SECRET) {
      logger.warn(`[Auth] Forbidden introspection attempt from ${req.ip}`);
      return res
        .status(403)
        .json({ error: "Forbidden - Invalid internal secret" });
    }

    const session = await auth.api.getSession({
      headers: req.headers as any,
    });
    res.json({ data: session });
  });

  // Better Auth route (catch-all, must be after specific routes)
  app.all("/api/auth/*", toNodeHandler(auth));

  // Health check endpoint (Public)
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Apply global auth middleware from here onwards
  app.use(authMiddleware);

  // Protected Routes
  app.use("/api/messages", socketRoutes);
  app.use("/api/conversations", conversationsRoutes);
  app.use("/api/link-preview", linkPreviewRoutes);

  // Centralized error handling (MUST be after all routes)
  app.use(errorHandler);
}
