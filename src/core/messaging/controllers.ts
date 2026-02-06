import { Request, Response } from "express";
import { prisma } from "@/shared/core/db";
import { ApiResponse } from "@/shared/utils/api-response";
import logger from "@/shared/core/logger";
import { MessageService } from "./services";
import { PinService } from "./pin.service";
import { PollService } from "./poll.service";
import { findOrCreateConversation } from "./services";
import { events, POLL_EVENTS, MESSAGE_EVENTS } from "@/shared/core/events";
import axios from "axios";

/**
 * Create a channel message
 */
export const createChannelMessage = async (req: Request, res: Response) => {
  try {
    const { content, fileUrl, isEncrypted, parentId, poll } = req.body;
    const { serverId, channelId } = req.query;
    const userId = res.locals.userId;

    if (!serverId || !channelId) {
      return ApiResponse.error(res, "Server ID or Channel ID missing", 400);
    }

    console.time(`[CREATE_CHANNEL_MESSAGE] Total: ${userId}`);
    const message = await MessageService.createChannelMessage({
      content,
      fileUrl,
      isEncrypted,
      parentId,
      serverId: serverId as string,
      channelId: channelId as string,
      userId,
      poll,
    });
    console.timeEnd(`[CREATE_CHANNEL_MESSAGE] Total: ${userId}`);

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
    const { content, fileUrl, isEncrypted, parentId, poll } = req.body;
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
      poll,
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

/**
 * Get a conversation between two users
 */
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

/**
 * Send a message (Legacy/Shortcut)
 */
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

/**
 * Get messages for a channel or conversation
 */
export const getMessages = async (req: Request, res: Response) => {
  const { receiverId, channelId, cursor } = req.query;
  const MESSAGES_BATCH = 10;

  try {
    let messages = [];

    if (channelId) {
      messages = await prisma.message.findMany({
        take: MESSAGES_BATCH,
        ...(cursor && { skip: 1, cursor: { id: cursor as string } }),
        where: { channelId: channelId as string },
        include: {
          member: { include: { profile: true } },
          poll: {
            include: {
              options: {
                include: {
                  votes: true,
                  _count: { select: { votes: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (receiverId) {
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

/**
 * Get all active conversations for the current user
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.query;
    const userId = res.locals.userId;

    const profile = await prisma.profile.findFirst({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        userId: true,
        members: serverId
          ? {
              where: { serverId: serverId as string },
              select: { id: true, serverId: true },
            }
          : {
              select: { id: true, serverId: true },
            },
      },
    });

    if (!profile) {
      logger.warn(
        `[ConversationController] No profile found for userId=${userId}`,
      );
      return ApiResponse.error(res, "Profile not found", 404);
    }

    let memberIds: string[] = [];

    if (serverId) {
      const currentMember = profile.members.find(
        (m) => m.serverId === (serverId as string),
      );

      if (!currentMember) {
        return ApiResponse.error(res, "Member not found in this server", 404);
      }
      memberIds = [currentMember.id];
    } else {
      memberIds = profile.members.map((m) => m.id);
    }

    if (memberIds.length === 0) {
      return ApiResponse.success(res, {
        conversations: [],
        currentMemberId: null,
      });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { memberOneId: { in: memberIds } },
          { memberTwoId: { in: memberIds } },
        ],
      },
      include: {
        memberOne: {
          include: {
            profile: true,
            server: true,
          },
        },
        memberTwo: {
          include: {
            profile: true,
            server: true,
          },
        },
        directMessages: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    const activeConversations = conversations
      .filter((conv) => conv.directMessages.length > 0)
      .sort((a, b) => {
        const aTime = a.directMessages[0]?.createdAt.getTime() || 0;
        const bTime = b.directMessages[0]?.createdAt.getTime() || 0;
        return bTime - aTime;
      });

    return ApiResponse.success(res, {
      conversations: activeConversations,
      currentMemberIds: memberIds,
    });
  } catch (error) {
    logger.error("[GET_CONVERSATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Get thread metadata for a channel message
 */
export const getChannelThreadMetadata = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return ApiResponse.error(res, "Message ID missing", 400);
    }

    const replies = await prisma.message.findMany({
      where: {
        parentId: messageId,
        deleted: false,
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

    const participantsMap = new Map();
    replies.forEach((reply) => {
      if (!participantsMap.has(reply.member.profile.id)) {
        participantsMap.set(reply.member.profile.id, {
          id: reply.member.profile.id,
          name: reply.member.profile.name,
          imageUrl: reply.member.profile.imageUrl,
        });
      }
    });

    const participants = Array.from(participantsMap.values());
    const lastReplyAt = replies.length > 0 ? replies[0].createdAt : null;

    return ApiResponse.success(res, {
      replyCount: replies.length,
      participants,
      lastReplyAt,
    });
  } catch (error) {
    logger.error("[GET_CHANNEL_THREAD_METADATA]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Get thread metadata for a direct message
 */
export const getDirectThreadMetadata = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return ApiResponse.error(res, "Message ID missing", 400);
    }

    const replies = await prisma.directMessage.findMany({
      where: {
        parentId: messageId,
        deleted: false,
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

    const participantsMap = new Map();
    replies.forEach((reply) => {
      if (!participantsMap.has(reply.member.profile.id)) {
        participantsMap.set(reply.member.profile.id, {
          id: reply.member.profile.id,
          name: reply.member.profile.name,
          imageUrl: reply.member.profile.imageUrl,
        });
      }
    });

    const participants = Array.from(participantsMap.values());
    const lastReplyAt = replies.length > 0 ? replies[0].createdAt : null;

    return ApiResponse.success(res, {
      replyCount: replies.length,
      participants,
      lastReplyAt,
    });
  } catch (error) {
    logger.error("[GET_DIRECT_THREAD_METADATA]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Add emoji reaction to message
 */
export const addReaction = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);

    const { emoji, messageId, directMessageId } = req.body;

    if (!emoji || (!messageId && !directMessageId)) {
      return ApiResponse.error(res, "Missing required fields", 400);
    }

    const reaction = await ReactionService.addReaction({
      userId,
      emoji,
      messageId,
      directMessageId,
    });

    return ApiResponse.success(res, reaction, "Reaction added");
  } catch (error: any) {
    logger.error("[ADD_REACTION]", error);
    const status = error.message === "Profile not found" ? 404 : 500;
    return ApiResponse.error(
      res,
      error.message || "Internal server error",
      status,
    );
  }
};

/**
 * Remove reaction
 */
export const removeReaction = async (req: Request, res: Response) => {
  try {
    const { reactionId } = req.params;
    const userId = res.locals.userId;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);

    await ReactionService.removeReaction({
      userId,
      reactionId,
    });

    return ApiResponse.success(res, { success: true }, "Reaction removed");
  } catch (error: any) {
    logger.error("[REMOVE_REACTION]", error);
    const status = error.message === "Profile not found" ? 404 : 500;
    return ApiResponse.error(
      res,
      error.message || "Internal server error",
      status,
    );
  }
};

/**
 * Get all reactions for a message
 */
export const getMessageReactions = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { type } = req.query; // "channel" or "direct"

    const reactions = await prisma.reaction.findMany({
      where: type === "direct" ? { directMessageId: messageId } : { messageId },
      include: {
        profile: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const groupedReactions = reactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = [];
        }
        acc[reaction.emoji].push(reaction);
        return acc;
      },
      {} as Record<string, typeof reactions>,
    );

    return ApiResponse.success(res, groupedReactions);
  } catch (error) {
    logger.error("[GET_MESSAGE_REACTIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Get link preview for a URL
 */
export const getLinkPreview = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      return ApiResponse.error(res, "URL is required", 400);
    }

    const apiKey = process.env.OPENGRAPH_IO_KEY;

    if (!apiKey) {
      logger.error("[LinkPreview] OPENGRAPH_IO_KEY is missing");
      return ApiResponse.error(
        res,
        "Link preview service is not configured.",
        500,
      );
    }

    const opengraphUrl = `https://opengraph.io/api/1.1/site/${encodeURIComponent(url)}?app_id=${apiKey}`;
    const response = await axios.get(opengraphUrl, { timeout: 10000 });
    const data = response.data;

    if (data.error) {
      return ApiResponse.error(res, data.error.message, 400);
    }

    const hybrid = data.hybridGraph || {};
    const openGraph = data.openGraph || {};
    const htmlInferred = data.htmlInferred || {};

    let fallbackTitle = url;
    try {
      fallbackTitle = new URL(url).hostname;
    } catch (e) {
      /* Ignore */
    }

    return ApiResponse.success(
      res,
      {
        title:
          hybrid.title ||
          openGraph.title ||
          htmlInferred.title ||
          fallbackTitle,
        description:
          hybrid.description ||
          openGraph.description ||
          htmlInferred.description ||
          "",
        image: hybrid.image || openGraph.image || htmlInferred.image || null,
        favIcon: data.favicon || null,
        url: data.url || url,
      },
      "Link preview fetched",
    );
  } catch (error: any) {
    logger.error(`[LinkPreview] Error: ${error.message}`);
    return ApiResponse.error(res, "Failed to fetch link preview");
  }
};

const ReactionService = {
  addReaction: async (payload: any) => {
    // This will be properly defined in services.ts, but for now we keep the reference
    // Actually, I should probably call the real service in services.ts
    const { ReactionService: RealReactionService } = require("./services");
    return await RealReactionService.addReaction(payload);
  },
  removeReaction: async (payload: any) => {
    const { ReactionService: RealReactionService } = require("./services");
    return await RealReactionService.removeReaction(payload);
  },
};

/**
 * Pin a message
 */
export const pinMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;

    const message = await PinService.pinMessage({
      messageId,
      userId,
      serverId: serverId as string,
      conversationId: conversationId as string,
    });

    events.emit(MESSAGE_EVENTS.UPDATED, {
      message,
      type: serverId ? "channel" : "direct",
      contextId: serverId
        ? (message as any).channelId
        : (message as any).conversationId,
    });

    return ApiResponse.success(res, message, "Message pinned");
  } catch (error: any) {
    logger.error("[PIN_MESSAGE]", error);
    return ApiResponse.error(res, error.message || "Internal server error");
  }
};

/**
 * Unpin a message
 */
export const unpinMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;

    const message = await PinService.unpinMessage({
      messageId,
      userId,
      serverId: serverId as string,
      conversationId: conversationId as string,
    });

    events.emit(MESSAGE_EVENTS.UPDATED, {
      message,
      type: serverId ? "channel" : "direct",
      contextId: serverId
        ? (message as any).channelId
        : (message as any).conversationId,
    });

    return ApiResponse.success(res, message, "Message unpinned");
  } catch (error: any) {
    logger.error("[UNPIN_MESSAGE]", error);
    return ApiResponse.error(res, error.message || "Internal server error");
  }
};

/**
 * Cast a vote in a poll
 */
export const castPollVote = async (req: Request, res: Response) => {
  try {
    const { pollId } = req.params;
    const { optionId } = req.body;
    const userId = res.locals.userId;

    if (!optionId) {
      return ApiResponse.error(res, "Option ID missing", 400);
    }

    await PollService.castVote({
      pollId,
      userId,
      optionId,
    });

    const updatedPoll = await PollService.getPollResults(pollId);

    events.emit(POLL_EVENTS.VOTED, { poll: updatedPoll });

    return ApiResponse.success(res, updatedPoll, "Vote cast successfully");
  } catch (error: any) {
    logger.error("[CAST_POLL_VOTE]", error);
    return ApiResponse.error(res, error.message || "Internal server error");
  }
};
