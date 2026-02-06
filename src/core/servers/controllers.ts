import { Request, Response } from "express";
import { prisma } from "@/shared/core/db";
import { ApiResponse } from "@/shared/utils/api-response";
import logger from "@/shared/core/logger";

/**
 * Get channel information
 */
export const getChannel = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });
    return ApiResponse.success(res, channel);
  } catch (error) {
    logger.error("[GET_CHANNEL]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Get all channels for a server
 */
export const getServerChannels = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const userId = res.locals.userId;

    if (!serverId) {
      return ApiResponse.error(res, "Server ID missing", 400);
    }

    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
      },
    });

    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }

    const channels = await prisma.channel.findMany({
      where: { serverId },
      orderBy: { createdAt: "asc" },
    });

    return ApiResponse.success(res, channels);
  } catch (error) {
    logger.error("[GET_SERVER_CHANNELS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Get member information
 */
export const getMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { profile: true },
    });
    return ApiResponse.success(res, member);
  } catch (error) {
    logger.error("[GET_MEMBER]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Get all members for a server
 */
export const getServerMembers = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const userId = res.locals.userId;

    if (!serverId) {
      return ApiResponse.error(res, "Server ID missing", 400);
    }

    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
      },
    });

    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }

    const members = await prisma.member.findMany({
      where: { serverId },
      include: { profile: true },
      orderBy: { role: "asc" },
    });

    return ApiResponse.success(res, members);
  } catch (error) {
    logger.error("[GET_SERVER_MEMBERS]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Create a new channel
 */
export const createChannel = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.query;
    const { name, type } = req.body;
    const userId = res.locals.userId;

    if (!serverId || typeof serverId !== "string") {
      return ApiResponse.error(res, "Server ID missing", 400);
    }

    if (!name) {
      return ApiResponse.error(res, "Channel name is required", 400);
    }

    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
        role: { in: ["ADMIN", "MODERATOR"] },
      },
    });

    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }

    const server = await prisma.server.update({
      where: { id: serverId },
      data: {
        channels: {
          create: {
            name,
            type: type || "TEXT",
            profileId: currentMember.profileId,
          },
        },
      },
      include: {
        channels: { orderBy: { createdAt: "asc" } },
        members: { include: { profile: true }, orderBy: { role: "asc" } },
      },
    });

    return ApiResponse.success(res, server);
  } catch (error) {
    logger.error("[CREATE_CHANNEL]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Update a channel
 */
export const updateChannel = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { serverId } = req.query;
    const { name, type } = req.body;
    const userId = res.locals.userId;

    if (!serverId || typeof serverId !== "string") {
      return ApiResponse.error(res, "Server ID missing", 400);
    }

    if (!channelId) {
      return ApiResponse.error(res, "Channel ID missing", 400);
    }

    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
        role: { in: ["ADMIN", "MODERATOR"] },
      },
    });

    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, serverId },
    });

    if (!channel) {
      return ApiResponse.error(res, "Channel not found", 404);
    }

    if (channel.name === "general") {
      return ApiResponse.error(res, "Cannot edit general channel", 400);
    }

    const server = await prisma.server.update({
      where: { id: serverId },
      data: {
        channels: {
          update: {
            where: { id: channelId },
            data: { name, type },
          },
        },
      },
      include: {
        channels: { orderBy: { createdAt: "asc" } },
        members: { include: { profile: true }, orderBy: { role: "asc" } },
      },
    });

    return ApiResponse.success(res, server);
  } catch (error) {
    logger.error("[UPDATE_CHANNEL]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Delete a channel
 */
export const deleteChannel = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { serverId } = req.query;
    const userId = res.locals.userId;

    if (!serverId || typeof serverId !== "string") {
      return ApiResponse.error(res, "Server ID missing", 400);
    }

    if (!channelId) {
      return ApiResponse.error(res, "Channel ID missing", 400);
    }

    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
        role: { in: ["ADMIN", "MODERATOR"] },
      },
    });

    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, serverId },
    });

    if (!channel) {
      return ApiResponse.error(res, "Channel not found", 404);
    }

    if (channel.name === "general") {
      return ApiResponse.error(res, "Cannot delete general channel", 400);
    }

    const server = await prisma.server.update({
      where: { id: serverId },
      data: {
        channels: {
          delete: { id: channelId },
        },
      },
      include: {
        channels: { orderBy: { createdAt: "asc" } },
        members: { include: { profile: true }, orderBy: { role: "asc" } },
      },
    });

    return ApiResponse.success(res, server);
  } catch (error) {
    logger.error("[DELETE_CHANNEL]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Update member role
 */
export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { serverId } = req.query;
    const { role } = req.body;
    const userId = res.locals.userId;

    if (!serverId || typeof serverId !== "string") {
      return ApiResponse.error(res, "Server ID missing", 400);
    }

    if (!memberId) {
      return ApiResponse.error(res, "Member ID missing", 400);
    }

    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
        role: "ADMIN",
      },
    });

    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }

    const server = await prisma.server.update({
      where: { id: serverId },
      data: {
        members: {
          update: {
            where: { id: memberId },
            data: { role },
          },
        },
      },
      include: {
        channels: { orderBy: { createdAt: "asc" } },
        members: { include: { profile: true }, orderBy: { role: "asc" } },
      },
    });

    return ApiResponse.success(res, server);
  } catch (error) {
    logger.error("[UPDATE_MEMBER_ROLE]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};

/**
 * Kick member from server
 */
export const kickMember = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { serverId } = req.query;
    const userId = res.locals.userId;

    if (!serverId || typeof serverId !== "string") {
      return ApiResponse.error(res, "Server ID missing", 400);
    }

    if (!memberId) {
      return ApiResponse.error(res, "Member ID missing", 400);
    }

    const currentMember = await prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
        role: "ADMIN",
      },
    });

    if (!currentMember) {
      return ApiResponse.error(res, "Forbidden", 403);
    }

    const server = await prisma.server.update({
      where: { id: serverId },
      data: {
        members: {
          delete: { id: memberId },
        },
      },
      include: {
        channels: { orderBy: { createdAt: "asc" } },
        members: { include: { profile: true }, orderBy: { role: "asc" } },
      },
    });

    return ApiResponse.success(res, server);
  } catch (error) {
    logger.error("[KICK_MEMBER]", error);
    return ApiResponse.error(res, "Internal server error");
  }
};
