import { Request, Response } from "express";
import { prisma } from "@/shared/core/db";
import { ApiResponse } from "@/shared/utils/api-response";
import logger from "@/shared/core/logger";

/**
 * Get current user profile
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    return ApiResponse.success(res, user);
  } catch (error) {
    logger.error("[GET_CURRENT_USER]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
