import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RequireAdmin } from '@/features/auth/RequireAdmin'
import { AppLayout } from '@/components/layout/AppLayout'
import { BoardPage } from '@/features/board/BoardPage'
import { TablePage } from '@/features/board/TablePage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { MembersPage } from '@/features/members/MembersPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/board" element={<BoardPage />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/members"
          element={
            <RequireAdmin>
              <MembersPage />
            </RequireAdmin>
          }
        />
        <Route path="/" element={<Navigate to="/board" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/board" replace />} />
    </Routes>
  )
}

export default App
