import { z } from "zod";

/**
 * Schema for creating a channel message
 */
export const createChannelMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(5000),
    fileUrl: z.string().url().optional().nullable(),
    isEncrypted: z.boolean().optional(),
  }),
  query: z.object({
    serverId: z.string().min(1),
    channelId: z.string().min(1),
  }),
});

/**
 * Schema for creating a direct message
 */
export const createDirectMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(5000),
    fileUrl: z.string().url().optional().nullable(),
    isEncrypted: z.boolean().optional(),
  }),
  query: z.object({
    conversationId: z.string().min(1),
  }),
});

export const updateMessageSchema = z.object({
  params: z.object({
    messageId: z.string().min(1),
  }),
  body: z.object({
    content: z.string().min(1).max(5000),
  }),
  query: z.object({
    serverId: z.string().optional(),
    channelId: z.string().optional(),
    conversationId: z.string().optional(),
  }),
});

/**
 * Schema for deleting a message
 */
export const deleteMessageSchema = z.object({
  params: z.object({
    messageId: z.string().min(1),
  }),
  query: z.object({
    serverId: z.string().optional(),
    channelId: z.string().optional(),
    conversationId: z.string().optional(),
  }),
});

// Backward compatibility or other uses
export const conversationSchema = z.object({
  query: z.object({
    receiverId: z.string().min(1),
  }),
});

export const sendMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1),
  }),
  query: z.object({
    receiverId: z.string().min(1),
  }),
});
