import { prisma } from "@/core/db";
import { events, REACTION_EVENTS } from "@/core/events";
import { getProfileByUserId } from "@/services/profile";
import { NotFoundError } from "@/utils/errors";

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

    // Determine message author for notification
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
