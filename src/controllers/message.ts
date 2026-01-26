import { Server } from "socket.io";
import { prisma } from "../libs/db";
import { Request, Response } from "express";
import { findOrCreateConversation } from "../libs/conversation";

// Create a channel message
export const createChannelMessage = async (
  io: Server,
  req: Request,
  res: Response,
) => {
  try {
    const { content, fileUrl, isEncrypted } = req.body;
    const { serverId, channelId } = req.query;
    const userId = res.locals.userId;

    if (!serverId || !channelId) {
      return res.status(400).json({ error: "Server ID or Channel ID missing" });
    }

    if (!content) {
      return res.status(400).json({ error: "Content missing" });
    }

    console.log("[CreateMessage] Attempting with:", {
      userId,
      serverId,
      channelId,
    });

    // Create message (using the shared aura database schema)
    // Note: session userId is User.id, but Member uses Profile.id
    const member = await prisma.member.findFirst({
      where: {
        profile: {
          userId: userId,
        },
        serverId: serverId as string,
      },
    });

    if (!member) {
      console.error("[CreateMessage] Member NOT FOUND in DB for:", {
        userId,
        serverId,
      });
      return res.status(404).json({ error: "Member not found in this server" });
    }

    const message = await prisma.message.create({
      data: {
        content,
        fileUrl: fileUrl || null,
        channelId: channelId as string,
        memberId: member.id,
        isEncrypted: !!isEncrypted,
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });

    const channelKey = `chat:${channelId}:messages`;
    io.emit(channelKey, message);

    return res.status(201).json(message);
  } catch (error) {
    console.error("[CREATE_CHANNEL_MESSAGE]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Create a direct message
export const createDirectMessage = async (
  io: Server,
  req: Request,
  res: Response,
) => {
  try {
    const { content, fileUrl, isEncrypted } = req.body;
    const { conversationId } = req.query;
    const userId = res.locals.userId;

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID missing" });
    }

    if (!content) {
      return res.status(400).json({ error: "Content missing" });
    }

    // Find the member for this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId as string },
      include: {
        memberOne: true,
        memberTwo: true,
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Determine which member is sending the message
    // Note: session userId is User.id, but Member uses Profile.profileId
    const member = await prisma.member.findFirst({
      where: {
        profile: {
          userId: userId,
        },
        OR: [
          { id: conversation.memberOneId },
          { id: conversation.memberTwoId },
        ],
      },
    });

    if (!member) {
      return res
        .status(404)
        .json({ error: "Member not found in conversation" });
    }

    // Create direct message
    const message = await prisma.directMessage.create({
      data: {
        content,
        fileUrl: fileUrl || null,
        conversationId: conversationId as string,
        memberId: member.id,
        isEncrypted: !!isEncrypted,
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });

    const channelKey = `chat:${conversationId}:messages`;
    io.emit(channelKey, message);

    return res.status(201).json(message);
  } catch (error) {
    console.error("[CREATE_DIRECT_MESSAGE]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Update a message
export const updateMessage = async (
  io: Server,
  req: Request,
  res: Response,
) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;

    if (!content) {
      return res.status(400).json({ error: "Content missing" });
    }

    if (serverId) {
      // Channel context
      const member = await prisma.member.findFirst({
        where: {
          profile: { userId },
          serverId: serverId as string,
        },
      });

      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          memberId: member.id,
          deleted: false,
        },
      });

      if (!message) {
        return res
          .status(404)
          .json({ error: "Message not found or unauthorized" });
      }

      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { content },
        include: {
          member: {
            include: { profile: true },
          },
        },
      });

      const updateKey = `chat:${message.channelId}:messages:update`;
      io.emit(updateKey, updatedMessage);
      return res.status(200).json(updatedMessage);
    } else if (conversationId) {
      // Direct message context
      const member = await prisma.member.findFirst({
        where: {
          profile: { userId },
          OR: [
            {
              conversationsInitiated: {
                some: { id: conversationId as string },
              },
            },
            {
              conversationsReceived: { some: { id: conversationId as string } },
            },
          ],
        },
      });

      if (!member) {
        return res
          .status(404)
          .json({ error: "Member not found in conversation" });
      }

      const message = await prisma.directMessage.findFirst({
        where: {
          id: messageId,
          memberId: member.id,
          deleted: false,
        },
      });

      if (!message) {
        return res
          .status(404)
          .json({ error: "Message not found or unauthorized" });
      }

      const updatedMessage = await prisma.directMessage.update({
        where: { id: messageId },
        data: { content },
        include: {
          member: {
            include: { profile: true },
          },
        },
      });

      const updateKey = `chat:${conversationId}:messages:update`;
      io.emit(updateKey, updatedMessage);
      return res.status(200).json(updatedMessage);
    }

    return res
      .status(400)
      .json({ error: "Context missing (serverId or conversationId)" });
  } catch (error) {
    console.error("[UPDATE_MESSAGE]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a message
export const deleteMessage = async (
  io: Server,
  req: Request,
  res: Response,
) => {
  try {
    const { messageId } = req.params;
    const { serverId, conversationId } = req.query;
    const userId = res.locals.userId;

    if (serverId) {
      // Channel context
      const member = await prisma.member.findFirst({
        where: {
          profile: { userId },
          serverId: serverId as string,
        },
      });

      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
        },
        include: {
          member: true,
        },
      });

      if (!message || message.deleted) {
        return res.status(404).json({ error: "Message not found" });
      }

      const isMessageOwner = message.memberId === member.id;
      const isAdmin = member.role === "ADMIN";
      const isModerator = member.role === "MODERATOR";

      if (!isMessageOwner && !isAdmin && !isModerator) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const deletedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
          deleted: true,
        },
        include: {
          member: {
            include: { profile: true },
          },
        },
      });

      const updateKey = `chat:${message.channelId}:messages:update`;
      io.emit(updateKey, deletedMessage);
      return res.status(200).json(deletedMessage);
    } else if (conversationId) {
      // Direct message context
      const member = await prisma.member.findFirst({
        where: {
          profile: { userId },
          OR: [
            {
              conversationsInitiated: {
                some: { id: conversationId as string },
              },
            },
            {
              conversationsReceived: { some: { id: conversationId as string } },
            },
          ],
        },
      });

      if (!member) {
        return res
          .status(404)
          .json({ error: "Member not found in conversation" });
      }

      const message = await prisma.directMessage.findFirst({
        where: {
          id: messageId,
          conversationId: conversationId as string,
        },
      });

      if (!message || message.deleted) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (message.memberId !== member.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const deletedMessage = await prisma.directMessage.update({
        where: { id: messageId },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
          deleted: true,
        },
        include: {
          member: {
            include: { profile: true },
          },
        },
      });

      const updateKey = `chat:${conversationId}:messages:update`;
      io.emit(updateKey, deletedMessage);
      return res.status(200).json(deletedMessage);
    }

    return res
      .status(400)
      .json({ error: "Context missing (serverId or conversationId)" });
  } catch (error) {
    console.error("[DELETE_MESSAGE]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Legacy controllers (keep for backward compatibility)
export const getConversation = async (req: Request, res: Response) => {
  const { receiverId } = req.query;
  try {
    const conversation = await findOrCreateConversation(
      res.locals.userId,
      receiverId as string,
    );
    res.status(200).json(conversation);
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

export const sendMessageController = async (
  io: Server,
  req: Request,
  res: Response,
) => {
  try {
    const { message } = req.body;
    const { receiverId } = req.query;
    const userId = res.locals.userId;

    const conversation = await findOrCreateConversation(
      userId,
      receiverId as string,
    );

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Determine which member is sending the message
    const member =
      conversation.memberOne.profileId === userId
        ? conversation.memberOne
        : conversation.memberTwo;

    const result = await prisma.directMessage.create({
      data: {
        content: message,
        conversationId: conversation.id,
        memberId: member.id,
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });

    res.status(201).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (io: Server, req: Request, res: Response) => {
  const { receiverId } = req.query;
  try {
    const conversation = await findOrCreateConversation(
      res.locals.userId,
      receiverId as string,
    );

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId: conversation.id,
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

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
