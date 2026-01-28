import logger from "@/core/logger";
import { prisma } from "@/core/db";
import { ApiResponse } from "@/utils/api-response";

/**
 * Update user status and return all online users
 * Note: This is currently used as a direct service-like function, but let's standardize it.
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
