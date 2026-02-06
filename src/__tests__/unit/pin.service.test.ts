import { vi, describe, it, expect, beforeEach } from "vitest";

// Use relative paths to ensure Vitest mocks them correctly
import { PinService } from "../../core/messaging/pin.service";
import { MemberService } from "../../core/servers/services";
import { prisma } from "../../shared/core/db";
import { NotFoundError, UnauthorizedError } from "../../shared/utils/errors";

vi.mock("../../shared/core/db", () => ({
  prisma: {
    message: { findFirst: vi.fn(), update: vi.fn() },
    directMessage: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../../core/servers/services", () => ({
  MemberService: { resolveMember: vi.fn() },
}));

const MOCK_USER_ID = "507f1f77bcf86cd799439011";
const MOCK_MEMBER_ID = "507f191e810c19729de860ea";
const MOCK_MESSAGE_ID = "60b8d2931234567890abcdef";
const MOCK_SERVER_ID = "60b8d2931234567890fedcba";

describe("PinService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("pinMessage", () => {
    it("should pin a channel message if user is admin/moderator", async () => {
      const mockMember = { id: MOCK_MEMBER_ID, role: "ADMIN" };
      const mockMessage = { id: MOCK_MESSAGE_ID, channelId: "chan1" };

      vi.mocked(MemberService.resolveMember).mockResolvedValue(
        mockMember as any,
      );
      vi.mocked(prisma.message.findFirst).mockResolvedValue(mockMessage as any);
      vi.mocked(prisma.message.update).mockResolvedValue({
        ...mockMessage,
        isPinned: true,
      } as any);

      const result = await PinService.pinMessage({
        messageId: MOCK_MESSAGE_ID,
        userId: MOCK_USER_ID,
        serverId: MOCK_SERVER_ID,
      });

      expect(result.isPinned).toBe(true);
    });

    it("should throw UnauthorizedError if user is not admin/moderator in server", async () => {
      const mockMember = { id: MOCK_MEMBER_ID, role: "GUEST" };
      vi.mocked(MemberService.resolveMember).mockResolvedValue(
        mockMember as any,
      );

      await expect(
        PinService.pinMessage({
          messageId: MOCK_MESSAGE_ID,
          userId: MOCK_USER_ID,
          serverId: MOCK_SERVER_ID,
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should pin a direct message if user is part of conversation", async () => {
      const mockMember = { id: MOCK_MEMBER_ID };
      const mockDM = { id: MOCK_MESSAGE_ID, conversationId: "conv1" };

      vi.mocked(MemberService.resolveMember).mockResolvedValue(
        mockMember as any,
      );
      vi.mocked(prisma.directMessage.findFirst).mockResolvedValue(
        mockDM as any,
      );
      vi.mocked(prisma.directMessage.update).mockResolvedValue({
        ...mockDM,
        isPinned: true,
      } as any);

      const result = await PinService.pinMessage({
        messageId: MOCK_MESSAGE_ID,
        userId: MOCK_USER_ID,
        conversationId: "conv1",
      });

      expect(result.isPinned).toBe(true);
    });
  });
});
