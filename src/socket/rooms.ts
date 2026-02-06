import { Server } from "socket.io";
import { CustomSocket } from "@/shared/types";
import logger from "@/shared/core/logger";

/**
 * Register room management socket event handlers
 */
export const registerRoomHandlers = (io: Server, socket: CustomSocket) => {
  socket.on("join-room", (room) => {
    socket.join(room);
    logger.info(`[Socket] User ${socket.user.id} joined room ${room}`);
  });

  socket.on("leave-room", (room) => {
    socket.leave(room);
    logger.info(`[Socket] User ${socket.user.id} left room ${room}`);
  });
};
