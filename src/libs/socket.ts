import http from "http";
import "@/events/message.handler";
import { Server } from "socket.io";
import { auth } from "@/core/auth";
import { prisma } from "@/core/db";
import logger from "@/core/logger";
import { Application } from "express";
import { CustomSocket } from "@/types";
import { socketService } from "@/services/socket";
import { fromNodeHeaders } from "better-auth/node";
import { findOrCreateConversation } from "@/services/conversation";

export let io: Server;

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

  // Initialize SocketService
  socketService.initialize(io);

  // Attach io instance to Express app so controllers can access it
  app.set("io", io);

  //  middleware for io
  io.use(async (socket: CustomSocket, next) => {
    logger.info("[Socket.io] New connection attempt");

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(socket.handshake.headers),
    });

    if (!session) {
      logger.warn("[Socket.io] Unauthenticated connection attempt rejected");
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

  // on socket connection
  io.on("connection", (socket: CustomSocket) => {
    logger.info(`[Socket.io] Client connected: ${socket.id}`);
    socket.join(socket.user?.id as string);

    // Update user status to online
    prisma.user
      .update({
        where: { id: socket.user.id },
        data: { isOnline: true },
      })
      .catch((err) =>
        logger.error(
          `[Socket.io] Error updating online status for ${socket.user.id}:`,
          err,
        ),
      );

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

    // Room management
    socket.on("join-room", (room) => {
      socket.join(room);
      logger.info(`[Socket.io] User ${socket.user.id} joined room ${room}`);
    });

    socket.on("leave-room", (room) => {
      socket.leave(room);
      logger.info(`[Socket.io] User ${socket.user.id} left room ${room}`);
    });

    // Disconnect user
    socket.on("disconnect", async () => {
      logger.info(`[Socket.io] Client disconnected: ${socket.id}`);

      const userId = socket.user.id;
      const matchingSockets = await io.in(userId).fetchSockets();
      const isStillConnected = matchingSockets.length > 0;

      if (!isStillConnected) {
        logger.info(
          `[Socket.io] Last connection for user ${userId} closed. Marking offline.`,
        );
        try {
          await (prisma.user.update as any)({
            where: { id: userId },
            data: {
              isOnline: false,
              lastSeenAt: new Date(),
            },
          });
          socket.broadcast.emit("user disconnected", userId);
        } catch (err) {
          logger.error(
            `[Socket.io] Error updating offline status for ${userId}:`,
            err,
          );
        }
      }
    });
  });
};
