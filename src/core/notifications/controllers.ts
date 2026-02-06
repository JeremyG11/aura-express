import { Request, Response } from "express";
import { prisma } from "@/shared/core/db";
import { ApiResponse } from "@/shared/utils/api-response";
import logger from "@/shared/core/logger";

/**
 * Get notifications for the current user
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      return ApiResponse.error(res, "Profile not found", 404);
    }

    const notifications = await prisma.notification.findMany({
      where: { receiverId: profile.id },
      include: {
        sender: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ApiResponse.success(res, notifications);
  } catch (error) {
    logger.error("[GET_NOTIFICATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      return ApiResponse.error(res, "Profile not found", 404);
    }

    const count = await prisma.notification.count({
      where: {
        receiverId: profile.id,
        isRead: false,
      },
    });

    return ApiResponse.success(res, { count });
  } catch (error) {
    logger.error("[GET_UNREAD_COUNT]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        receiverId: profile.id,
      },
      data: { isRead: true },
    });

    return ApiResponse.success(
      res,
      notification,
      "Notification marked as read",
    );
  } catch (error) {
    logger.error("[MARK_AS_READ]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);

    await prisma.notification.updateMany({
      where: {
        receiverId: profile.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return ApiResponse.success(
      res,
      { success: true },
      "All notifications marked as read",
    );
  } catch (error) {
    logger.error("[MARK_ALL_AS_READ]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);

    await prisma.notification.delete({
      where: {
        id: notificationId,
        receiverId: profile.id,
      },
    });

    return ApiResponse.success(res, { success: true }, "Notification deleted");
  } catch (error) {
    logger.error("[DELETE_NOTIFICATION]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Delete all notifications for current user
 */
export const deleteAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);

    await prisma.notification.deleteMany({
      where: { receiverId: profile.id },
    });

    return ApiResponse.success(
      res,
      { success: true },
      "All notifications deleted",
    );
  } catch (error) {
    logger.error("[DELETE_ALL_NOTIFICATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
