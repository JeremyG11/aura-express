import os from "os";
import { dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction } from "express";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";

import { CustomSocket } from "types";
import socketRoutes from "./routes/socket";
import { findOrCreateConversation } from "./libs/conversation";
import { prisma } from "./libs/db";
import { errorHandler } from "./middlewares/errorHandler";
import { authMiddleware } from "./middlewares/authMiddleware";
import logger from "./libs/logger";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./libs/auth";

dotenv.config();
const port = process.env.PORT || 7272;
export const app: Application = express();

// CORS configuration - support multiple origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"];

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Basic request logging
app.use((req, res, next) => {
  logger.info(`[Request] ${req.method} ${req.url}`);
  next();
});

// Rate limiting to prevent DoS/Brute-force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Better Auth route
app.all("/api/auth/*", toNodeHandler(auth));

// Session introspection endpoint for aura server-side auth
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

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

//  middleware for io
io.use(async (socket: CustomSocket, next) => {
  console.log("[Socket.io] New connection attempt");

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(socket.handshake.headers),
  });

  if (!session) {
    console.warn("[Socket.io] Unauthenticated connection attempt rejected");
    return next(new Error("Authentication failed"));
  }

  socket.user = {
    id: session.user.id,
    name: session.user.name,
    imageUrl: session.user.image || "",
    email: session.user.email,
  };

  logger.info(`[Socket.io] User authenticated: ${socket.user.id}`);
  next();
});

function fromNodeHeaders(nodeHeaders: any) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v));
    } else if (value) {
      headers.set(key, value as string);
    }
  }
  return headers;
}

// on socket connection
io.on("connection", (socket: CustomSocket) => {
  logger.info(`[Socket.io] Client connected: ${socket.id}`);
  socket.join(socket.user?.id as string);

  // A catch-all listener
  socket.onAny((event, ...args) => {
    logger.info(event, args);
  });

  const activeUsers = [];
  for (let [id, socket] of io.of("/").sockets) {
    activeUsers.push({
      socketId: id,
      ...socket.handshake.auth,
    });
  }
  socket.emit("active-users", activeUsers);

  socket.broadcast.emit("user connected", {
    socketId: socket.id,
    userData: { ...socket.handshake.auth },
  });

  // session
  socket.emit("session", {
    user: socket.user,
  });

  // Listening to Direct Messages
  socket.on("private message", async ({ content, to }) => {
    io.to(to)
      .to(socket.user.id)
      .emit("private message", {
        ...content,
        from: socket.user,
        to,
      });
    logger.info(socket.user.id);
    // message to database
    try {
      const conversation = await findOrCreateConversation(socket.user.id, to);
      if (!conversation) return;

      const member =
        conversation.memberOne.profileId === socket.user.id
          ? conversation.memberOne
          : conversation.memberTwo;

      await prisma.directMessage.create({
        data: {
          content: content.content || content, // Handle both object and string
          conversationId: conversation.id,
          memberId: member.id,
        },
      });
    } catch (err) {
      logger.error(err);
    }
  });

  // mark as read
  socket.on("markAsRead", async ({ senderId }) => {
    try {
      const receiverId = socket.user.id;
      // Update all messages from senderId to receiverId in their conversation
      await prisma.directMessage.updateMany({
        where: {
          member: {
            profileId: senderId,
          },
          conversation: {
            OR: [
              { memberOneId: receiverId, memberTwoId: senderId },
              { memberOneId: senderId, memberTwoId: receiverId },
            ],
          },
          seen: false,
        },
        data: {
          seen: true,
        },
      });

      // Notify the sender that their messages were read
      io.to(senderId).emit("markAsRead", { senderId, receiverId });
    } catch (error) {
      logger.error("❌ Error marking messages as read:", error);
    }
  });

  // typing
  socket.on("typing", (to) => {
    socket.broadcast.to(to).emit("broadcast typing", {});
  });

  //  notifications
  const notifications: {} = [];
  socket.on("notification", (arg) => {
    // send it to users
    socket.broadcast.to(arg.to).emit("notification", arg.notification);
  });
  // Handle notification acknowledgment
  socket.on("notification-acknowledgment", (notificationId) => {
    // const notification = notifications.find((n) => n.id === notificationId);
    // if (notification) {
    //   notification.seen = true;
    // }
  });

  // Disconnect user
  socket.on("disconnect", async () => {
    const matchingSockets = await io.in(socket.user.id).fetchSockets();
    // const isDisconnected = matchingSockets.size === 0;
    // if (isDisconnected) {
    //   socket.broadcast.emit("user disconnected", socket.user.id);
    //   // update the connection status of the session
    // }
  });
});

// Centralized error handling (MUST be after all routes)
app.use(errorHandler);

//  Express listen
let httpServer: http.Server;

if (process.env.NODE_ENV !== "test") {
  httpServer = server.listen(Number(port), "0.0.0.0", () => {
    logger.info(`⚡ Server is ready on port:${port} 🔥`);
    logger.info(`Allowed origins: ${allowedOrigins}`);
  });
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`\n[${signal}] Shutting down gracefully...`);

  if (httpServer) {
    httpServer.close(async () => {
      logger.info("Http server closed.");

      try {
        await prisma.$disconnect();
        logger.info("Database connection closed.");
        process.exit(0);
      } catch (err) {
        logger.error("Error during database disconnection:", err);
        process.exit(1);
      }
    });
  } else {
    try {
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  }

  // Force close after 10s
  setTimeout(() => {
    logger.warn(
      "Could not close connections in time, forcefully shutting down.",
    );
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
