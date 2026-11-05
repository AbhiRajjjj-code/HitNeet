/**
 * Sign in, sign up and forgot-password pages.
 *
 * Layout: brand panel with artwork on the left (desktop only), form on the right.
 * Where you land after signing in is decided by the role the SERVER returns
 * (admin email → /admin, everyone else → /app). The form never chooses a role.
 */
import { ArrowLeft, MailCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Brand } from '../../components/domain/bits'
import { PasswordField, TextField } from '../../components/ui/form'
import { Button } from '../../components/ui/primitives'
import { homeFor, useApp } from '../../context/AppContext'
import type { Session } from '../../services'
import { api, IS_DEMO } from '../../services'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../mock/seed'
import { todayIST } from '../../domain/dates'

/** Login illustration (public/login-art.webp). If it's missing, the panel shows the tagline instead. */
const LOGIN_ART = '/login-art.webp'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* ───────────────────────── Sign in ───────────────────────── */

export function Login() {
  const { ready, session, signInWithPassword } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)
  const auth = useAuthAction()

  if (ready && session) return <Navigate to={homeFor(session)} replace />

  const errors = {
    email: !EMAIL_RE.test(email.trim()) ? 'Enter the email you signed up with.' : undefined,
    password: !password ? 'Enter your password.' : undefined,
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (errors.email || errors.password) return
    auth.run(() => signInWithPassword(email, password))
  }

  return (
    <AuthLayout>
      <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">Sign in to your account</h1>
      <p className="mt-1.5 text-ink-soft">Pick up where you left off.</p>

      <form onSubmit={submit} noValidate className="mt-7 grid gap-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={touched ? errors.email : undefined}
        />
        <div>
          <PasswordField
            label="Password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={touched ? errors.password : undefined}
          />
          <div className="mt-2 flex justify-end">
            <Link to="/forgot-password" className="text-sm font-semibold text-brand-700 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <ServerError message={auth.error} />
        <Button type="submit" size="lg" className="w-full" loading={auth.busy === 'form'}>
          Sign in
        </Button>
      </form>

      <OrDivider />
      <GoogleButton label="Continue with Google" busy={auth.busy === 'google'} onClick={auth.google} />

      <p className="mt-8 text-center text-ink-soft">
        New to HitNeet?{' '}
        <Link to="/signup" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>

      {IS_DEMO && (
        <DemoAccounts
          onPick={(which) => {
            setEmail(DEMO_ACCOUNTS[which])
            setPassword(DEMO_PASSWORD)
          }}
        />
      )}
    </AuthLayout>
  )
}

/* ───────────────────────── Sign up ───────────────────────── */

