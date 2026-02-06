import { Server } from "socket.io";
import logger from "@/shared/core/logger";

class SocketService {
  private io: Server | null = null;

  /**
   * Initialize the service with the Socket.IO instance
   */
  public initialize(io: Server): void {
    this.io = io;
    logger.info("[SocketService] Initialized");
  }

  /**
   * Emit a message to a specific room or channel
   */
  public emit(event: string, data: any, room?: string): void {
    if (!this.io) {
      logger.error("[SocketService] Called before initialization");
      return;
    }

    if (room) {
      this.io.to(room).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }

  /**
   * Emit a chat message to a channel or conversation
   */
  public emitChatMessage(
    contextId: string,
    event: "messages" | "messages:update",
    data: any,
  ): void {
    const eventKey = `chat:${contextId}:${event}`;
    this.emit(eventKey, data);
  }

  /**
   * Emit a notification to a specific user
   */
  public emitNotification(userId: string, data: any): void {
    this.emit("notification:new", data, `user:${userId}`);
  }
}

export const socketService = new SocketService();
