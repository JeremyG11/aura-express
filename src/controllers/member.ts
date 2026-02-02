import { prisma } from "@/core/db";
import { Request, Response } from "express";
import { ApiResponse } from "@/utils/api-response";

export const getServerMembers = async (req: Request, res: Response) => {
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

    const members = await prisma.member.findMany({
      where: {
        serverId,
      },
      include: {
        profile: true,
      },
      orderBy: {
        role: "asc",
      },
    });

    return ApiResponse.success(res, members);
  } catch (error) {
    console.error("[GET_SERVER_MEMBERS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
