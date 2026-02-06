import express, { Application } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@/core/auth/config";
import { authMiddleware } from "@/core/auth/middleware";
import { errorHandler } from "@/shared/middlewares/errorHandler";
import messagingRoutes from "@/core/messaging/routes";
import serverRoutes from "@/core/servers/routes";
import notificationRoutes from "@/core/notifications/routes";
import userRoutes from "@/core/users/routes";
import logger from "@/shared/core/logger";

export function setupRoutes(app: Application): void {
  // Root route to avoid "Cannot GET /"
  app.get("/", (req, res) => {
    res.json({
      message: "Lively Backend API is running",
      documentation: "/health",
    });
  });

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

  app.all("/api/auth/*", toNodeHandler(auth));

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use(authMiddleware);

  app.use(express.json());

  // API v1 Consolidated Routes
  const v1Router = express.Router();
  v1Router.use(messagingRoutes);
  v1Router.use(serverRoutes);
  v1Router.use(notificationRoutes);
  v1Router.use(userRoutes);

  app.use("/api/v1", v1Router);

  app.use(errorHandler);
}
