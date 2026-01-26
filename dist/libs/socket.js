"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = exports.io = void 0;
const socket_io_1 = require("socket.io");
const auth_1 = require("./auth");
const conversation_1 = require("./conversation");
const db_1 = require("./db");
const logger_1 = __importDefault(require("./logger"));
const node_1 = require("better-auth/node");
const initializeSocket = (httpServer, allowedOrigins) => {
    exports.io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
            methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"],
        allowEIO3: true,
    });
    //  middleware for io
    exports.io.use(async (socket, next) => {
        logger_1.default.info("[Socket.io] New connection attempt");
        const session = await auth_1.auth.api.getSession({
            headers: (0, node_1.fromNodeHeaders)(socket.handshake.headers),
        });
        if (!session) {
            logger_1.default.warn("[Socket.io] Unauthenticated connection attempt rejected");
            return next(new Error("Authentication failed"));
        }
        socket.user = {
            id: session.user.id,
            name: session.user.name,
            imageUrl: session.user.image || "",
            email: session.user.email,
        };
        logger_1.default.info(`[Socket.io] User authenticated: ${socket.user.id}`);
        next();
    });
    // on socket connection
    exports.io.on("connection", (socket) => {
        logger_1.default.info(`[Socket.io] Client connected: ${socket.id}`);
        socket.join(socket.user?.id);
        // A catch-all listener
        socket.onAny((event, ...args) => {
            logger_1.default.info(event, args);
        });
        const activeUsers = [];
        for (let [id, socket] of exports.io.of("/").sockets) {
            activeUsers.push({
                socketId: id,
                ...socket.handshake.auth,
            });
        }
        socket.emit("active-users", activeUsers);
        socket.broadcast.emit("user connected", {
            socketId: socket.id,
            userData: { ...socket.handshake.auth },
        });
        // session
        socket.emit("session", {
            user: socket.user,
        });
        // Listening to Direct Messages
        socket.on("private message", async ({ content, to }) => {
            exports.io.to(to)
                .to(socket.user.id)
                .emit("private message", {
                ...content,
                from: socket.user,
                to,
            });
            logger_1.default.info(socket.user.id);
            // message to database
            try {
                const conversation = await (0, conversation_1.findOrCreateConversation)(socket.user.id, to);
                if (!conversation)
                    return;
                const member = conversation.memberOne.profileId === socket.user.id
                    ? conversation.memberOne
                    : conversation.memberTwo;
                await db_1.prisma.directMessage.create({
                    data: {
                        content: content.content || content, // Handle both object and string
                        conversationId: conversation.id,
                        memberId: member.id,
                    },
                });
            }
            catch (err) {
                logger_1.default.error(err);
            }
        });
        // mark as read
        socket.on("markAsRead", async ({ senderId }) => {
            try {
                const receiverId = socket.user.id;
                // Update all messages from senderId to receiverId in their conversation
                await db_1.prisma.directMessage.updateMany({
                    where: {
                        member: {
                            profileId: senderId,
                        },
                        conversation: {
                            OR: [
                                { memberOneId: receiverId, memberTwoId: senderId },
                                { memberOneId: senderId, memberTwoId: receiverId },
                            ],
                        },
                        seen: false,
                    },
                    data: {
                        seen: true,
                    },
                });
                // Notify the sender that their messages were read
                exports.io.to(senderId).emit("markAsRead", { senderId, receiverId });
            }
            catch (error) {
                logger_1.default.error("❌ Error marking messages as read:", error);
            }
        });
        // typing
        socket.on("typing", (to) => {
            socket.broadcast.to(to).emit("broadcast typing", {});
        });
        //  notifications
        const notifications = [];
        socket.on("notification", (arg) => {
            // send it to users
            socket.broadcast.to(arg.to).emit("notification", arg.notification);
        });
        // Handle notification acknowledgment
        socket.on("notification-acknowledgment", (notificationId) => {
            // const notification = notifications.find((n) => n.id === notificationId);
            // if (notification) {
            //   notification.seen = true;
            // }
        });
        // Disconnect user
        socket.on("disconnect", async () => {
            const matchingSockets = await exports.io.in(socket.user.id).fetchSockets();
            // const isDisconnected = matchingSockets.size === 0;
            // if (isDisconnected) {
            //   socket.broadcast.emit("user disconnected", socket.user.id);
            //   // update the connection status of the session
            // }
        });
    });
};
exports.initializeSocket = initializeSocket;
//# sourceMappingURL=socket.js.map