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

    if (!serverId) {
      return res.status(400).json({ error: "Server ID missing" });
    }

    // Get the current member in this server
    const currentMember = await prisma.member.findFirst({
      where: {
        serverId: serverId as string,
        profile: {
          userId: userId,
        },
      },
    });

    if (!currentMember) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Find all conversations where the current member is involved
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { memberOneId: currentMember.id },
          { memberTwoId: currentMember.id },
        ],
      },
      include: {
        memberOne: {
          include: {
            profile: true,
          },
        },
        memberTwo: {
          include: {
            profile: true,
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
      currentMemberId: currentMember.id,
    });
  } catch (error) {
    console.error("[GET_CONVERSATIONS]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
