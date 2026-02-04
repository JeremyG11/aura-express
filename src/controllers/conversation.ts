import { Request, Response } from "express";
import { prisma } from "@/core/db";
import { ApiResponse } from "@/utils/api-response";

/**
 * Get all active conversations for the current user in a specific server
 * GET /api/conversations?serverId={serverId}
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.query;
    const userId = res.locals.userId;

    // Get the current profile
    const profile = await prisma.profile.findFirst({
      where: {
        userId: userId,
      },
      include: {
        members: true,
      },
    });

    console.log(
      `[ConversationController] Profile lookup for userId=${userId}:`,
      profile ? "FOUND" : "NOT FOUND",
    );

    if (!profile) {
      console.warn(
        `[ConversationController] No profile found for userId=${userId} in database.`,
      );
      return ApiResponse.error(res, "Profile not found", 404);
    }

    let memberIds: string[] = [];

    if (serverId) {
      // Get the current member in this specific server
      const currentMember = profile.members.find(
        (m) => m.serverId === (serverId as string),
      );

      if (!currentMember) {
        return ApiResponse.error(res, "Member not found in this server", 404);
      }
      memberIds = [currentMember.id];
    } else {
      // Global: get all member IDs for this profile across all servers
      memberIds = profile.members.map((m) => m.id);
    }

    if (memberIds.length === 0) {
      return ApiResponse.success(res, {
        conversations: [],
        currentMemberId: null,
      });
    }

    // Find all conversations where any of the current user's members are involved
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
            server: true, // Include server info so user knows which server the DM is from
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

    // Filter to only include conversations with at least one message
    // and sort by most recent message
    const activeConversations = conversations
      .filter((conv) => conv.directMessages.length > 0)
      .sort((a, b) => {
        const aTime = a.directMessages[0]?.createdAt.getTime() || 0;
        const bTime = b.directMessages[0]?.createdAt.getTime() || 0;
        return bTime - aTime; // Most recent first
      });

    return ApiResponse.success(res, {
      conversations: activeConversations,
      currentMemberIds: memberIds,
    });
  } catch (error) {
    console.error("[GET_CONVERSATIONS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
