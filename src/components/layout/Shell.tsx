/**
 * App shell: desktop sidebar + mobile bottom bar.
 * Student and admin get different nav lists and a different accent so it's
 * always obvious which view you're in.
 */
import clsx from 'clsx'
import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  NotebookPen,
  Plus,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSignedIn } from '../../context/AppContext'
import { IS_DEMO } from '../../services'
import { Brand } from '../domain/bits'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
  primary?: boolean
}

const STUDENT_NAV: NavItem[] = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/tests', label: 'Tests', icon: ClipboardList },
  { to: '/app/tests/new', label: 'Add test', icon: Plus, primary: true },
  { to: '/app/mistakes', label: 'Mistakes', icon: NotebookPen },
  { to: '/app/progress', label: 'Progress', icon: BarChart3 },
]
const STUDENT_EXTRA: NavItem[] = [{ to: '/app/plan', label: 'Planner', icon: ListChecks }]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/tests', label: 'Tests', icon: ClipboardList },
  { to: '/admin/mistakes', label: 'Mistakes', icon: BookOpenCheck },
  { to: '/admin/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/admin/settings', label: 'Settings', icon: Settings2 },
]

export function Shell({ role }: { role: 'student' | 'admin' }) {
  const { session, signOut } = useSignedIn()
  const navigate = useNavigate()
  const nav = role === 'student' ? STUDENT_NAV : ADMIN_NAV
  const sideNav = role === 'student' ? [...STUDENT_NAV.filter((n) => !n.primary), ...STUDENT_EXTRA] : ADMIN_NAV

  const out = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="px-2">
          <Brand />
          {role === 'admin' && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-700">
              <ShieldCheck className="size-4" /> Admin view
            </p>
          )}
        </div>
        {role === 'student' && (
          <NavLink to="/app/tests/new" className="mt-6 flex h-11 items-center justify-center gap-2 rounded-control bg-brand-600 font-semibold text-white hover:bg-brand-700">
            <Plus className="size-4" /> Add a test
          </NavLink>
        )}
        <nav className="mt-6 flex flex-col gap-1" aria-label="Main">
          {sideNav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                clsx(
                  'flex h-10 items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-paper hover:text-ink',
                )
              }
            >
              <n.icon className="size-[18px]" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 border-t border-line pt-4">
          <div className="px-2 text-sm">
            <p className="font-semibold">{session.name}</p>
            <p className="text-ink-mute">{role === 'student' ? 'Student' : 'Admin'}</p>
          </div>
          <button onClick={out} className="flex h-10 w-full items-center gap-3 rounded-control px-3 text-sm font-medium text-ink-soft hover:bg-paper">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        {IS_DEMO && <DemoBar role={role} />}
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-4 pt-4 lg:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            {role === 'student' && (
              <NavLink to="/app/plan" className="grid size-10 place-items-center rounded-control text-ink-soft hover:bg-brand-50" aria-label="Planner">
                <ListChecks className="size-5" />
              </NavLink>
            )}
            <button onClick={out} className="grid size-10 place-items-center rounded-control text-ink-soft hover:bg-brand-50" aria-label="Sign out">
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
        <main className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {nav.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end || n.primary}
                className={({ isActive }) =>
                  clsx(
                    'flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                    n.primary ? 'text-brand-700' : isActive ? 'text-brand-700' : 'text-ink-mute',
                  )
                }
              >
                {({ isActive }) =>
                  n.primary ? (
                    <>
                      <span className="grid size-10 place-items-center rounded-full bg-brand-600 text-white shadow-md shadow-brand-600/30">
                        <n.icon className="size-5" />
                      </span>
                      <span className="sr-only">{n.label}</span>
                    </>
                  ) : (
                    <>
                      <n.icon className={clsx('size-[22px]', isActive && 'stroke-[2.4]')} />
                      {n.label}
                    </>
                  )
                }
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function DemoBar({ role }: { role: 'student' | 'admin' }) {
  const { signIn } = useSignedIn()
  const navigate = useNavigate()
  const other = role === 'student' ? 'admin' : 'student'
  return (
    <div className="flex items-center justify-between gap-3 bg-ink px-4 py-1.5 text-xs text-white/85 sm:px-6 lg:px-8">
      <span>Demo data — nothing here is real yet.</span>
      <button
        className="rounded-chip bg-white/10 px-2.5 py-1 font-medium text-white hover:bg-white/20"
        onClick={async () => {
          await signIn(other)
          navigate(other === 'admin' ? '/admin' : '/app')
        }}
      >
        Switch to {other} view
      </button>
    </div>
  )
}
