import { vi, describe, it, expect, beforeEach } from "vitest";
import { MessageService } from "@/core/messaging/services";
import { prisma } from "@/shared/core/db";
import { MemberService } from "@/core/servers/services";
import { events } from "@/shared/core/events";
import { NotFoundError } from "@/shared/utils/errors";

const MOCK_USER_ID = "507f1f77bcf86cd799439011";
const MOCK_MEMBER_ID = "507f191e810c19729de860ea";
const MOCK_MESSAGE_ID = "60b8d2931234567890abcdef";
const MOCK_SERVER_ID = "60b8d2931234567890fedcba";
const MOCK_CHANNEL_ID = "60b8d2931234567890123456";

vi.mock("@/shared/core/db", () => ({
  prisma: {
    message: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    directMessage: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/domains/servers/services");

vi.mock("@/shared/core/events", () => ({
  events: {
    emit: vi.fn(),
  },
  MESSAGE_EVENTS: {
    CREATED: "messages:created",
    UPDATED: "messages:updated",
  },
}));

describe("MessageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createChannelMessage", () => {
    it("should create a channel message successfully", async () => {
      const payload = {
        content: "Hello",
        serverId: MOCK_SERVER_ID,
        channelId: MOCK_CHANNEL_ID,
        userId: MOCK_USER_ID,
      };

      const mockMember = { id: MOCK_MEMBER_ID, role: "GUEST" };
      const mockMessage = {
        id: MOCK_MESSAGE_ID,
        content: "Hello",
        channelId: MOCK_CHANNEL_ID,
      };

      (MemberService.resolveMember as any).mockResolvedValue(mockMember);
      (prisma.message.create as any).mockResolvedValue(mockMessage);

      const result = await MessageService.createChannelMessage(payload);

      expect(result).toEqual(mockMessage);
      expect(prisma.message.create).toHaveBeenCalled();
    });

    it("should throw NotFoundError if member not found", async () => {
      (MemberService.resolveMember as any).mockResolvedValue(null);

      await expect(
        MessageService.createChannelMessage({
          content: "Hi",
          serverId: MOCK_SERVER_ID,
          channelId: MOCK_CHANNEL_ID,
          userId: MOCK_USER_ID,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateMessage", () => {
    it("should update a channel message if owner", async () => {
      const mockMember = { id: MOCK_MEMBER_ID };
      const mockMessage = {
        id: MOCK_MESSAGE_ID,
        memberId: MOCK_MEMBER_ID,
        channelId: MOCK_CHANNEL_ID,
      };

      (MemberService.resolveMember as any).mockResolvedValue(mockMember);
      (prisma.message.findFirst as any).mockResolvedValue(mockMessage);
      (prisma.message.update as any).mockResolvedValue({
        ...mockMessage,
        content: "New",
      });

      const result = await MessageService.updateMessage({
        messageId: MOCK_MESSAGE_ID,
        content: "New",
        userId: MOCK_USER_ID,
        serverId: MOCK_SERVER_ID,
      });

      expect(result.content).toBe("New");
    });
  });
});
