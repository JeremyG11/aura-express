import http from "http";
import { Server } from "socket.io";
import { Application } from "express";
import logger from "@/shared/core/logger";
import { socketService } from "@/shared/core/socket";
import { CustomSocket } from "@/shared/types";

// Import modules
import { socketAuthMiddleware } from "./auth";
import { registerMessageHandlers } from "./messages";
import { registerPresenceHandlers } from "./presence";
import { registerNotificationHandlers } from "./notifications";
import { registerRoomHandlers } from "./rooms";

// Import event side-effects
import "@/core/messaging/events";

export let io: Server;

/**
 * Initialize Socket.IO server and register handlers
 */
export const initializeSocket = (
  httpServer: http.Server,
  allowedOrigins: string[],
  app: Application,
) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  // Initialize SocketService with the io instance
  socketService.initialize(io);

  // Attach io instance to Express app for controller access
  app.set("io", io);

  // Register Middleware
  io.use(socketAuthMiddleware);

  // Connection Handler
  io.on("connection", (socket: CustomSocket) => {
    logger.info(`[Socket.io] Client connected: ${socket.id}`);

    // Join user-specific room for targeted emits
    socket.join(socket.user?.id as string);

    // A catch-all listener for logging in development
    if (process.env.NODE_ENV !== "production") {
      socket.onAny((event, ...args) => {
        logger.info(`[Socket Event] ${event}`, args);
      });
    }

    // Register modular handlers
    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerNotificationHandlers(io, socket);
    registerRoomHandlers(io, socket);
  });

  return io;
};
