import { CustomSocket } from "@/shared/types";
import { auth } from "@/core/auth/config";
import { fromNodeHeaders } from "better-auth/node";
import logger from "@/shared/core/logger";

/**
 * Socket.IO authentication middleware
 */
export const socketAuthMiddleware = async (
  socket: CustomSocket,
  next: (err?: Error) => void,
) => {
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
};
