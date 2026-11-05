/**
 * Routes. Student lives under /app, admin under /admin.
 * <RequireRole> is a UX guard only — the real permission check is on the
 * server (mockApi now, Supabase row-level security later).
 */
import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import { LoadingBlock } from './components/ui/primitives'
import { ToastProvider } from './components/ui/toast'
import { AppProvider, useApp } from './context/AppContext'
import type { Role } from './domain/types'
import Login from './pages/Login'
import StudentHome from './pages/student/Home'

// Heavier screens (charts) load on demand to keep first paint fast.
const Tests = lazy(() => import('./pages/shared/Tests'))
const TestDetail = lazy(() => import('./pages/shared/TestDetail'))
const AddTest = lazy(() => import('./pages/student/AddTest'))
const ReflectionPage = lazy(() => import('./pages/student/Reflection'))
const Mistakes = lazy(() => import('./pages/shared/Mistakes'))
const Progress = lazy(() => import('./pages/shared/Progress'))
const Planner = lazy(() => import('./pages/shared/Planner'))
const AdminOverview = lazy(() => import('./pages/admin/Overview'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { ready, session, settings } = useApp()
  if (!ready) return <Splash />
  if (!session || !settings) return <Navigate to="/login" replace />
  if (session.role !== role) return <Navigate to={session.role === 'admin' ? '/admin' : '/app'} replace />
  return children
}

function Splash() {
  return (
    <div className="mx-auto max-w-md p-8">
      <LoadingBlock rows={2} />
    </div>
  )
}

const page = (el: ReactNode) => <Suspense fallback={<LoadingBlock />}>{el}</Suspense>

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/app"
              element={
                <RequireRole role="student">
                  <Shell role="student" />
                </RequireRole>
              }
            >
              <Route index element={<StudentHome />} />
              <Route path="tests" element={page(<Tests />)} />
              <Route path="tests/new" element={page(<AddTest />)} />
              <Route path="tests/:id" element={page(<TestDetail />)} />
              <Route path="tests/:id/edit" element={page(<AddTest />)} />
              <Route path="tests/:id/reflection" element={page(<ReflectionPage />)} />
              <Route path="mistakes" element={page(<Mistakes />)} />
              <Route path="progress" element={page(<Progress />)} />
              <Route path="plan" element={page(<Planner />)} />
            </Route>
            <Route
              path="/admin"
              element={
                <RequireRole role="admin">
                  <Shell role="admin" />
                </RequireRole>
              }
            >
              <Route index element={page(<AdminOverview />)} />
              <Route path="tests" element={page(<Tests />)} />
              <Route path="tests/:id" element={page(<TestDetail />)} />
              <Route path="mistakes" element={page(<Mistakes />)} />
              <Route path="progress" element={page(<Progress />)} />
              <Route path="tasks" element={page(<Planner />)} />
              <Route path="settings" element={page(<AdminSettings />)} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  )
}
