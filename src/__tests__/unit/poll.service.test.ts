import { vi, describe, it, expect, beforeEach } from "vitest";

// Use relative paths
import { PollService } from "../../core/messaging/poll.service";
import { getProfileByUserId } from "../../core/users/services";
import { prisma } from "../../shared/core/db";
import { BadRequestError } from "../../shared/utils/errors";

vi.mock("../../shared/core/db", () => ({
  prisma: {
    poll: { create: vi.fn(), findUnique: vi.fn() },
    pollVote: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../core/users/services", () => ({
  getProfileByUserId: vi.fn(),
}));

const MOCK_PROFILE_ID = "profile123";
const MOCK_POLL_ID = "poll123";
const MOCK_OPTION_ID = "option1";

describe("PollService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPoll", () => {
    it("should create a poll with options", async () => {
      const payload = {
        question: "Best food?",
        options: ["Pizza", "Sushi"],
        messageId: "msg1",
      };

      vi.mocked(prisma.poll.create).mockResolvedValue({
        id: MOCK_POLL_ID,
        ...payload,
      } as any);

      const result = await PollService.createPoll(payload);

      expect(result.id).toBe(MOCK_POLL_ID);
    });
  });

  describe("castVote", () => {
    it("should cast a vote successfully", async () => {
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        id: MOCK_POLL_ID,
      } as any);
      vi.mocked(prisma.pollVote.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.pollVote.create).mockResolvedValue({
        id: "vote1",
      } as any);

      await PollService.castVote({
        pollId: MOCK_POLL_ID,
        userId: "user1",
        optionId: MOCK_OPTION_ID,
      });

      expect(prisma.pollVote.create).toHaveBeenCalled();
    });

    it("should throw BadRequestError if poll is expired", async () => {
      vi.mocked(getProfileByUserId).mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        id: MOCK_POLL_ID,
        expiresAt: new Date(Date.now() - 1000), // 1s ago
      } as any);

      await expect(
        PollService.castVote({
          pollId: MOCK_POLL_ID,
          userId: "user1",
          optionId: MOCK_OPTION_ID,
        }),
      ).rejects.toThrow(BadRequestError);
    });
  });
});
