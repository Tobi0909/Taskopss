const MENTION_REGEX = /@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)/g

export function renderCommentBody(body: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  const regex = new RegExp(MENTION_REGEX)
  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(body.slice(lastIndex, match.index))
    }
    nodes.push(
      <span key={`mention-${key++}`} className="rounded-sm bg-primary/15 px-1 font-medium text-primary">
        @{match[1]}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < body.length) {
    nodes.push(body.slice(lastIndex))
  }
  return nodes
}

export function findMentionQuery(value: string, cursor: number): string | null {
  const upToCursor = value.slice(0, cursor)
  const match = /@([\p{L}0-9_ ]{0,20})$/u.exec(upToCursor)
  return match ? match[1] : null
}

export function insertMention(value: string, cursor: number, name: string, userId: string) {
  const upToCursor = value.slice(0, cursor)
  const match = /@([\p{L}0-9_ ]{0,20})$/u.exec(upToCursor)
  if (!match) return { value, cursor }
  const start = match.index
  const mentionText = `@[${name}](${userId}) `
  const newValue = value.slice(0, start) + mentionText + value.slice(cursor)
  return { value: newValue, cursor: start + mentionText.length }
}
