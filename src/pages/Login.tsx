import { GraduationCap, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Brand } from '../components/domain/bits'
import { Button } from '../components/ui/primitives'
import { useApp } from '../context/AppContext'
import type { Role } from '../domain/types'

export default function Login() {
  const { ready, session, signIn } = useApp()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<Role | null>(null)

  if (ready && session) return <Navigate to={session.role === 'admin' ? '/admin' : '/app'} replace />

  const go = async (role: Role) => {
    setBusy(role)
    await signIn(role)
    navigate(role === 'admin' ? '/admin' : '/app')
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-brand-600 p-12 text-white lg:flex lg:flex-col">
        <Brand light />
        <div className="mt-auto max-w-md">
          <p className="font-display text-[44px] font-bold leading-[1.05]">
            Test. Analyse.
            <br />
            Improve. Repeat.
          </p>
          <p className="mt-4 text-lg text-white/80">
            Every mock test turns into a short list of what to fix next — not just a number.
          </p>
        </div>
        <ScoreRuler />
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Brand />
            <p className="mt-6 font-display text-3xl font-bold leading-tight">Test. Analyse. Improve. Repeat.</p>
          </div>
          <h1 className="mt-8 text-2xl font-bold lg:mt-0">Sign in</h1>
          <p className="mt-1 text-ink-soft">
            This is the prototype. Pick a view to explore it with demo data.
          </p>

          <div className="mt-6 space-y-3">
            <Button size="lg" className="w-full" loading={busy === 'student'} onClick={() => go('student')}>
              <GraduationCap className="size-5" /> Continue as student
            </Button>
            <Button size="lg" variant="secondary" className="w-full" loading={busy === 'admin'} onClick={() => go('admin')}>
              <ShieldCheck className="size-5" /> Continue as admin
            </Button>
          </div>
          <p className="mt-6 rounded-control bg-brand-50 px-3 py-2.5 text-sm text-brand-900">
            Real sign-in with Google or email arrives with the backend. Each account will only see what its role allows.
          </p>
        </div>
      </div>
    </div>
  )
}

/** Decorative 0–720 ruler echoing the Home screen's score track. */
function ScoreRuler() {
  const ticks = Array.from({ length: 37 }, (_, i) => i * 20)
  return (
    <div className="mt-12" aria-hidden>
      <div className="flex items-end justify-between">
        {ticks.map((t) => (
          <span key={t} className="w-px bg-white/40" style={{ height: t % 100 === 0 ? 22 : t % 60 === 0 ? 14 : 8 }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-white/60 tabular">
        <span>0</span>
        <span>180</span>
        <span>360</span>
        <span>540</span>
        <span>720</span>
      </div>
    </div>
  )
}
