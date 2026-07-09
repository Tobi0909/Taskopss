import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Moon, Sun, User } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from './NotificationBell'
import { useRealtimeConnection } from '@/features/realtime/useRealtimeConnection'
import { useTheme } from '@/features/theme/useTheme'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  useRealtimeConnection()

  const navItems = [
    { to: '/board', label: 'Bảng công việc' },
    { to: '/table', label: 'Danh sách' },
    { to: '/dashboard', label: 'Thống kê' },
    ...(user?.role === 'ADMIN' ? [{ to: '/members', label: 'Thành viên' }] : []),
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium">Task Ops</span>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
                    isActive && 'bg-secondary text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {user && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md p-1.5 hover:bg-secondary"
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 outline-none hover:bg-secondary">
                <Avatar>
                  <AvatarFallback style={{ background: user.avatarColor, color: '#04211d' }}>
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{user.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {user.name}
                  <p className="font-mono text-[11px] font-normal text-tertiary-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <User className="h-4 w-4" />
                  {user.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => logout()}>
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </header>

      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
