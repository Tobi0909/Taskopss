import type { Task } from '@/types/api'

export type DueStatus = 'overdue' | 'due-soon' | 'normal' | 'none'

export function getDueStatus(task: Pick<Task, 'dueDate' | 'completedAt'>): DueStatus {
  if (!task.dueDate || task.completedAt) return 'none'
  const diffMs = new Date(task.dueDate).getTime() - Date.now()
  const diffDays = diffMs / (24 * 60 * 60 * 1000)
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 1) return 'due-soon'
  return 'normal'
}

export function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate)
  const datePart = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timePart = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} ${timePart}`
}

// Converts an ISO date string to the "YYYY-MM-DDTHH:mm" format required by
// <input type="datetime-local">, in the browser's local timezone.
export function toDatetimeLocalValue(dueDate: string): string {
  const d = new Date(dueDate)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const PRIORITY_LABELS: Record<string, string> = {
  P1: 'P1 · Khẩn cấp',
  P2: 'P2 · Cao',
  P3: 'P3 · Trung bình',
  P4: 'P4 · Thấp',
}

export const PRIORITY_BADGE_VARIANT: Record<string, 'p1' | 'p2' | 'p3' | 'p4'> = {
  P1: 'p1',
  P2: 'p2',
  P3: 'p3',
  P4: 'p4',
}
