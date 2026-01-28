import { Request, Response } from "express";
import { MessageService } from "@/services/message";
import { findOrCreateConversation } from "@/services/conversation";
import { ApiResponse } from "@/utils/api-response";
import logger from "@/core/logger";
import { prisma } from "@/core/db";

/**
 * Create a channel message
 */
export const createChannelMessage = async (req: Request, res: Response) => {
  try {
    const { content, fileUrl, isEncrypted, parentId } = req.body;
    const { serverId, channelId } = req.query;
    const userId = res.locals.userId;

    if (!serverId || !channelId) {
      return ApiResponse.error(res, "Server ID or Channel ID missing", 400);
    }

    const message = await MessageService.createChannelMessage({
      content,
      fileUrl,
      isEncrypted,
      parentId,
      serverId: serverId as string,
      channelId: channelId as string,
      userId,
    });

    return ApiResponse.success(res, message, "Message created", 201);
  } catch (error: any) {
    logger.error("[CREATE_CHANNEL_MESSAGE]", error);
    const status =
      error.message === "Member not found in this server" ? 404 : 500;
    return ApiResponse.error(
      res,
      error.message || "Internal server error",
      status,
    );
  }
};

/**
 * Create a direct message
 */
export const createDirectMessage = async (req: Request, res: Response) => {
  try {
    const { content, fileUrl, isEncrypted, parentId } = req.body;
    const { conversationId } = req.query;
    const userId = res.locals.userId;

    if (!conversationId) {
      return ApiResponse.error(res, "Conversation ID missing", 400);
    }

    const message = await MessageService.createDirectMessage({
      content,
      fileUrl,
      isEncrypted,
      parentId,
      conversationId: conversationId as string,
      userId,
    });

    return ApiResponse.success(res, message, "Direct message created", 201);
  } catch (error: any) {
    logger.error("[CREATE_DIRECT_MESSAGE]", error);
    const status =
      error.message === "Member not found in conversation" ? 404 : 500;
    return ApiResponse.error(
      res,
      error.message || "Internal server error",
      status,
    );
  }
};

/**
 * Update a message
 */
export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;

    if (!content) {
      return ApiResponse.error(res, "Content missing", 400);
    }

    const updatedMessage = await MessageService.updateMessage({
      messageId,
      content,
      userId,
      serverId: serverId as string,
      conversationId: conversationId as string,
    });

    return ApiResponse.success(res, updatedMessage, "Message updated");
  } catch (error: any) {
    logger.error("[UPDATE_MESSAGE]", error);
    return ApiResponse.error(res, error.message || "Internal server error");
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;

    const deletedMessage = await MessageService.deleteMessage({
      messageId,
      userId,
      serverId: serverId as string,
      conversationId: conversationId as string,
    });

    return ApiResponse.success(res, deletedMessage, "Message deleted");
  } catch (error: any) {
    logger.error("[DELETE_MESSAGE]", error);
    return ApiResponse.error(res, error.message || "Internal server error");
  }
};

// --- Legacy controllers (Consider refactoring these into MessageService later) ---

export const getConversation = async (req: Request, res: Response) => {
  const { receiverId } = req.query;
  try {
    const conversation = await findOrCreateConversation(
      res.locals.userId,
      receiverId as string,
    );
    return ApiResponse.success(res, conversation);
  } catch (err: any) {
    logger.error(err);
    return ApiResponse.error(res, err.message);
  }
};

export const sendMessageController = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const { receiverId } = req.query;
    const userId = res.locals.userId;

    const conversation = await findOrCreateConversation(
      userId,
      receiverId as string,
    );
    if (!conversation)
      return ApiResponse.error(res, "Conversation not found", 404);

    const result = await MessageService.createDirectMessage({
      content: message,
      conversationId: conversation.id,
      userId,
    });

    return ApiResponse.success(res, result, "Message sent", 201);
  } catch (error: any) {
    logger.error(error);
    return ApiResponse.error(res, error.message || "Internal server error");
  }
};

export const getMessages = async (req: Request, res: Response) => {
  const { receiverId, channelId, cursor } = req.query;
  const MESSAGES_BATCH = 10;

  try {
    let messages = [];

    if (channelId) {
      // Fetch channel messages
      messages = await prisma.message.findMany({
        take: MESSAGES_BATCH,
        ...(cursor && { skip: 1, cursor: { id: cursor as string } }),
        where: { channelId: channelId as string },
        include: { member: { include: { profile: true } } },
        orderBy: { createdAt: "desc" },
      });
    } else if (receiverId) {
      // Fetch direct messages
      const conversation = await findOrCreateConversation(
        res.locals.userId,
        receiverId as string,
      );

      if (!conversation) {
        return ApiResponse.error(res, "Conversation not found", 404);
      }

      messages = await prisma.directMessage.findMany({
        take: MESSAGES_BATCH,
        ...(cursor && { skip: 1, cursor: { id: cursor as string } }),
        where: { conversationId: conversation.id },
        include: { member: { include: { profile: true } } },
        orderBy: { createdAt: "desc" },
      });
    } else {
      return ApiResponse.error(res, "receiverId or channelId required", 400);
    }

    let nextCursor = null;
    if (messages.length === MESSAGES_BATCH) {
      nextCursor = messages[MESSAGES_BATCH - 1].id;
    }

    return ApiResponse.success(res, {
      items: messages,
      nextCursor,
    });
  } catch (error) {
    logger.error("[GET_MESSAGES]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
