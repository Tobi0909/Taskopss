import { Bell } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/queries/notifications'
import type { AppNotification } from '@/types/api'
import { cn } from '@/lib/utils'

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} giờ trước`
  return `${Math.floor(diffHour / 24)} ngày trước`
}

function NotificationRow({ notification, onRead }: { notification: AppNotification; onRead: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => !notification.isRead && onRead(notification.id)}
      className={cn(
        'flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-accent',
        !notification.isRead && 'bg-primary/5',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn(!notification.isRead && 'font-medium')}>{notification.message}</p>
        {!notification.isRead && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
      </div>
      <span className="text-[11px] text-tertiary-foreground">{formatRelative(notification.createdAt)}</span>
    </button>
  )
}

export function NotificationBell() {
  const { data: notifications } = useNotifications()
  const { data: unread } = useUnreadCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const count = unread?.count ?? 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative rounded-md p-1.5 hover:bg-secondary" aria-label="Thông báo">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-priority-p1 px-0.5 text-[9px] font-medium text-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Thông báo</span>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => markAllRead.mutate()}>
              Đánh dấu đã đọc hết
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {(notifications ?? []).length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Chưa có thông báo nào</p>
          )}
          {notifications?.map((n) => (
            <NotificationRow key={n.id} notification={n} onRead={(id) => markRead.mutate(id)} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
