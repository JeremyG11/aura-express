"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = require("express-rate-limit");
const socket_1 = __importDefault(require("./routes/socket"));
const conversation_1 = require("./libs/conversation");
const db_1 = require("./libs/db");
const errorHandler_1 = require("./middlewares/errorHandler");
const authMiddleware_1 = require("./middlewares/authMiddleware");
const logger_1 = __importDefault(require("./libs/logger"));
const node_1 = require("better-auth/node");
const auth_1 = require("./libs/auth");
dotenv_1.default.config();
const port = process.env.PORT || 7272;
exports.app = (0, express_1.default)();
// CORS configuration - support multiple origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000"];
// middlewares
exports.app.use(express_1.default.json());
exports.app.use((0, cookie_parser_1.default)());
exports.app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
// Basic request logging
exports.app.use((req, res, next) => {
    logger_1.default.info(`[Request] ${req.method} ${req.url}`);
    next();
});
// Rate limiting to prevent DoS/Brute-force
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
});
exports.app.use(limiter);
// Better Auth route
exports.app.all("/api/auth/*", (0, node_1.toNodeHandler)(auth_1.auth));
// Session introspection endpoint for aura server-side auth
exports.app.get("/api/auth/session", async (req, res) => {
    const internalSecret = req.headers["x-internal-secret"];
    if (internalSecret !== process.env.SERVER_INTERNAL_SECRET) {
        logger_1.default.warn(`[Auth] Forbidden introspection attempt from ${req.ip}`);
        return res
            .status(403)
            .json({ error: "Forbidden - Invalid internal secret" });
    }
    const session = await auth_1.auth.api.getSession({
        headers: req.headers,
    });
    res.json({ data: session });
});
// Health check endpoint (Public)
exports.app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Apply global auth middleware from here onwards
exports.app.use(authMiddleware_1.authMiddleware);
// Protected Routes
exports.app.use("/api/messages", socket_1.default);
const server = http_1.default.createServer(exports.app);
exports.io = new socket_io_1.Server(server, {
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
    console.log("[Socket.io] New connection attempt");
    const session = await auth_1.auth.api.getSession({
        headers: fromNodeHeaders(socket.handshake.headers),
    });
    if (!session) {
        console.warn("[Socket.io] Unauthenticated connection attempt rejected");
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
function fromNodeHeaders(nodeHeaders) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(nodeHeaders)) {
        if (Array.isArray(value)) {
            value.forEach((v) => headers.append(key, v));
        }
        else if (value) {
            headers.set(key, value);
        }
    }
    return headers;
}
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
// Centralized error handling (MUST be after all routes)
exports.app.use(errorHandler_1.errorHandler);
//  Express listen
let httpServer;
if (process.env.NODE_ENV !== "test") {
    httpServer = server.listen(Number(port), "0.0.0.0", () => {
        logger_1.default.info(`⚡ Server is ready on port:${port} 🔥`);
        logger_1.default.info(`Allowed origins: ${allowedOrigins}`);
    });
}
// Graceful shutdown
const shutdown = async (signal) => {
    logger_1.default.info(`\n[${signal}] Shutting down gracefully...`);
    if (httpServer) {
        httpServer.close(async () => {
            logger_1.default.info("Http server closed.");
            try {
                await db_1.prisma.$disconnect();
                logger_1.default.info("Database connection closed.");
                process.exit(0);
            }
            catch (err) {
                logger_1.default.error("Error during database disconnection:", err);
                process.exit(1);
            }
        });
    }
    else {
        try {
            await db_1.prisma.$disconnect();
            process.exit(0);
        }
        catch (err) {
            process.exit(1);
        }
    }
    // Force close after 10s
    setTimeout(() => {
        logger_1.default.warn("Could not close connections in time, forcefully shutting down.");
        process.exit(1);
    }, 10000);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
//# sourceMappingURL=server.js.map