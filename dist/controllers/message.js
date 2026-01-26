"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = exports.sendMessageController = exports.getConversation = exports.deleteMessage = exports.updateMessage = exports.createDirectMessage = exports.createChannelMessage = void 0;
const db_1 = require("../libs/db");
const conversation_1 = require("../libs/conversation");
// Create a channel message
const createChannelMessage = async (io, req, res) => {
    try {
        const { content, fileUrl, isEncrypted } = req.body;
        const { serverId, channelId } = req.query;
        const userId = res.locals.userId;
        if (!serverId || !channelId) {
            return res.status(400).json({ error: "Server ID or Channel ID missing" });
        }
        if (!content) {
            return res.status(400).json({ error: "Content missing" });
        }
        console.log("[CreateMessage] Attempting with:", {
            userId,
            serverId,
            channelId,
        });
        // Create message (using the shared aura database schema)
        // Note: session userId is User.id, but Member uses Profile.id
        const member = await db_1.prisma.member.findFirst({
            where: {
                profile: {
                    userId: userId,
                },
                serverId: serverId,
            },
        });
        if (!member) {
            console.error("[CreateMessage] Member NOT FOUND in DB for:", {
                userId,
                serverId,
            });
            return res.status(404).json({ error: "Member not found in this server" });
        }
        const message = await db_1.prisma.message.create({
            data: {
                content,
                fileUrl: fileUrl || null,
                channelId: channelId,
                memberId: member.id,
                isEncrypted: !!isEncrypted,
            },
            include: {
                member: {
                    include: {
                        profile: true,
                    },
                },
            },
        });
        const channelKey = `chat:${channelId}:messages`;
        io.emit(channelKey, message);
        return res.status(201).json(message);
    }
    catch (error) {
        console.error("[CREATE_CHANNEL_MESSAGE]", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
exports.createChannelMessage = createChannelMessage;
// Create a direct message
const createDirectMessage = async (io, req, res) => {
    try {
        const { content, fileUrl, isEncrypted } = req.body;
        const { conversationId } = req.query;
        const userId = res.locals.userId;
        if (!conversationId) {
            return res.status(400).json({ error: "Conversation ID missing" });
        }
        if (!content) {
            return res.status(400).json({ error: "Content missing" });
        }
        // Find the member for this conversation
        const conversation = await db_1.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                memberOne: true,
                memberTwo: true,
            },
        });
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        // Determine which member is sending the message
        // Note: session userId is User.id, but Member uses Profile.profileId
        const member = await db_1.prisma.member.findFirst({
            where: {
                profile: {
                    userId: userId,
                },
                OR: [
                    { id: conversation.memberOneId },
                    { id: conversation.memberTwoId },
                ],
            },
        });
        if (!member) {
            return res
                .status(404)
                .json({ error: "Member not found in conversation" });
        }
        // Create direct message
        const message = await db_1.prisma.directMessage.create({
            data: {
                content,
                fileUrl: fileUrl || null,
                conversationId: conversationId,
                memberId: member.id,
                isEncrypted: !!isEncrypted,
            },
            include: {
                member: {
                    include: {
                        profile: true,
                    },
                },
            },
        });
        const channelKey = `chat:${conversationId}:messages`;
        io.emit(channelKey, message);
        return res.status(201).json(message);
    }
    catch (error) {
        console.error("[CREATE_DIRECT_MESSAGE]", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
exports.createDirectMessage = createDirectMessage;
// Update a message
const updateMessage = async (io, req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const { serverId, conversationId } = req.query;
        const userId = res.locals.userId;
        if (!content) {
            return res.status(400).json({ error: "Content missing" });
        }
        if (serverId) {
            // Channel context
            const member = await db_1.prisma.member.findFirst({
                where: {
                    profile: { userId },
                    serverId: serverId,
                },
            });
            if (!member) {
                return res.status(404).json({ error: "Member not found" });
            }
            const message = await db_1.prisma.message.findFirst({
                where: {
                    id: messageId,
                    memberId: member.id,
                    deleted: false,
                },
            });
            if (!message) {
                return res
                    .status(404)
                    .json({ error: "Message not found or unauthorized" });
            }
            const updatedMessage = await db_1.prisma.message.update({
                where: { id: messageId },
                data: { content },
                include: {
                    member: {
                        include: { profile: true },
                    },
                },
            });
            const updateKey = `chat:${message.channelId}:messages:update`;
            io.emit(updateKey, updatedMessage);
            return res.status(200).json(updatedMessage);
        }
        else if (conversationId) {
            // Direct message context
            const member = await db_1.prisma.member.findFirst({
                where: {
                    profile: { userId },
                    OR: [
                        {
                            conversationsInitiated: {
                                some: { id: conversationId },
                            },
                        },
                        {
                            conversationsReceived: { some: { id: conversationId } },
                        },
                    ],
                },
            });
            if (!member) {
                return res
                    .status(404)
                    .json({ error: "Member not found in conversation" });
            }
            const message = await db_1.prisma.directMessage.findFirst({
                where: {
                    id: messageId,
                    memberId: member.id,
                    deleted: false,
                },
            });
            if (!message) {
                return res
                    .status(404)
                    .json({ error: "Message not found or unauthorized" });
            }
            const updatedMessage = await db_1.prisma.directMessage.update({
                where: { id: messageId },
                data: { content },
                include: {
                    member: {
                        include: { profile: true },
                    },
                },
            });
            const updateKey = `chat:${conversationId}:messages:update`;
            io.emit(updateKey, updatedMessage);
            return res.status(200).json(updatedMessage);
        }
        return res
            .status(400)
            .json({ error: "Context missing (serverId or conversationId)" });
    }
    catch (error) {
        console.error("[UPDATE_MESSAGE]", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
exports.updateMessage = updateMessage;
// Delete a message
const deleteMessage = async (io, req, res) => {
    try {
        const { messageId } = req.params;
        const { serverId, conversationId } = req.query;
        const userId = res.locals.userId;
        if (serverId) {
            // Channel context
            const member = await db_1.prisma.member.findFirst({
                where: {
                    profile: { userId },
                    serverId: serverId,
                },
            });
            if (!member) {
                return res.status(404).json({ error: "Member not found" });
            }
            const message = await db_1.prisma.message.findFirst({
                where: {
                    id: messageId,
                },
                include: {
                    member: true,
                },
            });
            if (!message || message.deleted) {
                return res.status(404).json({ error: "Message not found" });
            }
            const isMessageOwner = message.memberId === member.id;
            const isAdmin = member.role === "ADMIN";
            const isModerator = member.role === "MODERATOR";
            if (!isMessageOwner && !isAdmin && !isModerator) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const deletedMessage = await db_1.prisma.message.update({
                where: { id: messageId },
                data: {
                    fileUrl: null,
                    content: "This message has been deleted.",
                    deleted: true,
                },
                include: {
                    member: {
                        include: { profile: true },
                    },
                },
            });
            const updateKey = `chat:${message.channelId}:messages:update`;
            io.emit(updateKey, deletedMessage);
            return res.status(200).json(deletedMessage);
        }
        else if (conversationId) {
            // Direct message context
            const member = await db_1.prisma.member.findFirst({
                where: {
                    profile: { userId },
                    OR: [
                        {
                            conversationsInitiated: {
                                some: { id: conversationId },
                            },
                        },
                        {
                            conversationsReceived: { some: { id: conversationId } },
                        },
                    ],
                },
            });
            if (!member) {
                return res
                    .status(404)
                    .json({ error: "Member not found in conversation" });
            }
            const message = await db_1.prisma.directMessage.findFirst({
                where: {
                    id: messageId,
                    conversationId: conversationId,
                },
            });
            if (!message || message.deleted) {
                return res.status(404).json({ error: "Message not found" });
            }
            if (message.memberId !== member.id) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const deletedMessage = await db_1.prisma.directMessage.update({
                where: { id: messageId },
                data: {
                    fileUrl: null,
                    content: "This message has been deleted.",
                    deleted: true,
                },
                include: {
                    member: {
                        include: { profile: true },
                    },
                },
            });
            const updateKey = `chat:${conversationId}:messages:update`;
            io.emit(updateKey, deletedMessage);
            return res.status(200).json(deletedMessage);
        }
        return res
            .status(400)
            .json({ error: "Context missing (serverId or conversationId)" });
    }
    catch (error) {
        console.error("[DELETE_MESSAGE]", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
exports.deleteMessage = deleteMessage;
// Legacy controllers (keep for backward compatibility)
const getConversation = async (req, res) => {
    const { receiverId } = req.query;
    try {
        const conversation = await (0, conversation_1.findOrCreateConversation)(res.locals.userId, receiverId);
        res.status(200).json(conversation);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
};
exports.getConversation = getConversation;
const sendMessageController = async (io, req, res) => {
    try {
        const { message } = req.body;
        const { receiverId } = req.query;
        const userId = res.locals.userId;
        const conversation = await (0, conversation_1.findOrCreateConversation)(userId, receiverId);
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        // Determine which member is sending the message
        const member = conversation.memberOne.profileId === userId
            ? conversation.memberOne
            : conversation.memberTwo;
        const result = await db_1.prisma.directMessage.create({
            data: {
                content: message,
                conversationId: conversation.id,
                memberId: member.id,
            },
            include: {
                member: {
                    include: {
                        profile: true,
                    },
                },
            },
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.sendMessageController = sendMessageController;
const getMessages = async (io, req, res) => {
    const { receiverId } = req.query;
    try {
        const conversation = await (0, conversation_1.findOrCreateConversation)(res.locals.userId, receiverId);
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        const messages = await db_1.prisma.directMessage.findMany({
            where: {
                conversationId: conversation.id,
            },
            include: {
                member: {
                    include: {
                        profile: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.status(200).json(messages);
    }
    catch (error) {
        console.log("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getMessages = getMessages;
//# sourceMappingURL=message.js.map