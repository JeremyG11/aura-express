import { prisma } from "@/shared/core/db";
import logger from "@/shared/core/logger";

/**
 * Get profile by userId
 */
export const getProfileByUserId = async (userId: string) => {
  return await prisma.profile.findFirst({
    where: { userId },
  });
};

/**
 * Get profile with servers
 */
export const getProfileWithServers = async (userId: string) => {
  return await prisma.profile.findFirst({
    where: { userId },
    include: {
      members: {
        include: {
          server: true,
        },
      },
    },
  });
};

/**
 * Update user status and return all online users
 */
export const updateUserStatus = async (userId: string, status: boolean) => {
  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isOnline: status,
      },
    });

    const onlineUsers = await prisma.user.findMany({
      where: {
        isOnline: true,
      },
    });

    return onlineUsers;
  } catch (error) {
    logger.error("[UPDATE_USER_STATUS]", error);
    throw error;
  }
};
