import { prisma } from "@/core/db";
import { MemberService } from "@/services/member";
import { events, MESSAGE_EVENTS } from "@/core/events";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/utils/errors";

export class MessageService {
  /**
   * Create a channel message
   */
  public static async createChannelMessage(payload: {
    content: string;
    fileUrl?: string;
    isEncrypted?: boolean;
    parentId?: string;
    serverId: string;
    channelId: string;
    userId: string;
  }) {
    const {
      content,
      fileUrl,
      isEncrypted,
      parentId,
      serverId,
      channelId,
      userId,
    } = payload;

    const member = await MemberService.resolveMember(userId, { serverId });

    if (!member) {
      throw new NotFoundError("Member not found in this server");
    }

    const message = await prisma.message.create({
      data: {
        content,
        fileUrl: fileUrl || null,
        channelId,
        memberId: member.id,
        isEncrypted: !!isEncrypted,
        parentId: parentId || null,
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });

    events.emit(MESSAGE_EVENTS.CREATED, {
      message,
      type: "channel",
      contextId: channelId,
    });
    return message;
  }

  /**
   * Create a direct message
   */
  public static async createDirectMessage(payload: {
    content: string;
    fileUrl?: string;
    isEncrypted?: boolean;
    parentId?: string;
    conversationId: string;
    userId: string;
  }) {
    const { content, fileUrl, isEncrypted, parentId, conversationId, userId } =
      payload;

    const member = await MemberService.resolveMember(userId, {
      conversationId,
    });

    if (!member) {
      throw new NotFoundError("Member not found in conversation");
    }

    const message = await prisma.directMessage.create({
      data: {
        content,
        fileUrl: fileUrl || null,
        conversationId,
        memberId: member.id,
        isEncrypted: !!isEncrypted,
        parentId: parentId || null,
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });

    events.emit(MESSAGE_EVENTS.CREATED, {
      message,
      type: "direct",
      contextId: conversationId,
    });
    return message;
  }

  /**
   * Update a message (Polymorphic)
   */
  public static async updateMessage(payload: {
    messageId: string;
    content: string;
    userId: string;
    serverId?: string;
    conversationId?: string;
  }) {
    const { messageId, content, userId, serverId, conversationId } = payload;

    const member = await MemberService.resolveMember(userId, {
      serverId,
      conversationId,
    });
    if (!member) throw new UnauthorizedError("Member not found");

    if (serverId) {
      const message = await prisma.message.findFirst({
        where: { id: messageId, memberId: member.id, deleted: false },
      });

      if (!message)
        throw new NotFoundError("Message not found or unauthorized");

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { content },
        include: { member: { include: { profile: true } } },
      });

      events.emit(MESSAGE_EVENTS.UPDATED, {
        message: updated,
        type: "channel",
        contextId: message.channelId,
      });
      return updated;
    } else if (conversationId) {
      const message = await prisma.directMessage.findFirst({
        where: { id: messageId, memberId: member.id, deleted: false },
      });

      if (!message)
        throw new NotFoundError("Message not found or unauthorized");

      const updated = await prisma.directMessage.update({
        where: { id: messageId },
        data: { content },
        include: { member: { include: { profile: true } } },
      });

      events.emit(MESSAGE_EVENTS.UPDATED, {
        message: updated,
        type: "direct",
        contextId: conversationId,
      });
      return updated;
    }

    throw new BadRequestError(
      "Context missing (serverId or conversationId required)",
    );
  }

  /**
   * Delete a message (Polymorphic)
   */
  public static async deleteMessage(payload: {
    messageId: string;
    userId: string;
    serverId?: string;
    conversationId?: string;
  }) {
    const { messageId, userId, serverId, conversationId } = payload;

    const member = await MemberService.resolveMember(userId, {
      serverId,
      conversationId,
    });
    if (!member) throw new UnauthorizedError("Member not found");

    if (serverId) {
      const message = await prisma.message.findFirst({
        where: { id: messageId },
        include: { member: true },
      });

      if (!message || message.deleted)
        throw new NotFoundError("Message not found");

      const canDelete =
        message.memberId === member.id ||
        ["ADMIN", "MODERATOR"].includes(member.role);
      if (!canDelete)
        throw new UnauthorizedError("Unauthorized to delete this message");

      const deleted = await prisma.message.update({
        where: { id: messageId },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
          deleted: true,
        },
        include: { member: { include: { profile: true } } },
      });

      events.emit(MESSAGE_EVENTS.UPDATED, {
        message: deleted,
        type: "channel",
        contextId: message.channelId,
      });
      return deleted;
    } else if (conversationId) {
      const message = await prisma.directMessage.findFirst({
        where: { id: messageId, conversationId },
      });

      if (!message || message.deleted)
        throw new NotFoundError("Message not found");
      if (message.memberId !== member.id)
        throw new UnauthorizedError("Unauthorized to delete this message");

      const deleted = await prisma.directMessage.update({
        where: { id: messageId },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
          deleted: true,
        },
        include: { member: { include: { profile: true } } },
      });

      events.emit(MESSAGE_EVENTS.UPDATED, {
        message: deleted,
        type: "direct",
        contextId: conversationId,
      });
      return deleted;
    }

    throw new BadRequestError(
      "Context missing (serverId or conversationId required)",
    );
  }
}
