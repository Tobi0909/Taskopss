const MENTION_REGEX =
  /@\[[^\]]+\]\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/g;

export function extractMentionedUserIds(body: string): string[] {
  const ids = new Set<string>();
  for (const match of body.matchAll(MENTION_REGEX)) {
    ids.add(match[1]);
  }
  return [...ids];
}
