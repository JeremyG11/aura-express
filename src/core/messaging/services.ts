import { prisma } from "@/shared/core/db";
import {
  events,
  MESSAGE_EVENTS,
  REACTION_EVENTS,
  POLL_EVENTS,
} from "@/shared/core/events";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/shared/utils/errors";
import { MemberService } from "@/core/servers/services";
import { getProfileByUserId } from "@/core/users/services";
import { PollService } from "./poll.service";

/**
 * Service for handling message logic
 */
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
    poll?: {
      question: string;
      options: string[];
      expiresAt?: Date;
    };
  }) {
    const {
      content,
      fileUrl,
      isEncrypted,
      parentId,
      serverId,
      channelId,
      userId,
      poll,
    } = payload;

    const member = await MemberService.resolveMember(userId, { serverId });

    if (!member) {
      throw new NotFoundError("Member not found in this server");
    }

    console.time(
      `[MessageService.createChannelMessage] DB Create with Poll: ${userId}`,
    );
    const message = await prisma.message.create({
      data: {
        content,
        fileUrl: fileUrl || null,
        channelId,
        memberId: member.id,
        isEncrypted: !!isEncrypted,
        parentId: parentId || null,
        ...(poll && {
          poll: {
            create: {
              question: poll.question,
              expiresAt: poll.expiresAt,
              options: {
                create: poll.options.map((text) => ({ text })),
              },
            },
          },
        }),
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
        poll: {
          include: {
            options: {
              include: {
                votes: true,
                _count: {
                  select: { votes: true },
                },
              },
            },
          },
        },
      },
    });
    console.timeEnd(
      `[MessageService.createChannelMessage] DB Create with Poll: ${userId}`,
    );

    events.emit(MESSAGE_EVENTS.CREATED, {
      message,
      type: "channel",
      contextId: channelId,
    });
    return message;

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
    poll?: {
      question: string;
      options: string[];
      expiresAt?: Date;
    };
  }) {
    const {
      content,
      fileUrl,
      isEncrypted,
      parentId,
      conversationId,
      userId,
      poll,
    } = payload;

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
        ...(poll && {
          poll: {
            create: {
              question: poll.question,
              expiresAt: poll.expiresAt,
              options: {
                create: poll.options.map((text) => ({ text })),
              },
            },
          },
        }),
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
        poll: {
          include: {
            options: {
              include: {
                votes: true,
                _count: {
                  select: { votes: true },
                },
              },
            },
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

/**
 * Find or create a conversation between two members
 */
export const findOrCreateConversation = async (
  memberOneId: string,
  memberTwoId: string,
) => {
  let conversation = await findConversation(memberOneId, memberTwoId);

  if (!conversation) {
    conversation = await createNewConversation(memberOneId, memberTwoId);
  }

  return conversation;
};

const findConversation = async (memberOneId: string, memberTwoId: string) => {
  try {
    return await prisma.conversation.findFirst({
      where: {
        OR: [
          { AND: [{ memberOneId }, { memberTwoId }] },
          { AND: [{ memberOneId: memberTwoId }, { memberTwoId: memberOneId }] },
        ],
      },
      include: {
        memberOne: {
          include: {
            profile: true,
          },
        },
        memberTwo: {
          include: {
            profile: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error finding conversation:", error);
    return null;
  }
};

const createNewConversation = async (
  memberOneId: string,
  memberTwoId: string,
) => {
  try {
    return await prisma.conversation.create({
      data: {
        memberOneId,
        memberTwoId,
      },
      include: {
        memberOne: {
          include: {
            profile: true,
          },
        },
        memberTwo: {
          include: {
            profile: true,
          },
        },
      },
    });
  } catch {
    return null;
  }
};

/**
 * Service for handling reactions
 */
export class ReactionService {
  /**
   * Add a reaction to a message
   */
  public static async addReaction(payload: {
    userId: string;
    emoji: string;
    messageId?: string;
    directMessageId?: string;
  }) {
    const { userId, emoji, messageId, directMessageId } = payload;

    const profile = await getProfileByUserId(userId);
    if (!profile) throw new NotFoundError("Profile not found");

    let authorProfileId: string | null = null;
    let authorUserId: string | null = null;

    if (messageId) {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { member: { include: { profile: true } } },
      });
      authorProfileId = message?.member.profile.id || null;
      authorUserId = message?.member.profile.userId || null;
    } else if (directMessageId) {
      const directMessage = await prisma.directMessage.findUnique({
        where: { id: directMessageId },
        include: { member: { include: { profile: true } } },
      });
      authorProfileId = directMessage?.member.profile.id || null;
      authorUserId = directMessage?.member.profile.userId || null;
    }

    const existingReaction = await prisma.reaction.findFirst({
      where: {
        profileId: profile.id,
        messageId,
        directMessageId,
      },
    });

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        await prisma.reaction.delete({
          where: { id: existingReaction.id },
        });

        events.emit(REACTION_EVENTS.REMOVED, { reaction: existingReaction });
        return null;
      }

      const oldReaction = { ...existingReaction };

      const updatedReaction = await prisma.reaction.update({
        where: { id: existingReaction.id },
        data: { emoji },
        include: {
          profile: {
            select: { id: true, name: true, imageUrl: true },
          },
        },
      });

      events.emit(REACTION_EVENTS.REMOVED, { reaction: oldReaction });
      events.emit(REACTION_EVENTS.ADDED, {
        reaction: updatedReaction,
        authorProfileId,
        authorUserId,
        senderProfileId: profile.id,
      });

      return updatedReaction;
    }

    const reaction = await prisma.reaction.create({
      data: {
        emoji,
        profileId: profile.id,
        messageId,
        directMessageId,
      },
      include: {
        profile: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
    });

    events.emit(REACTION_EVENTS.ADDED, {
      reaction,
      authorProfileId,
      authorUserId,
      senderProfileId: profile.id,
    });

    return reaction;
  }

  /**
   * Remove a reaction
   */
  public static async removeReaction(payload: {
    userId: string;
    reactionId: string;
  }) {
    const { userId, reactionId } = payload;

    const profile = await getProfileByUserId(userId);
    if (!profile) throw new NotFoundError("Profile not found");

    const reaction = await prisma.reaction.delete({
      where: {
        id: reactionId,
        profileId: profile.id,
      },
    });

    events.emit(REACTION_EVENTS.REMOVED, { reaction });
    return reaction;
  }
}
