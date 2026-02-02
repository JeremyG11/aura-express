import { prisma } from "@/core/db";
import { Request, Response } from "express";
import { ApiResponse } from "@/utils/api-response";

export const getServerChannels = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const userId = res.locals.userId;

    if (!serverId) {
      return ApiResponse.error(res, "Server ID missing", 400);
    }

    // Check if the user is a member of the server
    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: {
          userId,
        },
      },
    });

    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }

    const channels = await prisma.channel.findMany({
      where: {
        serverId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return ApiResponse.success(res, channels);
  } catch (error) {
    console.error("[GET_SERVER_CHANNELS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
