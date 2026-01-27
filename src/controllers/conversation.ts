import { Request, Response } from "express";
import { prisma } from "../libs/db";

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

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    let memberIds: string[] = [];

    if (serverId) {
      // Get the current member in this specific server
      const currentMember = profile.members.find(
        (m) => m.serverId === (serverId as string),
      );

      if (!currentMember) {
        return res
          .status(404)
          .json({ error: "Member not found in this server" });
      }
      memberIds = [currentMember.id];
    } else {
      // Global: get all member IDs for this profile across all servers
      memberIds = profile.members.map((m) => m.id);
    }

    if (memberIds.length === 0) {
      return res.status(200).json({ conversations: [], currentMemberId: null });
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

    return res.status(200).json({
      conversations: activeConversations,
      // For global, we might not have a single currentMemberId that makes sense
      // if we're rendering multiple conversations from different servers.
      // But we can return the array of memberIds or handle it in the frontend.
      currentMemberIds: memberIds,
    });
  } catch (error) {
    console.error("[GET_CONVERSATIONS]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
