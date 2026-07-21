import type { BoardColumn, Tag, UserSummary } from '@/types/api'
import type { TaskFilterState } from './TaskFilterBar'

export interface ParsedToken {
  key: string
  value: string
  resolved: boolean
}

export interface ParsedSearch {
  filters: Partial<TaskFilterState>
  freeText: string
  tokens: ParsedToken[]
}

interface ParseContext {
  users: UserSummary[]
  tags: Tag[]
  columns: BoardColumn[]
  currentUserId?: string
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function parseSearchQuery(raw: string, ctx: ParseContext): ParsedSearch {
  const words = raw.trim().split(/\s+/).filter(Boolean)
  const filters: Partial<TaskFilterState> = {}
  const tokens: ParsedToken[] = []
  const freeWords: string[] = []

  for (const word of words) {
    const idx = word.indexOf(':')
    if (idx <= 0) {
      freeWords.push(word)
      continue
    }
    const key = normalize(word.slice(0, idx))
    const value = word.slice(idx + 1)
    const normValue = normalize(value)
    let resolved = false

    if (key === 'priority') {
      const p = value.toUpperCase()
      if (['P1', 'P2', 'P3', 'P4'].includes(p)) {
        filters.priority = p
        resolved = true
      }
    } else if (key === 'assignee') {
      if (normValue === 'me' && ctx.currentUserId) {
        filters.assigneeId = ctx.currentUserId
        resolved = true
      } else {
        const match = ctx.users.find((u) => normalize(u.name).includes(normValue))
        if (match) {
          filters.assigneeId = match.id
          resolved = true
        }
      }
    } else if (key === 'label' || key === 'tag') {
      const match = ctx.tags.find((t) => normalize(t.name).includes(normValue))
      if (match) {
        filters.tagId = match.id
        resolved = true
      }
    } else if (key === 'status') {
      const match = ctx.columns.find((c) => normalize(c.name).includes(normValue))
      if (match) {
        filters.columnId = match.id
        resolved = true
      }
    } else if (key === 'due') {
      if (normValue === 'today') {
        filters.dueToday = true
        resolved = true
      } else if (normValue === 'week') {
        filters.dueThisWeek = true
        resolved = true
      } else if (normValue === 'overdue') {
        filters.overdue = true
        resolved = true
      }
    } else if (key === 'created') {
      if (normValue === 'today') {
        filters.createdToday = true
        resolved = true
      }
    } else if (key === 'has') {
      if (normValue === 'attachment') {
        filters.hasAttachment = true
        resolved = true
      } else if (normValue === 'comment') {
        filters.hasComment = true
        resolved = true
      } else if (normValue === 'checklist') {
        filters.hasChecklist = true
        resolved = true
      }
    } else if (key === 'blocked') {
      if (normValue === 'true' || normValue === '1') {
        filters.blocked = true
        resolved = true
      }
    }

    tokens.push({ key, value, resolved })
    if (!resolved) freeWords.push(word)
  }

  return { filters, freeText: freeWords.join(' '), tokens }
}
