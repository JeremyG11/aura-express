import { Application } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@/core/auth";
import { authMiddleware } from "@/middlewares/authMiddleware";
import { errorHandler } from "@/middlewares/errorHandler";
import messageRoutes from "@/routes/messages";
import conversationsRoutes from "@/routes/conversations";
import linkPreviewRoutes from "@/routes/link-preview";
import threadRoutes from "@/routes/threads";
import notificationRoutes from "@/routes/notifications";
import reactionRoutes from "@/routes/reactions";
import membersRoutes from "@/routes/members";
import channelRoutes from "@/routes/channels";
import logger from "@/core/logger";

export function setupRoutes(app: Application): void {
  // Root route to avoid "Cannot GET /"
  app.get("/", (req, res) => {
    res.json({
      message: "Lively Backend API is running",
      documentation: "/health",
    });
  });

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
  app.use("/api/messages", messageRoutes);
  app.use("/api/conversations", conversationsRoutes);
  app.use("/api/link-preview", linkPreviewRoutes);
  app.use("/api/threads", threadRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/reactions", reactionRoutes);
  app.use("/api/members", membersRoutes);
  app.use("/api/channels", channelRoutes);

  // Centralized error handling (MUST be after all routes)
  app.use(errorHandler);
}
