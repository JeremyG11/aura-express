import { Server } from "socket.io";
import { CustomSocket } from "@/shared/types";
import { prisma } from "@/shared/core/db";
import logger from "@/shared/core/logger";

/**
 * Register presence-related socket event handlers
 * Handles online status, typing indicators, and active users
 */
export const registerPresenceHandlers = (io: Server, socket: CustomSocket) => {
  // Update user status to online (non-blocking)
  prisma.user
    .update({
      where: { id: socket.user.id },
      data: { isOnline: true },
    })
    .catch((err) =>
      logger.error(
        `[Socket] Error updating online status for ${socket.user.id}:`,
        err,
      ),
    );

  // Send active users list
  const activeUsers = [];
  for (let [id, socket] of io.of("/").sockets) {
    activeUsers.push({
      socketId: id,
      ...socket.handshake.auth,
    });
  }
  socket.emit("active-users", activeUsers);

  // Broadcast user connected
  socket.broadcast.emit("user connected", {
    socketId: socket.id,
    userData: { ...socket.handshake.auth },
  });

  // Send session info
  socket.emit("session", {
    user: socket.user,
  });

  // Typing indicator
  socket.on("typing", (to) => {
    socket.broadcast.to(to).emit("broadcast typing", {});
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    logger.info(`[Socket] Client disconnected: ${socket.id}`);

    const userId = socket.user.id;
    const matchingSockets = await io.in(userId).fetchSockets();
    const isStillConnected = matchingSockets.length > 0;

    if (!isStillConnected) {
      logger.info(
        `[Socket] Last connection for user ${userId} closed. Marking offline.`,
      );

      // Non-blocking status update
      (prisma.user.update as any)({
        where: { id: userId },
        data: {
          isOnline: false,
          lastSeenAt: new Date(),
        },
      }).catch((err: any) =>
        logger.error(
          `[Socket] Error updating offline status for ${userId}:`,
          err,
        ),
      );

      socket.broadcast.emit("user disconnected", userId);
    }
  });
};