export function SignUp() {
  const { ready, session, signUp } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)
  const auth = useAuthAction()

  if (ready && session) return <Navigate to={homeFor(session)} replace />

  const errors = {
    name: !name.trim() ? 'Add your name — it’s how HitNeet greets you.' : undefined,
    email: !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : undefined,
    password: password.length < 8 ? 'Use at least 8 characters.' : undefined,
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (errors.name || errors.email || errors.password) return
    auth.run(() => signUp({ name, email, password }))
  }

  return (
    <AuthLayout>
      <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">Create your account</h1>
      <p className="mt-1.5 text-ink-soft">Track every mock test and see what to fix next.</p>

      <GoogleButton label="Sign up with Google" busy={auth.busy === 'google'} onClick={auth.google} className="mt-7" />
      <OrDivider label="or use your email" />

      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextField label="Your name" autoComplete="name" placeholder="e.g. Chhoti" value={name} onChange={(e) => setName(e.target.value)} error={touched ? errors.name : undefined} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={touched ? errors.email : undefined}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={touched ? errors.password : undefined}
        />
        <ServerError message={auth.error} />
        <Button type="submit" size="lg" className="w-full" loading={auth.busy === 'form'}>
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

/* ───────────────────────── Forgot password ───────────────────────── */

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const emailError = !EMAIL_RE.test(email.trim()) ? 'Enter the email you signed up with.' : undefined

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (emailError) return
    setBusy(true)
    setError(null)
    try {
      await api.requestPasswordReset(email.trim())
      setSentTo(email.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the link. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout back>
      {sentTo ? (
        <div role="status">
          <span className="grid size-12 place-items-center rounded-[14px] bg-good-soft text-good">
            <MailCheck className="size-6" />
          </span>
          <h1 className="mt-5 text-[28px] font-bold leading-tight">Check your inbox</h1>
          <p className="mt-2 text-ink-soft">
            If an account exists for <span className="font-semibold text-ink">{sentTo}</span>, we’ve sent a link to set a new password. It can take a minute — check
            spam too.
          </p>
          {IS_DEMO && <p className="mt-4 rounded-control bg-sky-soft px-3 py-2.5 text-sm">Demo: no email is really sent. This works once the backend is connected.</p>}
          <Link to="/login" className="mt-8 inline-block font-semibold text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">Reset your password</h1>
          <p className="mt-1.5 text-ink-soft">Enter your email and we’ll send you a link to set a new one.</p>
          <form onSubmit={submit} noValidate className="mt-7 grid gap-4">
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={touched ? emailError : undefined}
              autoFocus
            />
            <ServerError message={error} />
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              Send reset link
            </Button>
          </form>
          <p className="mt-8 text-center text-ink-soft">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-brand-700 hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}

/* ───────────────────────── Shared pieces ───────────────────────── */

/** Runs a sign-in call, tracks which button is busy, shows the server's error, then routes by role. */
function useAuthAction() {
  const { signInWithGoogle } = useApp()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<'form' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const go = async (which: 'form' | 'google', fn: () => Promise<Session>) => {
    setBusy(which)
    setError(null)
    try {
      const s = await fn()
      navigate(homeFor(s), { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
      setBusy(null)
    }
  }

  return { busy, error, run: (fn: () => Promise<Session>) => go('form', fn), google: () => go('google', signInWithGoogle) }
}

function AuthLayout({ children, back }: { children: ReactNode; back?: boolean }) {
  const [artOk, setArtOk] = useState(true)
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — desktop only */}
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-brand-900 px-10 py-12 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh">
        {artOk ? (
          <>
            {/* The picture fills the panel; violet fades top and bottom keep the logo and line readable. */}
            <img
              src={LOGIN_ART}
              alt="A student at her desk sees herself as a doctor in the mirror"
              onError={() => setArtOk(false)}
              className="absolute inset-0 size-full select-none object-cover object-[50%_35%]"
              draggable={false}
            />
            <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-brand-900/80 to-transparent" aria-hidden />
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-brand-900/95 via-brand-900/60 to-transparent" aria-hidden />
            <div className="absolute left-10 top-9">
              <Brand light />
            </div>
            <p className="absolute inset-x-10 bottom-10 font-display text-[34px] font-bold leading-[1.1] drop-shadow-sm">
              Test. Analyse. Improve. Repeat.
            </p>
          </>
        ) : (
          <div className="w-full max-w-md">
            <Brand light />
            <p className="mt-10 font-display text-[44px] font-bold leading-[1.05]">
              Test. Analyse.
              <br />
              Improve. Repeat.
            </p>
            <p className="mt-4 text-lg text-white/75">Every mock test turns into a short list of what to fix next — not just a number.</p>
            <ScoreRuler />
          </div>
        )}
      </div>

      {/* Form side */}
      <div className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          {back && (
            <Link to="/login" className="mb-6 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink" aria-label="Back to sign in">
              <ArrowLeft className="size-5" /> Sign in
            </Link>
          )}
          {children}
        </div>
        <p className="mt-10 text-center text-sm text-ink-mute">© {todayIST().slice(0, 4)} HitNeet · Test. Analyse. Improve. Repeat.</p>
      </div>
    </div>
  )
}

function ServerError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="rounded-control bg-bad-soft px-3 py-2.5 text-sm text-bad" role="alert">
      {message}
    </p>
  )
}

function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-sm text-ink-mute" role="separator">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

function GoogleButton({ label, busy, onClick, className }: { label: string; busy: boolean; onClick: () => void; className?: string }) {
  return (
    <Button type="button" variant="secondary" size="lg" className={`w-full gap-2.5 ${className ?? ''}`} loading={busy} onClick={onClick}>
      {!busy && <GoogleG />}
      {label}
    </Button>
  )
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/** Demo only: fills the form with a sample account. Never shown with the real backend. */
function DemoAccounts({ onPick }: { onPick: (which: 'student' | 'admin') => void }) {
  return (
    <div className="mt-8 rounded-[16px] border border-dashed border-line-strong bg-paper p-4 text-sm">
      <p className="font-semibold">Trying the demo?</p>
      <p className="mt-1 text-ink-soft">
        Fill in a sample account (password <span className="font-mono">{DEMO_PASSWORD}</span>). Google signs you in as the sample student.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => onPick('student')}>
          Student account
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onPick('admin')}>
          Admin account
        </Button>
      </div>
    </div>
  )
}

/** Decorative 0–720 ruler echoing the score track on the Analysis page. */
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
