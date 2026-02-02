import { Request, Response } from "express";
import { prisma } from "@/core/db";
import { ApiResponse } from "@/utils/api-response";

// Get thread metadata for a channel message
export const getChannelThreadMetadata = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return ApiResponse.error(res, "Message ID missing", 400);
    }

    // Get all replies to this message
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

    // Extract unique participants
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
    console.error("[GET_CHANNEL_THREAD_METADATA]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

// Get thread metadata for a direct message
export const getDirectThreadMetadata = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return ApiResponse.error(res, "Message ID missing", 400);
    }

    // Get all replies to this message
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

    // Extract unique participants
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
    console.error("[GET_DIRECT_THREAD_METADATA]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
