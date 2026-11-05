/**
 * App shell: top bar + bottom tab bar, the same on phones and desktops
 * (the owner preferred the phone layout everywhere). Student and admin get
 * different tabs so it's always obvious which view you're in. Inside a student's pages the admin also gets a switcher
 * to jump between students.
 */
import clsx from 'clsx'
import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  ClipboardPlus,
  LayoutDashboard,
  ListChecks,
  LogOut,
  NotebookPen,
  PieChart,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { homeFor, useSignedIn } from '../../context/AppContext'
import { useAsync } from '../../hooks/useAsync'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../mock/seed'
import { api, IS_DEMO } from '../../services'
import { Brand } from '../domain/bits'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

const STUDENT_NAV: NavItem[] = [
  { to: '/app', label: 'Add test', icon: ClipboardPlus, end: true },
  { to: '/app/analysis', label: 'Analysis', icon: PieChart },
  { to: '/app/tests', label: 'Tests', icon: ClipboardList },
  { to: '/app/mistakes', label: 'Mistakes', icon: NotebookPen },
  { to: '/app/progress', label: 'Progress', icon: BarChart3 },
]

const studentNavForAdmin = (id: string): NavItem[] => [
  { to: '/admin', label: 'Students', icon: Users, end: true },
  { to: `/admin/students/${id}`, label: 'Overview', icon: LayoutDashboard, end: true },
  { to: `/admin/students/${id}/tests`, label: 'Tests', icon: ClipboardList },
  { to: `/admin/students/${id}/mistakes`, label: 'Mistakes', icon: BookOpenCheck },
  { to: `/admin/students/${id}/tasks`, label: 'Tasks', icon: ListChecks },
]
const ADMIN_HOME_NAV: NavItem[] = [
  { to: '/admin', label: 'Students', icon: Users, end: true },
  { to: '/admin/settings', label: 'Settings', icon: Settings2 },
]

export function Shell({ role }: { role: 'student' | 'admin' }) {
  const { session, signOut } = useSignedIn()
  const navigate = useNavigate()
  const studentMatch = useMatch('/admin/students/:studentId/*')
  const viewingId = studentMatch?.params.studentId ?? null

  const nav = role === 'student' ? STUDENT_NAV : viewingId ? studentNavForAdmin(viewingId) : ADMIN_HOME_NAV

  const out = async () => {
    await signOut()
    navigate('/login')
  }

  const iconBtn = 'grid size-10 place-items-center rounded-control text-ink-soft hover:bg-brand-50 hover:text-ink'

  return (
    <div className="min-h-dvh">
      {IS_DEMO && <DemoBar role={role} />}

      {/* Top bar — same on every screen size */}
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Brand />
          {role === 'admin' && (
            <span className="hidden items-center gap-1 rounded-chip bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 sm:flex">
              <ShieldCheck className="size-3.5" /> Admin
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="mr-2 hidden min-w-0 text-right text-sm leading-tight md:block">
            <p className="truncate font-semibold">{session.name}</p>
            <p className="truncate text-ink-mute">{session.email}</p>
          </div>
          {role === 'student' && (
            <NavLink to="/app/plan" className={({ isActive }) => clsx(iconBtn, isActive && 'bg-brand-50 text-brand-700')} aria-label="Planner" title="Planner">
              <ListChecks className="size-5" />
            </NavLink>
          )}
          {role === 'admin' && viewingId && (
            <NavLink to="/admin/settings" className={iconBtn} aria-label="Settings" title="Settings">
              <Settings2 className="size-5" />
            </NavLink>
          )}
          <button onClick={out} className={iconBtn} aria-label="Sign out" title="Sign out">
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        {role === 'admin' && viewingId && <StudentSwitcher current={viewingId} />}
        <Outlet />
      </main>

      {/* Bottom tab bar — same on every screen size */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
          {nav.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  clsx(
                    'flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors sm:text-xs',
                    isActive ? 'text-brand-700' : 'text-ink-mute hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <n.icon className={clsx('size-[22px]', isActive && 'stroke-[2.4]')} />
                    {n.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

/** "Viewing: Chhoti ▾" — swaps the student, staying on the same section. */
function StudentSwitcher({ current }: { current: string }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const students = useAsync(() => api.listStudents(), [])
  // Keep the section (tests, mistakes…) but drop record ids that belong to the old student.
  const section = pathname.split('/')[4] ?? ''

  return (
    <div className="mb-5 flex items-center gap-2 text-sm">
      <label htmlFor="student-switch" className="text-ink-mute">
        Viewing
      </label>
      <select
        id="student-switch"
        value={current}
        disabled={!students.data}
        onChange={(e) => navigate(`/admin/students/${e.target.value}${section ? `/${section}` : ''}`)}
        className="h-9 min-w-0 max-w-[60vw] rounded-control border border-line-strong bg-surface px-2.5 font-semibold text-ink"
      >
        {(students.data ?? [{ id: current, name: '…' }]).map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <span className="text-ink-mute">· read-only</span>
    </div>
  )
}

function DemoBar({ role }: { role: 'student' | 'admin' }) {
  const { signInWithPassword } = useSignedIn()
  const navigate = useNavigate()
  const other = role === 'student' ? 'admin' : 'student'
  return (
    <div className="flex items-center justify-between gap-3 bg-ink px-4 py-1.5 text-xs text-white/85 sm:px-6 lg:px-8">
      <span>Demo data — nothing here is real yet.</span>
      <button
        className="shrink-0 rounded-chip bg-white/10 px-2.5 py-1 font-medium text-white hover:bg-white/20"
        onClick={async () => {
          const s = await signInWithPassword(DEMO_ACCOUNTS[other], DEMO_PASSWORD)
          navigate(homeFor(s))
        }}
      >
        Switch to {other} view
      </button>
    </div>
  )
}
