import { prisma } from "@/shared/core/db";

/**
 * Service for handling member-related logic
 */
export class MemberService {
  /**
   * Resolve a member from a userId and context
   */
  public static async resolveMember(
    userId: string,
    context: { serverId?: string; conversationId?: string },
  ) {
    const { serverId, conversationId } = context;

    if (serverId) {
      return await prisma.member.findFirst({
        where: {
          serverId,
          profile: { userId },
        },
        include: { profile: true },
      });
    }

    if (conversationId) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          memberOne: { include: { profile: true } },
          memberTwo: { include: { profile: true } },
        },
      });

      if (!conversation) return null;

      if (conversation.memberOne.profile.userId === userId) {
        return conversation.memberOne;
      }
      if (conversation.memberTwo.profile.userId === userId) {
        return conversation.memberTwo;
      }
    }

    return null;
  }
}
