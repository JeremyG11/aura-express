"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = exports.saveNotification = exports.updateNotification = void 0;
const db_1 = require("../libs/db");
const updateNotification = async ({ id, updates, }) => {
    try {
        await db_1.prisma.notification.update({
            where: {
                id: id,
            },
            data: {
                ...updates,
            },
        });
    }
    catch (err) {
        throw err;
    }
};
exports.updateNotification = updateNotification;
const saveNotification = async (senderId, receiverId, content) => {
    try {
        if (!receiverId || !senderId || !content) {
            throw new Error("Notification's senderId or receiverId is missing");
        }
        const notification = await db_1.prisma.notification.create({
            data: {
                content: content,
                senderId: senderId,
                receiverId: receiverId,
            },
        });
        return notification;
    }
    catch (err) {
        throw err;
    }
};
exports.saveNotification = saveNotification;
const getNotifications = async (receiverId) => {
    try {
        const lstestNotifications = await db_1.prisma.notification.findMany({
            where: {
                receiverId,
                isSeen: false,
            },
        });
        return lstestNotifications;
    }
    catch (err) {
        console.log(err);
        throw err;
    }
};
exports.getNotifications = getNotifications;
//# sourceMappingURL=notification.js.map