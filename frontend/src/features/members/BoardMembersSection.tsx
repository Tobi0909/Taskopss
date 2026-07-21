import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2, UserPlus } from 'lucide-react'
import { useDefaultBoard } from '@/queries/boards'
import {
  useAddBoardMember,
  useBoardMembers,
  useRemoveBoardMember,
  useUpdateBoardMemberRole,
} from '@/queries/boards'
import { useAllUsers } from '@/queries/users'
import type { BoardRole } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiRequestError } from '@/lib/api'

const ROLE_LABEL: Record<BoardRole, string> = {
  OWNER: 'Chủ sở hữu',
  ADMIN: 'Quản trị board',
  MEMBER: 'Thành viên',
  VIEWER: 'Chỉ xem',
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(-2).join('').toUpperCase()
}

export function BoardMembersSection() {
  const { board } = useDefaultBoard()
  const { data: members } = useBoardMembers(board?.id)
  const { data: allUsers } = useAllUsers()
  const addMember = useAddBoardMember(board?.id)
  const updateRole = useUpdateBoardMemberRole(board?.id)
  const removeMember = useRemoveBoardMember(board?.id)

  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<BoardRole>('MEMBER')

  if (!board) return null

  const memberUserIds = new Set((members ?? []).map((m) => m.userId))
  const addableUsers = (allUsers ?? []).filter((u) => u.isActive && !memberUserIds.has(u.id))

  async function handleAdd() {
    if (!addUserId) return
    try {
      await addMember.mutateAsync({ userId: addUserId, role: addRole })
      toast.success('Đã thêm thành viên vào board')
      setAddUserId('')
      setAddRole('MEMBER')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không thêm được thành viên')
    }
  }

  async function handleRoleChange(userId: string, role: BoardRole) {
    try {
      await updateRole.mutateAsync({ userId, role })
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không cập nhật được vai trò')
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Gỡ "${name}" khỏi board "${board?.name}"?`)) return
    try {
      await removeMember.mutateAsync(userId);
      toast.success('Đã gỡ khỏi board')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không gỡ được thành viên')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-md font-medium">Thành viên board — {board.name}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Người dùng phải là thành viên của board này thì mới xem/thao tác được task trên board. Người dùng mới tạo
        đã tự động được thêm làm Thành viên; dùng bảng dưới để đổi quyền hoặc gỡ khỏi board.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Vai trò trên board</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(members ?? []).map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <Avatar>
                  <AvatarFallback style={{ background: m.user.avatarColor, color: '#04211d' }}>
                    {initials(m.user.name)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell>{m.user.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{m.user.email}</TableCell>
              <TableCell>
                <Select value={m.role} onValueChange={(v) => handleRoleChange(m.userId, v as BoardRole)}>
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as BoardRole[]).map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  aria-label="Gỡ khỏi board"
                  onClick={() => handleRemove(m.userId, m.user.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-end gap-2 rounded-md border border-border p-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Thêm người dùng vào board</span>
          <Select value={addUserId} onValueChange={setAddUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn người dùng..." />
            </SelectTrigger>
            <SelectContent>
              {addableUsers.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Mọi người dùng đang hoạt động đều đã có trong board
                </div>
              )}
              {addableUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={addRole} onValueChange={(v) => setAddRole(v as BoardRole)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_LABEL) as BoardRole[]).map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABEL[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!addUserId || addMember.isPending} onClick={handleAdd}>
          <UserPlus className="h-4 w-4" />
          Thêm
        </Button>
      </div>
    </div>
  )
}
