import { Server } from "socket.io";
import { CustomSocket } from "@/shared/types";
import { prisma } from "@/shared/core/db";
import logger from "@/shared/core/logger";
import { findOrCreateConversation } from "@/core/messaging/services";

/**
 * Register message-related socket event handlers
 */
export const registerMessageHandlers = (io: Server, socket: CustomSocket) => {
  // Private message handler
  socket.on("private message", async ({ content, to }) => {
    io.to(to)
      .to(socket.user.id)
      .emit("private message", {
        ...content,
        from: socket.user,
        to,
      });

    logger.info(`[Socket] Private message from ${socket.user.id} to ${to}`);

    // Save message to database
    try {
      const conversation = await findOrCreateConversation(socket.user.id, to);
      if (!conversation) return;

      const member =
        conversation.memberOne.profileId === socket.user.id
          ? conversation.memberOne
          : conversation.memberTwo;

      await prisma.directMessage.create({
        data: {
          content: content.content || content,
          conversationId: conversation.id,
          memberId: member.id,
        },
      });
    } catch (err) {
      logger.error("[Socket] Error saving private message:", err);
    }
  });

  // Mark messages as read
  socket.on("markAsRead", async ({ senderId }) => {
    try {
      const receiverId = socket.user.id;

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

      io.to(senderId).emit("markAsRead", { senderId, receiverId });
    } catch (error) {
      logger.error("[Socket] Error marking messages as read:", error);
    }
  });
};
