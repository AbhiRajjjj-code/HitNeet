/**
 * App-wide state: who is signed in + the settings (exam date, marking scheme).
 * Everything else is loaded per-screen through the api.
 */
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Settings } from '../domain/types'
import { api, type Session, type SignUpInput, type SignUpResult } from '../services'

interface AppState {
  ready: boolean
  session: Session | null
  settings: Settings | null
  signInWithPassword: (email: string, password: string) => Promise<Session>
  signInWithGoogle: () => Promise<Session>
  /** Resolves with `session: null` when the email must be confirmed first. */
  signUp: (input: SignUpInput) => Promise<SignUpResult>
  /** Re-reads the session, e.g. after following a password-reset link. */
  refreshSession: () => Promise<Session | null>
  signOut: () => Promise<void>
  setSettings: (s: Settings) => void
}

const Ctx = createContext<AppState | null>(null)

/** Where each role lands after signing in. */
export const homeFor = (s: Session) => (s.role === 'admin' ? '/admin' : '/app')

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([api.getSession(), api.getSettings()])
      .then(([s, st]) => {
        if (!alive) return
        setSession(s)
        setSettings(st)
      })
      .finally(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])

  // Every sign-in path ends the same way: remember the session, refresh settings.
  const begin = useCallback(async (p: Promise<Session>) => {
    const s = await p
    setSession(s)
    setSettings(await api.getSettings())
    return s
  }, [])

  const signInWithPassword = useCallback((email: string, password: string) => begin(api.signInWithPassword(email, password)), [begin])
  const signInWithGoogle = useCallback(() => begin(api.signInWithGoogle()), [begin])
  const signUp = useCallback(
    async (input: SignUpInput) => {
      const r = await api.signUp(input)
      if (r.session) await begin(Promise.resolve(r.session))
      return r
    },
    [begin],
  )
  const refreshSession = useCallback(async () => {
    const s = await api.getSession()
    setSession(s)
    return s
  }, [])

  const signOut = useCallback(async () => {
    await api.signOut()
    setSession(null)
  }, [])

  return (
    <Ctx value={{ ready, session, settings, signInWithPassword, signInWithGoogle, signUp, refreshSession, signOut, setSettings }}>{children}</Ctx>
  )
}

export function useApp() {
  const v = use(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}

/** For screens that only render once signed in + settings loaded. */
export function useSignedIn() {
  const { session, settings, ...rest } = useApp()
  if (!session || !settings) throw new Error('useSignedIn used outside a protected route')
  return { session, settings, ...rest }
}
