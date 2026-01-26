import { prisma } from "../libs/db";
import { NotificationWithUpdates } from "types";

export const updateNotification = async ({
  id,
  updates,
}: NotificationWithUpdates) => {
  try {
    await prisma.notification.update({
      where: {
        id: id,
      },
      data: {
        ...updates,
      },
    });
  } catch (err) {
    throw err;
  }
};

export const saveNotification = async (
  senderId: string,
  receiverId: string,
  content: string
) => {
  try {
    if (!receiverId || !senderId || !content) {
      throw new Error("Notification's senderId or receiverId is missing");
    }
    const notification = await prisma.notification.create({
      data: {
        content: content,
        senderId: senderId,
        receiverId: receiverId,
      },
    });
    return notification;
  } catch (err) {
    throw err;
  }
};

export const getNotifications = async (receiverId: string) => {
  try {
    const lstestNotifications = await prisma.notification.findMany({
      where: {
        receiverId,
        isSeen: false,
      },
    });
    return lstestNotifications;
  } catch (err: any) {
    console.log(err);
    throw err;
  }
};
