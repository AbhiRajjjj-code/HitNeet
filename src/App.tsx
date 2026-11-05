/**
 * Routes.
 *   /login, /signup, /forgot-password      — public
 *   /reset-password                        — where the emailed reset link lands
 *   /privacy, /terms                       — public legal pages (needed for Google sign-in)
 *   /app/...                               — a student's own pages (home = Add test)
 *   /admin                                 — all students
 *   /admin/students/:studentId/...         — one student's pages, read-only
 *   /admin/settings                        — exam date, marking scheme, exports
 * <RequireRole> is a UX guard only — the real permission check is on the
 * server (mockApi now, Supabase row-level security later).
 */
import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import { LoadingBlock } from './components/ui/primitives'
import { ToastProvider } from './components/ui/toast'
import { AppProvider, homeFor, useApp } from './context/AppContext'
import type { Role } from './domain/types'
import { ForgotPassword, Login, ResetPassword, SignUp } from './pages/auth/AuthPages'
import { Privacy, Terms } from './pages/legal/Legal'

// Screens load on demand to keep first paint fast.
const AddTest = lazy(() => import('./pages/student/AddTest'))
const Analysis = lazy(() => import('./pages/student/Analysis'))
const Tests = lazy(() => import('./pages/shared/Tests'))
const TestDetail = lazy(() => import('./pages/shared/TestDetail'))
const ReflectionPage = lazy(() => import('./pages/student/Reflection'))
const Mistakes = lazy(() => import('./pages/shared/Mistakes'))
const Progress = lazy(() => import('./pages/shared/Progress'))
const Planner = lazy(() => import('./pages/shared/Planner'))
const Students = lazy(() => import('./pages/admin/Students'))
const AdminOverview = lazy(() => import('./pages/admin/Overview'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { ready, session, settings } = useApp()
  if (!ready) return <Splash />
  if (!session || !settings) return <Navigate to="/login" replace />
  if (session.role !== role) return <Navigate to={homeFor(session)} replace />
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
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            <Route
              path="/app"
              element={
                <RequireRole role="student">
                  <Shell role="student" />
                </RequireRole>
              }
            >
              <Route index element={page(<AddTest home />)} />
              <Route path="analysis" element={page(<Analysis />)} />
              <Route path="tests" element={page(<Tests />)} />
              <Route path="tests/new" element={<Navigate to="/app" replace />} />
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
              <Route index element={page(<Students />)} />
              <Route path="settings" element={page(<AdminSettings />)} />
              <Route path="students/:studentId">
                <Route index element={page(<AdminOverview />)} />
                <Route path="tests" element={page(<Tests />)} />
                <Route path="tests/:id" element={page(<TestDetail />)} />
                <Route path="mistakes" element={page(<Mistakes />)} />
                <Route path="progress" element={page(<Progress />)} />
                <Route path="tasks" element={page(<Planner />)} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  )
}
