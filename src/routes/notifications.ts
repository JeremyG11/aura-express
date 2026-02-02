import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "@/controllers/notification";

import { authMiddleware } from "@/middlewares/authMiddleware";

const router: Router = Router();

// Apply auth middleware to all notification routes
router.use(authMiddleware);

// Get all notifications
router.get("/", getNotifications);

// Get unread count
router.get("/unread-count", getUnreadCount);

// Mark notification as read
router.patch("/:notificationId/read", markAsRead);

// Mark all as read
router.patch("/mark-all-read", markAllAsRead);

// Delete notification
router.delete("/:notificationId", deleteNotification);

// Delete all notifications
router.delete("/delete-all", deleteAllNotifications);

export default router;
