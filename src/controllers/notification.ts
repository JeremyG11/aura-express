import { Request, Response } from "express";

import { prisma } from "@/core/db";
import logger from "@/core/logger";
import { ApiResponse } from "@/utils/api-response";
import { getProfileByUserId } from "@/services/profile";

// Get all notifications for current user
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);

    if (!prisma.notification) {
      logger.error(
        "[ERROR] prisma.notification is UNDEFINED. Current models:",
        Object.keys(prisma),
      );
      return ApiResponse.error(
        res,
        "Database model 'notification' not found in Prisma client",
        500,
      );
    }

    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);

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
    console.error("[GET_NOTIFICATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// Get unread notification count
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);

    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);

    const count = await prisma.notification.count({
      where: {
        receiverId: profile.id,
        isRead: false,
      },
    });

    return ApiResponse.success(res, { count });
  } catch (error) {
    console.error("[GET_UNREAD_COUNT]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);

    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        receiverId: profile.id,
      },
      data: { isRead: true },
    });

    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:read", notification);

    return ApiResponse.success(
      res,
      notification,
      "Notification marked as read",
    );
  } catch (error) {
    console.error("[MARK_AS_READ]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);

    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);

    await prisma.notification.updateMany({
      where: {
        receiverId: profile.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:all-read");

    return ApiResponse.success(
      res,
      { success: true },
      "All notifications marked as read",
    );
  } catch (error) {
    console.error("[MARK_ALL_AS_READ]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// Delete a notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);

    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);

    await prisma.notification.delete({
      where: {
        id: notificationId,
        receiverId: profile.id,
      },
    });

    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:deleted", {
      id: notificationId,
    });

    return ApiResponse.success(res, { success: true }, "Notification deleted");
  } catch (error) {
    console.error("[DELETE_NOTIFICATION]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// Delete all notifications for current user
export const deleteAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);

    const profile = await getProfileByUserId(userId);
    if (!profile) return ApiResponse.error(res, "Profile not found", 404);

    await prisma.notification.deleteMany({
      where: { receiverId: profile.id },
    });

    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("notification:all-deleted");

    return ApiResponse.success(
      res,
      { success: true },
      "All notifications deleted",
    );
  } catch (error) {
    console.error("[DELETE_ALL_NOTIFICATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// Helper function to create a notification
export const createNotification = async (data: {
  type: "MENTION" | "REPLY" | "REACTION" | "THREAD_REPLY";
  content: string;
  senderId: string;
  receiverId: string;
  messageId?: string;
  channelId?: string;
  serverId?: string;
  conversationId?: string;
  emoji?: string;
}) => {
  try {
    const notification = await prisma.notification.create({
      data,
      include: {
        sender: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
    });

    return notification;
  } catch (error) {
    console.error("[CREATE_NOTIFICATION]", error);
    throw error;
  }
};
