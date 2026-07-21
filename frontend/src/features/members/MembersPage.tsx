import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Lock, MoreHorizontal, Plus, Trash2, Unlock } from 'lucide-react'
import { useAllUsers, useCreateMember, useDeleteMember, useUpdateMember } from '@/queries/users'
import { useAuth } from '@/features/auth/AuthContext'
import type { Role, UserSummary } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ApiRequestError } from '@/lib/api'
import { BoardMembersSection } from './BoardMembersSection'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(-2).join('').toUpperCase()
}

export function MembersPage() {
  const { user: currentUser } = useAuth()
  const { data: users, isLoading } = useAllUsers()
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('MEMBER')

  const [resetTarget, setResetTarget] = useState<UserSummary | null>(null)
  const [newPassword, setNewPassword] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createMember.mutateAsync({ name, email, password, role })
      toast.success('Đã tạo thành viên mới')
      setDialogOpen(false)
      setName('')
      setEmail('')
      setPassword('')
      setRole('MEMBER')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không tạo được thành viên')
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await updateMember.mutateAsync({ id, isActive: !isActive })
      toast.success(isActive ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không cập nhật được')
    }
  }

  async function changeRole(id: string, newRole: Role) {
    try {
      await updateMember.mutateAsync({ id, role: newRole })
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không cập nhật được')
    }
  }

  async function handleDelete(u: UserSummary) {
    if (!confirm(`Xoá tài khoản "${u.name}"? Task/bình luận cũ của người này vẫn giữ nguyên nhưng sẽ không còn hiển thị tên. Không thể hoàn tác.`)) {
      return
    }
    try {
      await deleteMember.mutateAsync(u.id)
      toast.success('Đã xoá tài khoản')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không xoá được tài khoản')
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetTarget) return
    try {
      await updateMember.mutateAsync({ id: resetTarget.id, password: newPassword })
      toast.success(`Đã đặt lại mật khẩu cho ${resetTarget.name}`)
      setResetTarget(null)
      setNewPassword('')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không đặt lại được mật khẩu')
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-md font-medium">Thành viên team</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Thêm thành viên
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((u) => {
            const isSelf = u.id === currentUser?.id
            return (
              <TableRow key={u.id}>
                <TableCell>
                  <Avatar>
                    <AvatarFallback style={{ background: u.avatarColor, color: '#04211d' }}>
                      {initials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  {u.name}
                  {isSelf && <span className="ml-1.5 text-xs text-tertiary-foreground">(bạn)</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(v) => changeRole(u.id, v as Role)}>
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Thành viên</SelectItem>
                      <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? 'default' : 'secondary'}>
                    {u.isActive ? 'Đang hoạt động' : 'Đã khoá'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        aria-label="Hành động"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setResetTarget(u)}>
                        <KeyRound className="h-4 w-4" />
                        Đặt lại mật khẩu
                      </DropdownMenuItem>
                      {!isSelf && (
                        <>
                          <DropdownMenuItem onSelect={() => toggleActive(u.id, u.isActive)}>
                            {u.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            {u.isActive ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => handleDelete(u)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Xoá tài khoản
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="border-t border-border pt-4">
        <BoardMembersSection />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm thành viên</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleCreate}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member-name">Họ tên</Label>
              <Input id="member-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member-password">Mật khẩu tạm thời</Label>
              <Input
                id="member-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Vai trò</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Thành viên</SelectItem>
                  <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={createMember.isPending}>
                Tạo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu cho {resetTarget?.name}</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleResetPassword}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-password">Mật khẩu mới</Label>
              <Input
                id="reset-password"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tối thiểu 8 ký tự. Người này sẽ bị đăng xuất khỏi mọi thiết bị và cần đăng nhập lại bằng mật khẩu mới.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>
                Hủy
              </Button>
              <Button type="submit" disabled={updateMember.isPending}>
                Đặt lại
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
