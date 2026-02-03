import { prisma } from "@/core/db";

/**
 * Get profile by user ID
 */
export const getProfileByUserId = async (userId: string) => {
  return await prisma.profile.findUnique({
    where: { userId },
  });
};

/**
 * Get member by user ID and server ID
 */
export const getMemberByUserIdAndServerId = async (
  userId: string,
  serverId: string,
) => {
  return await prisma.member.findFirst({
    where: {
      profile: { userId },
      serverId,
    },
  });
};

/**
 * Get member by user ID and conversation ID
 */
export const getMemberByUserIdAndConversationId = async (
  userId: string,
  conversationId: string,
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      memberOne: true,
      memberTwo: true,
    },
  });

  if (!conversation) {
    return null;
  }

  return await prisma.member.findFirst({
    where: {
      profile: { userId },
      OR: [{ id: conversation.memberOneId }, { id: conversation.memberTwoId }],
    },
  });
};
