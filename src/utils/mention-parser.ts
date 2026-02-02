/**
 * Utility to parse @mentions from message content
 * Extracts user IDs from @mention format: @[username](userId)
 */

export interface Mention {
  userId: string;
  username: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse mentions from message content
 * Format: @[username](userId)
 */
export function parseMentions(content: string): Mention[] {
  const mentions: Mention[] = [];
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      username: match[1],
      userId: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Extract unique user IDs from mentions
 */
export function extractMentionedUserIds(content: string): string[] {
  const mentions = parseMentions(content);
  const uniqueIds = [...new Set(mentions.map((m) => m.userId))];
  return uniqueIds;
}

/**
 * Check if content contains any mentions
 */
export function hasMentions(content: string): boolean {
  return /@\[([^\]]+)\]\(([^)]+)\)/.test(content);
}
