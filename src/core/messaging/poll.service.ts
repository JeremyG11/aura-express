import { prisma } from "@/shared/core/db";
import { getProfileByUserId } from "@/core/users/services";
import { BadRequestError, NotFoundError } from "@/shared/utils/errors";

export class PollService {
  /**
   * Create a new poll attached to a message
   */
  public static async createPoll(payload: {
    question: string;
    options: string[];
    expiresAt?: Date;
    messageId?: string;
    directMessageId?: string;
  }) {
    const { question, options, expiresAt, messageId, directMessageId } =
      payload;

    if (!options || options.length < 2) {
      throw new BadRequestError("A poll must have at least 2 options");
    }

    return await prisma.poll.create({
      data: {
        question,
        expiresAt,
        messageId,
        directMessageId,
        options: {
          create: options.map((text) => ({ text })),
        },
      },
      include: {
        options: {
          include: {
            votes: true,
            _count: {
              select: { votes: true },
            },
          },
        },
      },
    });
  }

  /**
   * Cast a vote in a poll
   */
  public static async castVote(payload: {
    pollId: string;
    userId: string;
    optionId: string;
  }) {
    const { pollId, userId, optionId } = payload;

    const profile = await getProfileByUserId(userId);
    if (!profile) throw new NotFoundError("Profile not found");

    // Check if poll exists and isn't expired
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) throw new NotFoundError("Poll not found");
    if (poll.expiresAt && poll.expiresAt < new Date()) {
      throw new BadRequestError("This poll has expired");
    }

    const existingVote = await prisma.pollVote.findUnique({
      where: {
        profileId_pollId: {
          profileId: profile.id,
          pollId,
        },
      },
    });

    if (existingVote) {
      // If clicking the same option, remove the vote (Toggle behavior)
      if (existingVote.optionId === optionId) {
        return await prisma.pollVote.delete({
          where: { id: existingVote.id },
        });
      }

      // Change vote to a different option
      return await prisma.pollVote.update({
        where: { id: existingVote.id },
        data: { optionId },
      });
    }

    // New vote
    return await prisma.pollVote.create({
      data: {
        profileId: profile.id,
        pollId,
        optionId,
      },
    });
  }

  /**
   * Get poll results with vote counts
   */
  public static async getPollResults(pollId: string) {
    return await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            votes: true,
            _count: {
              select: { votes: true },
            },
          },
        },
      },
    });
  }
}
