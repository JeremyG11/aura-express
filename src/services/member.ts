import { prisma } from "@/core/db";
import { Member } from "@prisma/client";

export class MemberService {
  /**
   * Resolves a member context from either serverId or conversationId
   */
  public static async resolveMember(
    userId: string,
    options: { serverId?: string; conversationId?: string },
  ): Promise<Member | null> {
    const { serverId, conversationId } = options;

    if (serverId) {
      return await prisma.member.findFirst({
        where: {
          profile: { userId },
          serverId,
        },
      });
    }

    if (conversationId) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          memberOne: true,
          memberTwo: true,
        },
      });

      if (!conversation) return null;

      return await prisma.member.findFirst({
        where: {
          profile: { userId },
          OR: [
            { id: conversation.memberOneId },
            { id: conversation.memberTwoId },
          ],
        },
      });
    }

    return null;
  }
}
