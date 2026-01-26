"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageSchema = exports.conversationSchema = exports.deleteMessageSchema = exports.updateMessageSchema = exports.createDirectMessageSchema = exports.createChannelMessageSchema = void 0;
const zod_1 = require("zod");
/**
 * Schema for creating a channel message
 */
exports.createChannelMessageSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1).max(5000),
        fileUrl: zod_1.z.string().url().optional().nullable(),
        isEncrypted: zod_1.z.boolean().optional(),
    }),
    query: zod_1.z.object({
        serverId: zod_1.z.string().min(1),
        channelId: zod_1.z.string().min(1),
    }),
});
/**
 * Schema for creating a direct message
 */
exports.createDirectMessageSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1).max(5000),
        fileUrl: zod_1.z.string().url().optional().nullable(),
        isEncrypted: zod_1.z.boolean().optional(),
    }),
    query: zod_1.z.object({
        conversationId: zod_1.z.string().min(1),
    }),
});
exports.updateMessageSchema = zod_1.z.object({
    params: zod_1.z.object({
        messageId: zod_1.z.string().min(1),
    }),
    body: zod_1.z.object({
        content: zod_1.z.string().min(1).max(5000),
    }),
    query: zod_1.z.object({
        serverId: zod_1.z.string().optional(),
        channelId: zod_1.z.string().optional(),
        conversationId: zod_1.z.string().optional(),
    }),
});
/**
 * Schema for deleting a message
 */
exports.deleteMessageSchema = zod_1.z.object({
    params: zod_1.z.object({
        messageId: zod_1.z.string().min(1),
    }),
    query: zod_1.z.object({
        serverId: zod_1.z.string().optional(),
        channelId: zod_1.z.string().optional(),
        conversationId: zod_1.z.string().optional(),
    }),
});
// Backward compatibility or other uses
exports.conversationSchema = zod_1.z.object({
    query: zod_1.z.object({
        receiverId: zod_1.z.string().min(1),
    }),
});
exports.sendMessageSchema = zod_1.z.object({
    body: zod_1.z.object({
        message: zod_1.z.string().min(1),
    }),
    query: zod_1.z.object({
        receiverId: zod_1.z.string().min(1),
    }),
});
//# sourceMappingURL=message.schema.js.map