import { Request, Response } from "express";
import { prisma } from "@/core/db";
import { ReactionService } from "@/services/reaction";
import { ApiResponse } from "@/utils/api-response";
import logger from "@/core/logger";

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

    // Group reactions by emoji
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
