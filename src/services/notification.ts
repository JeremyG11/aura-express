import { prisma } from "@/core/db";
import logger from "@/core/logger";
import { socketService } from "@/services/socket";
import { NotificationType } from "@prisma/client";

export class NotificationService {
  /**
   * Create a notification and emit it via socket
   */
  public static async createNotification(payload: {
    type: NotificationType;
    content: string;
    senderId: string;
    receiverId: string;
    messageId?: string;
    channelId?: string;
    serverId?: string;
    conversationId?: string;
    emoji?: string;
  }) {
    try {
      const {
        senderId,
        receiverId,
        messageId,
        channelId,
        serverId,
        conversationId,
        emoji,
        ...rest
      } = payload;

      const notification = await prisma.notification.create({
        data: {
          ...rest,
          sender: { connect: { id: senderId } },
          receiver: { connect: { id: receiverId } },
          messageId,
          channelId,
          serverId,
          conversationId,
          emoji,
        },
      });

      // Find the receiver's userId to emit the notification
      const receiverProfile = await prisma.profile.findUnique({
        where: { id: receiverId },
      });

      if (receiverProfile) {
        socketService.emitNotification(receiverProfile.userId, notification);
      }

      return notification;
    } catch (error) {
      logger.error("[NotificationService] Error creating notification", error);
      throw error;
    }
  }
}
