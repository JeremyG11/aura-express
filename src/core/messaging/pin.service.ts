import { prisma } from "@/shared/core/db";
import { MemberService } from "@/core/servers/services";
import {
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
} from "@/shared/utils/errors";

export class PinService {
  /**
   * Pin a message
   */
  public static async pinMessage(payload: {
    messageId: string;
    userId: string;
    serverId?: string;
    conversationId?: string;
  }) {
    return this.setPinStatus({ ...payload, isPinned: true });
  }

  /**
   * Unpin a message
   */
  public static async unpinMessage(payload: {
    messageId: string;
    userId: string;
    serverId?: string;
    conversationId?: string;
  }) {
    return this.setPinStatus({ ...payload, isPinned: false });
  }

  /**
   * Shared logic for pinning/unpinning (DRY)
   */
  private static async setPinStatus(payload: {
    messageId: string;
    userId: string;
    isPinned: boolean;
    serverId?: string;
    conversationId?: string;
  }) {
    const { messageId, userId, isPinned, serverId, conversationId } = payload;

    const member = await MemberService.resolveMember(userId, {
      serverId,
      conversationId,
    });

    if (!member) throw new UnauthorizedError("Member not found");

    if (serverId) {
      // In servers, only Admin/Moderator can pin
      if (!["ADMIN", "MODERATOR"].includes(member.role)) {
        throw new UnauthorizedError(
          "Insufficient permissions to manage pinned messages",
        );
      }

      const message = await prisma.message.findFirst({
        where: { id: messageId, channel: { serverId } },
      });

      if (!message) throw new NotFoundError("Message not found in this server");

      return await prisma.message.update({
        where: { id: messageId },
        data: { isPinned },
        include: { member: { include: { profile: true } } },
      });
    } else if (conversationId) {
      // In DMs, either participant can pin
      const message = await prisma.directMessage.findFirst({
        where: { id: messageId, conversationId },
      });

      if (!message)
        throw new NotFoundError("Message not found in this conversation");

      return await prisma.directMessage.update({
        where: { id: messageId },
        data: { isPinned },
        include: { member: { include: { profile: true } } },
      });
    }

    throw new BadRequestError(
      "Context missing (serverId or conversationId required)",
    );
  }
}
