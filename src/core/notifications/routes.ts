import { Router } from "express";
import * as controllers from "./controllers";

const router = Router();

router.get("/notifications", controllers.getNotifications);
router.get("/notifications/unread-count", controllers.getUnreadCount);
router.patch("/notifications/:notificationId/read", controllers.markAsRead);
router.patch("/notifications/mark-all-read", controllers.markAllAsRead);
router.delete("/notifications/:notificationId", controllers.deleteNotification);
router.delete("/notifications/delete-all", controllers.deleteAllNotifications);

export default router;
