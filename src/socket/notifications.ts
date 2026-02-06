import { Server } from "socket.io";
import { CustomSocket } from "@/shared/types";

/**
 * Register notification-related socket event handlers
 */
export const registerNotificationHandlers = (
  io: Server,
  socket: CustomSocket,
) => {
  socket.on("notification", (arg) => {
    socket.broadcast.to(arg.to).emit("notification", arg.notification);
  });
};
